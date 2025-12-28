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
      console.log('🔍 OAuth signIn callback:', {
        user: user?.email || user?.id,
        account: account?.provider,
        accountType: account?.type,
        profile: profile?.email || 'no email'
      });
      
      try {
        // Handle OAuth account linking
        if (account?.provider && account.type === 'oauth') {
          console.log(`✅ Processing ${account.provider} OAuth signin`);
          
          // Check if user exists with this email
          const existingUser = await authOptions.adapter?.getUserByEmail?.(user.email!);
          
          if (existingUser && existingUser.email !== user.email) {
            console.log('❌ Email already exists with different provider');
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
        if (account?.provider && account.type === 'oauth') {
          console.log(`🔍 Processing ${account.provider} OAuth JWT`);
          
          // Add OAuth provider info to token
          (token as ExtendedJWT).oauthProvider = account.provider;
          (token as ExtendedJWT).oauthAccountId = account.providerAccountId;
          
          if (profile) {
            (token as ExtendedJWT).oauthProfile = {
              name: profile.name,
              email: profile.email,
              image: profile.image,
            };
          }
        }
        
        return token;
      } catch (error) {
        console.error('🚨 OAuth JWT callback error:', error);
        return token;
      }
    },
    
    async session({ session, token }) {
      try {
        // Enhanced session handling for OAuth
        const extendedToken = token as ExtendedJWT;
        if (extendedToken.oauthProvider) {
          console.log(`✅ Adding OAuth info to session: ${extendedToken.oauthProvider}`);
          
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
    error: (code, metadata) => {
      console.error(`🚨 NextAuth Error [${code}]:`, metadata);
    },
    warn: (code) => {
      console.warn(`⚠️ NextAuth Warning [${code}]`);
    },
    debug: (code, metadata) => {
      console.debug(`🔍 NextAuth Debug [${code}]:`, metadata);
    }
  }
};