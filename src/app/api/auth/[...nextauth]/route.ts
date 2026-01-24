import NextAuth from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";

const handler = NextAuth(enhancedAuthOptions);

export { handler as GET, handler as POST };
