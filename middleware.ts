import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    // Generate a secure random nonce using Edge-compatible Web Crypto API
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));

    const csp = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'nonce-${nonce}' https://accounts.google.com https://github.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self' https://accounts.google.com https://github.com https://nifnqjfgcgdyfbsjgmlw.supabase.co https://*.ngrok-free.app https://*.ngrok-free.dev;
      frame-src 'self' https://accounts.google.com https://github.com;
      media-src 'self' https://nifnqjfgcgdyfbsjgmlw.supabase.co;
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