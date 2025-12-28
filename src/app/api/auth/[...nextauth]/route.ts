import NextAuth from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";

// Create the NextAuth handler
const handler = NextAuth(enhancedAuthOptions);

// Export handlers for both GET and POST requests
export { handler as GET, handler as POST };
