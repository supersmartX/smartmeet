import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import logger from "@/lib/logger";
import { checkApiRateLimit, checkGeneralRateLimit } from "@/lib/rate-limit";

// Rate limiting at the edge
async function handleRateLimit(req: NextRequest) {
  const url = req.nextUrl.pathname;
  
  // Only rate limit API routes and specific entry points
  if (!url.startsWith("/api") && !url.startsWith("/login")) {
    return null;
  }

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || 
               req.headers.get("x-real-ip") || 
               "127.0.0.1";
    
    const type = url.startsWith("/api") ? "api" : "general";
    const result = type === "api" ? await checkApiRateLimit(ip) : await checkGeneralRateLimit(ip);

    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({ 
          error: "Too many requests", 
          retryAfter: result.retryAfter 
        }),
        { 
          status: 429, 
          headers: { 
            "Content-Type": "application/json",
            "Retry-After": result.retryAfter?.toString() || "60"
          } 
        }
      );
    }
  } catch (error) {
    // Fail open if rate limiter is down to ensure availability
    logger.error({ error }, "Middleware rate limit error");
  }
  
  return null;
}

export default withAuth(
  async function middleware(req: NextRequest) {
    // 1. Handle CORS Preflight (OPTIONS)
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 2. Check Rate Limit first (at the edge)
    const rateLimitResponse = await handleRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    // 3. Security Headers (CSP)
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));

    const csp = `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://github.com https://*.google.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com;
      img-src 'self' data: blob: https:;
      font-src 'self' data: https://fonts.gstatic.com;
      connect-src 'self' https://accounts.google.com https://github.com https://nifnqjfgcgdyfbsjgmlw.supabase.co wss://nifnqjfgcgdyfbsjgmlw.supabase.co https://*.ngrok-free.app https://*.ngrok-free.dev https://*.supabase.co wss://*.supabase.co https://*.supabase.in http://api.supersmartx.com:8000;
      frame-src 'self' https://accounts.google.com https://github.com;
      media-src 'self' blob: https://nifnqjfgcgdyfbsjgmlw.supabase.co https://*.supabase.co;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
    `.replace(/\n/g, '').replace(/\s{2,}/g, ' ').trim();

    const response = NextResponse.next();
    
    // Add CORS headers to all responses
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version");

    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("x-nonce", nonce);

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow OPTIONS requests (CORS preflight)
        if (req.method === "OPTIONS") {
          return true;
        }
        
        // Public routes that don't require authentication
        const publicRoutes = [
          "/",
          "/login",
          "/forgot-password",
          "/reset-password",
          "/api/auth",
          "/api/v1/webhooks/stripe",
          "/api/v1/health",
          "/api/v1/worker/process",
        ];

        // Allow access to public routes or if there is a valid token
        if (publicRoutes.some(route => pathname === route || pathname.startsWith("/api/auth"))) {
          return true;
        }

        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - api/auth (NextAuth routes)
     * - favicon.ico, logoX.png, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|logoX.png|android-chrome|apple-touch-icon|site.webmanifest).*)",
  ],
};