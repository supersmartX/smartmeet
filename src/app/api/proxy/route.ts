import { NextRequest, NextResponse } from "next/server";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

/**
 * Get client IP address from request headers
 */
async function getClientIp(request: NextRequest): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  
  return forwardedFor?.split(',')[0] || realIp || "unknown";
}

/**
 * Create rate limit headers for response
 */
function createRateLimitHeaders(result: any) {
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
    const clientIp = await getClientIp(request);
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
    
    // Forward request to actual API
    const apiUrl = `${process.env.API_BASE_URL || "https://api.example.com"}${endpoint}`;
    
    const requestHeaders: Record<string, string> = {
      "Accept": "application/json",
      "Content-Type": "application/json",
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
    console.error("API proxy error:", error);
    
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
  return NextResponse.json({}, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
  });
}