import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import crypto from "crypto";

export default withAuth(
  function middleware() {
    const nonce = crypto.randomBytes(16).toString("base64");

    const csp = `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://github.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self' https://accounts.google.com https://github.com https://nifnqjfgcgdyfbsjgmlw.supabase.co;
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