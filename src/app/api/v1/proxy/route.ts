import { NextRequest, NextResponse } from "next/server";
import { checkApiRateLimit, type RateLimitResult } from "@/lib/rate-limit";
import { headers } from "next/headers";
import logger from "@/lib/logger";
import { createSuccessResponse, createErrorResponse, ApiErrorCode, createValidationErrorResponse } from "@/lib/api-response";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import { DataGovernance } from "@/lib/data-governance";

const proxyRequestSchema = z.object({
  endpoint: z.string().min(1, "Endpoint is required"),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]),
  data: z.unknown().optional(),
  apiKey: z.string().optional(),
});

/**
 * Get client IP address from request headers
 */
async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  
  return forwardedFor?.split(',')[0] || realIp || "unknown";
}

/**
 * Create rate limit headers for response
 */
function createRateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": result.limit?.toString() || "10",
    "X-RateLimit-Remaining": result.remaining?.toString() || "0",
    "X-RateLimit-Reset": result.reset?.toString() || "0",
  };
}

/**
 * Rate limited API proxy handler
 */
export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname;
  try {
    const clientIp = await getClientIp();
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "unknown";
    const rateLimitKey = `${clientIp}-${userAgent}`;
    
    // 1. Check rate limit
    const rateLimitResult = await checkApiRateLimit(rateLimitKey);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createErrorResponse(
          ApiErrorCode.RATE_LIMIT_EXCEEDED,
          "Too many requests. Please try again later.",
          null,
          "v1",
          path
        ),
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // 2. Check Authentication
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        createErrorResponse(ApiErrorCode.UNAUTHORIZED, "Unauthorized", null, "v1", path),
        { status: 401, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // 3. Check Entitlement (AI Feature)
    try {
      await DataGovernance.checkEntitlement(session.user.id, "ai_processing");
    } catch (error) {
      return NextResponse.json(
        createErrorResponse(ApiErrorCode.QUOTA_EXCEEDED, error instanceof Error ? error.message : "Quota exceeded", null, "v1", path),
        { status: 403, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }
    
    // 4. Parse and validate request body
    let body: unknown;
    const contentType = headersList.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const data: Record<string, string | File> = {};
      
      // Reconstruct the data object from nested keys
      for (const [key, value] of formData.entries()) {
        if (key.startsWith("data[")) {
          const actualKey = key.slice(5, -1);
          data[actualKey] = value as string | File;
        }
      }

      body = {
        endpoint: formData.get("endpoint"),
        method: formData.get("method"),
        apiKey: formData.get("apiKey"),
        data: Object.keys(data).length > 0 ? data : undefined
      };
    } else {
      body = await request.json();
    }

    const validation = proxyRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        createValidationErrorResponse(validation.error.format(), "v1", path),
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const { endpoint, method, data, apiKey } = validation.data;
    
    // Define allowed endpoints to prevent SSRF attacks
    const ALLOWED_ENDPOINTS = [
      '/api/AI/audio/process',
      '/api/AI/audio/transcribe',
      '/api/AI/document/transcribe',
      '/api/AI/audio/summarize',
      '/api/AI/code/generate-code',
      '/api/AI/code/test-code',
      '/api/AI/prompt/build',
      '/api/AI/plan'
    ];
    
    // Validate endpoint to prevent SSRF
    if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
      return NextResponse.json(
        createErrorResponse(ApiErrorCode.BAD_REQUEST, "Invalid endpoint", null, "v1", path),
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }
    
    // Sanitize endpoint to prevent path traversal
    const sanitizedEndpoint = endpoint.replace(/[^a-zA-Z0-9\-\/]/g, '');
    if (sanitizedEndpoint !== endpoint) {
      return NextResponse.json(
        createErrorResponse(ApiErrorCode.BAD_REQUEST, "Invalid endpoint format", null, "v1", path),
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }
    
    // Forward request to actual API
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://api.supersmartx.com:8000";
    const apiUrl = `${baseUrl}${sanitizedEndpoint}`;
    
    const requestHeaders: Record<string, string> = {
      "Accept": "application/json",
      "ngrok-skip-browser-warning": "true",
    };

    let requestBody: string | FormData | undefined;
    
    // Check if we need to forward as FormData (e.g., for audio files)
    const isAudioEndpoint = sanitizedEndpoint.includes('/audio/') || sanitizedEndpoint.includes('/document/');
    
    if (isAudioEndpoint && data) {
      // Create new FormData for the backend API
      const backendFormData = new FormData();
      for (const [key, value] of Object.entries(data as Record<string, string | Blob>)) {
        backendFormData.append(key, value);
      }
      requestBody = backendFormData;
      // Fetch will automatically set the correct multipart/form-data header with boundary
    } else {
      requestHeaders["Content-Type"] = "application/json";
      requestBody = data ? JSON.stringify(data) : undefined;
    }
    
    if (apiKey) {
      requestHeaders["Authorization"] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(apiUrl, {
      method: method || "GET",
      headers: requestHeaders,
      body: requestBody,
    });
    
    const responseData = await response.json();
    
    // Return standardized success response
    return NextResponse.json(
      createSuccessResponse(responseData, "v1", path),
      { status: response.status, headers: createRateLimitHeaders(rateLimitResult) }
    );
    
  } catch (error: unknown) {
    logger.error({ error: error instanceof Error ? error.message : error }, "API proxy error");
    
    return NextResponse.json(
      createErrorResponse(
        ApiErrorCode.INTERNAL_ERROR,
        "Failed to process request",
        null,
        "v1",
        path
      ),
      { status: 500 }
    );
  }
}

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS() {
  const headersList = await headers();
  const origin = headersList.get("origin") || "";
  
  // Define allowed origins - update with your actual domains
  const ALLOWED_ORIGINS = [
    'https://supersmartx.com',
    'https://www.supersmartx.com',
    'http://localhost:3000' // for development
  ];
  
  // Check if origin is allowed
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || 
                   origin.endsWith('.supersmartx.com');
  
  return NextResponse.json({}, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": isAllowed ? origin : 'null',
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Vary": "Origin",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    }
  });
}