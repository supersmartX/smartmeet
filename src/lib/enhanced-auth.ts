import { NextAuthOptions } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "@/lib/prisma";
import { maskEmail } from "@/lib/utils";
import logger from "./logger";

// Extended JWT token type for OAuth
interface ExtendedJWT {
  id?: string;
  role?: UserRole;
  oauthProvider?: string;
  oauthAccountId?: string;
  oauthProfile?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  lastRefreshed?: number;
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
          email: maskEmail(user?.email),
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
                
                // In production, we strictly block origin mismatches to prevent redirect attacks.
                // In development/preview, we allow it for testing flexibility.
                if (process.env.NODE_ENV === "production") {
                  logger.error("Blocking sign-in due to OAuth origin mismatch in production");
                  return false;
                }
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
              logger.info({ email: maskEmail(user.email) }, "Existing user found with same email but different provider. Redirecting to link required.");
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
    
    async jwt(params) {
      const { token, user, account, profile, trigger, session } = params;
      try {
        // 1. Handle base auth logic (id and role)
        if (user) {
          token.id = user.id;
          token.role = (user as { role?: UserRole }).role || "MEMBER";
        }

        // Handle explicit session updates
        if (trigger === "update" && session?.role) {
          token.role = session.role as UserRole;
        }

        // 2. Enhanced JWT handling for OAuth
        if (account?.provider && account.type === 'oauth') {
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
          } catch (e) {
            logger.error({ error: e }, "Error setting OAuth token profile");
          }
        }

        // 3. Periodically refresh user data (logic from auth.ts)
        if (token.id) {
          const now = Math.floor(Date.now() / 1000);
          const lastRefreshed = (token as ExtendedJWT).lastRefreshed || 0;
          
          if (now - lastRefreshed > 14400) {
            try {
              const dbUser = await prisma.user.findUnique({
                where: { id: token.id as string },
                select: { role: true }
              });
              
              if (dbUser) {
                token.role = dbUser.role as UserRole;
                (token as ExtendedJWT).lastRefreshed = now;
              }
            } catch (error) {
              logger.error({ error, tokenId: token.id }, "[JWT Callback] Failed to refresh user role");
            }
          }
        }
        
        return token;
      } catch (e) {
        logger.error({ error: e }, "JWT callback exception");
        return token;
      }
    },
    
    async session(params) {
      const { session, token } = params;
      try {
        // 1. Handle base session logic (id and role)
        if (token?.id && session.user) {
          session.user.id = token.id as string;
          session.user.role = token.role as UserRole;
        }

        // 2. Enhanced session handling for OAuth
        if (session && token) {
          const extendedToken = token as ExtendedJWT;
          
          if (extendedToken?.oauthProvider) {
            const userWithOAuth = session.user as {
              id?: string;
              role?: UserRole;
              name?: string | null;
              email?: string | null;
              image?: string | null;
              oauthProvider?: string;
              oauthAccountId?: string;
            };
            userWithOAuth.oauthProvider = extendedToken.oauthProvider;
            userWithOAuth.oauthAccountId = extendedToken.oauthAccountId;
            
            if (extendedToken.oauthProfile) {
              userWithOAuth.name = extendedToken.oauthProfile.name;
              userWithOAuth.email = extendedToken.oauthProfile.email;
              userWithOAuth.image = extendedToken.oauthProfile.image;
            }
          }
        }
        
        return session;
      } catch (e) {
        logger.error({ error: e }, "Session callback exception");
        return session;
      }
    },
  },
  

};
