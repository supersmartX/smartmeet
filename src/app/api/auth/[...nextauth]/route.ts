import NextAuth from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import type { NextRequest } from "next/server";

// Create the NextAuth handler
const handler = NextAuth(enhancedAuthOptions);

// Export handlers for both GET and POST requests with proper types
export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}