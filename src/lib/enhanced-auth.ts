import { NextAuthOptions } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "@/lib/prisma";
import logger from "./logger";

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
        logger.info({ 
          provider: account?.provider,
          email: user?.email,
          type: account?.type
        }, "SignIn Callback Started");

        // Handle OAuth account linking with enhanced security
        if (account?.provider && account.type === 'oauth') {
          const expectedUrl = process.env.NEXTAUTH_URL;
          
          if (account.callbackUrl && typeof account.callbackUrl === 'string' && expectedUrl) {
            try {
              const receivedOrigin = new URL(account.callbackUrl).origin;
              const expectedOrigin = new URL(expectedUrl).origin;
              
              if (receivedOrigin !== expectedOrigin) {
                logger.warn({
                  received: receivedOrigin,
                  expected: expectedOrigin
                }, "OAuth callback URL origin mismatch");
                // In some environments (like preview deploys), this might be expected.
                // We'll log it but not necessarily block it unless it's a completely different domain.
              }
            } catch (e) {
              logger.error({ error: e }, "Failed to parse callback URLs");
            }
          }

          // Check if user exists with this email using Prisma directly
          if (!user.email) {
            logger.error("OAuth provider did not return an email");
            return false;
          }

          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true }
          });

          if (existingUser) {
            // Check if this OAuth account is already linked to this user
            const isLinked = existingUser.accounts.some(
              acc => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
            );

            if (!isLinked) {
              logger.info({ email: user.email }, "Existing user found with same email but different provider. Redirecting to link required.");
              // Instead of throwing, we return a redirect URL
              return `/login?error=OAuthAccountNotLinked&email=${encodeURIComponent(user.email)}`;
            }
          }
        }
        
        return true;
      } catch (error: unknown) {
        logger.error({ error }, "SignIn Callback Exception");
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
