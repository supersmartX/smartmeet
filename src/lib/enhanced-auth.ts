import { NextAuthOptions } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "@/lib/prisma";

// Extended JWT token type for OAuth
interface ExtendedJWT {
  id?: string;
  role?: string;
  oauthProvider?: string;
  oauthAccountId?: string;
  oauthProfile?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// Extended session type for OAuth
interface ExtendedSession {
  user: {
    id?: string;
    role?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    oauthProvider?: string;
    oauthAccountId?: string;
  };
  expires: string;
}

// Enhanced auth options with better OAuth error handling
export const enhancedAuthOptions: NextAuthOptions = {
  ...authOptions,
  callbacks: {
    ...authOptions.callbacks,
    async signIn({ user, account }) {
      try {
        // Handle OAuth account linking with enhanced security
        if (account?.provider && account.type === 'oauth') {
          // Validate callback URL matches expected domain
          const expectedUrl = process.env.NEXTAUTH_URL;
          if (account.callbackUrl && typeof account.callbackUrl === 'string' && expectedUrl && !account.callbackUrl.startsWith(expectedUrl)) {
            console.warn('⚠️ OAuth callback URL mismatch - possible redirect attack');
            return false;
          }

          // Check if user exists with this email using Prisma directly
          const existingUser = user.email ? await prisma.user.findUnique({
            where: { email: user.email }
          }) : null;

          if (existingUser) {
            // Check if this OAuth account is already linked to this user
            const existingAccount = await prisma.account.findFirst({
              where: {
                userId: existingUser.id,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            });

          if (!existingAccount) {
            return false;
          }
          }

          return true;
        }
        
        return true;
      } catch {
        console.error('OAuth signin error occurred');
        return false;
      }
    },
    
    async jwt({ token, account, profile }) {
      try {
        // Enhanced JWT handling for OAuth
        if (!token) {
          return token;
        }
        
        if (account?.provider && account.type === 'oauth') {
          // Safely add OAuth provider info to token
          try {
            (token as ExtendedJWT).oauthProvider = account.provider;
            (token as ExtendedJWT).oauthAccountId = account.providerAccountId;
            
            if (profile) {
              (token as ExtendedJWT).oauthProfile = {
                name: profile.name,
                email: profile.email,
                image: profile.image,
              };
            }
          } catch {
            // Silently handle token errors
          }
        }
        
        return token;
      } catch {
        return token;
      }
    },
    
    async session({ session, token }) {
      try {
        // Enhanced session handling for OAuth
        if (!session || !token) {
          return session;
        }
        
        const extendedToken = token as ExtendedJWT;
        
        // Safely check for OAuth properties
        if (extendedToken?.oauthProvider) {
          const extendedSession = session as ExtendedSession;
          extendedSession.user.oauthProvider = extendedToken.oauthProvider;
          extendedSession.user.oauthAccountId = extendedToken.oauthAccountId;
          
          if (extendedToken.oauthProfile) {
            extendedSession.user.name = extendedToken.oauthProfile.name;
            extendedSession.user.email = extendedToken.oauthProfile.email;
            extendedSession.user.image = extendedToken.oauthProfile.image;
          }
        }
        
        return session;
      } catch {
        return session;
      }
    },
  },
  

};
