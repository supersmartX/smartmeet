import { NextAuthOptions } from "next-auth";
import { authOptions } from "./auth";

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
    async signIn({ user, account, profile }) {
      try {
        // Handle OAuth account linking
        if (account?.provider && account.type === 'oauth') {
          // Check if user exists with this email
          const existingUser = await authOptions.adapter?.getUserByEmail?.(user.email!);
          
          if (existingUser && existingUser.email !== user.email) {
            return `/login?error=OAuthAccountNotLinked`;
          }
          
          console.log('✅ OAuth signin allowed');
          return true;
        }
        
        return true;
      } catch (error) {
        console.error('🚨 OAuth signIn callback error:', error);
        return `/login?error=OAuthSigninFailed`;
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
          } catch (tokenError) {
            console.error('🚨 Error setting OAuth properties on token:', tokenError);
          }
        }
        
        return token;
      } catch (error) {
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
      } catch (error) {
        console.error('🚨 OAuth session callback error:', error);
        return session;
      }
    },
  },
  
  // Enhanced error handling
  logger: {
    error: (error: any) => {
      // Log only critical errors in production
      if (process.env.NODE_ENV === 'development') {
        console.error(`NextAuth Error [${error?.code}]:`, error?.metadata);
      }
    },
    warn: (code: any) => {
      // Log warnings only in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`NextAuth Warning [${code}]`);
      }
    },
    debug: (code: any, metadata: any) => {
      // Debug logs only in development
      if (process.env.NODE_ENV === 'development') {
        console.debug(`NextAuth Debug [${code}]:`, metadata);
      }
    }
  }
};