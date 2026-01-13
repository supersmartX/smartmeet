import { NextRequest, NextResponse } from "next/server";
import { checkApiRateLimit, type RateLimitResult } from "@/lib/rate-limit";
import { headers } from "next/headers";
import logger from "@/lib/logger";

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
  try {
    const clientIp = await getClientIp();
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "unknown";
    const rateLimitKey = `${clientIp}-${userAgent}`;
    
    // Check rate limit
    const rateLimitResult = await checkApiRateLimit(rateLimitKey);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again later."
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { endpoint, method, data, apiKey } = body;
    
    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "Missing endpoint" },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }
    
    // Define allowed endpoints to prevent SSRF attacks
    const ALLOWED_ENDPOINTS = [
      '/api/AI/audio/process',
      '/api/AI/audio/transcribe',
      '/api/AI/audio/summarize',
      '/api/AI/code/generate-code',
      '/api/AI/code/test-code',
      '/api/AI/prompt/build',
      '/api/AI/plan'
    ];
    
    // Validate endpoint to prevent SSRF
    if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
      return NextResponse.json(
        { success: false, error: "Invalid endpoint" },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }
    
    // Sanitize endpoint to prevent path traversal
    const sanitizedEndpoint = endpoint.replace(/[^a-zA-Z0-9\-\/]/g, '');
    if (sanitizedEndpoint !== endpoint) {
      return NextResponse.json(
        { success: false, error: "Invalid endpoint format" },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }
    
    // Forward request to actual API
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "https://smartmeet-ai-x6qq.onrender.com";
    const apiUrl = `${baseUrl}${sanitizedEndpoint}`;
    
    const requestHeaders: Record<string, string> = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    };
    
    if (apiKey) {
      requestHeaders["Authorization"] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(apiUrl, {
      method: method || "GET",
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });
    
    const responseData = await response.json();
    
    return NextResponse.json(
      { success: true, data: responseData },
      { status: response.status, headers: createRateLimitHeaders(rateLimitResult) }
    );
    
  } catch (error) {
    logger.error({ error }, "API proxy error");
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        message: "Failed to process request"
      },
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