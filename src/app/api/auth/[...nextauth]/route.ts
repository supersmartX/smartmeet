import NextAuth from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 OAuth GET request received:', {
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      searchParams: request.nextUrl.searchParams.toString()
    });
    
    const handler = NextAuth(enhancedAuthOptions);
    return handler(request);
  } catch (error) {
    console.error('🚨 OAuth GET error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'OAuth GET failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 OAuth POST request received:', {
      url: request.url,
      headers: Object.fromEntries(request.headers.entries())
    });
    
    const handler = NextAuth(enhancedAuthOptions);
    return handler(request);
  } catch (error) {
    console.error('🚨 OAuth POST error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'OAuth POST failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}