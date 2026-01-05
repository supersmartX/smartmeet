import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    // Generate a secure random nonce using Edge-compatible Web Crypto API
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
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};