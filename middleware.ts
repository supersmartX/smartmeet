import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import logger from "@/lib/logger";

// Rate limiting at the edge
async function handleRateLimit(req: NextRequest) {
  const url = req.nextUrl.pathname;
  
  // Only rate limit API routes and specific entry points
  if (!url.startsWith("/api") && !url.startsWith("/login")) {
    return null;
  }

  try {
    const { checkApiRateLimit, checkGeneralRateLimit } = await import("@/lib/rate-limit");
    
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
    // 1. Check Rate Limit first (at the edge)
    const rateLimitResponse = await handleRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    // 2. Security Headers (CSP)
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));

    const csp = `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://github.com https://*.google.com;
      style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com;
      img-src 'self' data: blob: https:;
      font-src 'self' data: https://fonts.gstatic.com;
      connect-src 'self' https://accounts.google.com https://github.com https://nifnqjfgcgdyfbsjgmlw.supabase.co https://*.ngrok-free.app https://*.ngrok-free.dev https://*.supabase.co https://*.supabase.in;
      frame-src 'self' https://accounts.google.com https://github.com;
      media-src 'self' blob: https://nifnqjfgcgdyfbsjgmlw.supabase.co https://*.supabase.co;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
    `.replace(/\n/g, '').replace(/\s{2,}/g, ' ').trim();

    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("x-nonce", nonce);

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Public routes that don't require authentication
        const publicRoutes = [
          "/",
          "/login",
          "/forgot-password",
          "/reset-password",
          "/api/auth",
          "/api/v1/webhooks/stripe",
          "/api/v1/health",
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