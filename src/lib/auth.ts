import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import { NextAuthOptions, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import { Adapter } from "next-auth/adapters";
import { headers } from "next/headers";
import { checkLoginRateLimitWithIP, resetRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';
import logger from "@/lib/logger";

const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const githubId = process.env.GITHUB_ID?.trim();
const githubSecret = process.env.GITHUB_SECRET?.trim();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    ...(googleId && googleSecret ? [GoogleProvider({
      clientId: googleId,
      clientSecret: googleSecret,
    })] : []),
    ...(githubId && githubSecret ? [GitHubProvider({
      clientId: githubId,
      clientSecret: githubSecret,
    })] : []),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      // Custom send function to use Resend instead of SMTP if configured
      async sendVerificationRequest({ identifier: email, url, provider }) {
        if (process.env.RESEND_API_KEY) {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          try {
            await resend.emails.send({
              from: provider.from || "onboarding@resend.dev",
              to: email,
              subject: "Sign in to Supersmart",
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Sign in to Supersmart</h2>
                  <p>Click the button below to sign in to your account. This link will expire in 24 hours.</p>
                  <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0;">Sign In</a>
                  <p>If you didn't request this, you can safely ignore this email.</p>
                </div>
              `
            });
          } catch (error) {
            logger.error({ error, email }, "Error sending magic link email");
            throw new Error("SEND_VERIFICATION_EMAIL_ERROR");
          }
        } else {
          // Fallback to default SMTP if Resend is not configured
          // but we still need some config for the default provider
          logger.info({ email, url }, "[DEV MODE] Magic link generated");
        }
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaToken: { label: "MFA Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Validate email format
        const emailSchema = z.string().email();
        emailSchema.parse(credentials.email);

        const headerList = await headers();
        const ipAddress = headerList.get("x-forwarded-for")?.split(',')[0] ||
                         headerList.get("x-real-ip") || undefined;

        try {
          // Check rate limiting before user lookup (with IP tracking)
        const rateLimitResult = await checkLoginRateLimitWithIP(credentials.email, ipAddress);
          if (!rateLimitResult.allowed) {
            throw new Error("Too many login attempts. Please try again later.");
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.password) {
            // Perform dummy bcrypt comparison to prevent timing attacks
            if (credentials.password) {
              await bcrypt.compare(credentials.password, '$2a$10$dummy.hash.to.prevent.timing.attacks');
            }
            throw new Error("Invalid credentials");
          }

          if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new Error("Account is temporarily locked. Please try again later.");
          }

          const isCorrectPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isCorrectPassword) {
            const failedAttempts = (user.failedLoginAttempts || 0) + 1;
            const updateData: {
              failedLoginAttempts: number;
              lockedUntil?: Date;
            } = { failedLoginAttempts: failedAttempts };

            if (failedAttempts >= 5) {
              updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
            }

            await prisma.user.update({
              where: { id: user.id },
              data: updateData,
            });

            throw new Error(`Incorrect password. ${5 - failedAttempts} attempts remaining.`);
          }

          if (user.mfaEnabled) {
            if (!credentials.mfaToken) {
              throw new Error("MFA_REQUIRED");
            }

            const verified = speakeasy.totp.verify({
              secret: user.mfaSecret || "",
              encoding: "base32",
              token: credentials.mfaToken,
            });

            if (!verified) {
              throw new Error("Invalid verification code.");
            }
          }

          if (user.failedLoginAttempts > 0 || user.lockedUntil) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
              },
            });
          }

          if (!user.emailVerified) {
            throw new Error("Email not verified.");
          }

          // Reset rate limit on successful login
          await resetRateLimit(credentials.email, 'login');

          return user;
        } catch (error) {
          // Log errors only in development
          if (process.env.NODE_ENV === 'development') {
            logger.error({ error }, "Auth authorize error");
          }
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: false,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  // @ts-expect-error - trustHost is not a standard NextAuth option but is required for production deployment
  trustHost: true,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      try {
        // Initial sign in
        if (user) {
          token.id = user.id;
          token.role = (user as { role?: UserRole }).role || "MEMBER";
        }

        // Handle explicit session updates (e.g. from client-side update())
        if (trigger === "update" && session?.role) {
          token.role = session.role;
        }

        // Periodically refresh user data from DB to catch role changes
        // or other critical updates without requiring re-login
        if (token.id) {
          const now = Math.floor(Date.now() / 1000);
          const lastRefreshed = (token as { lastRefreshed?: number }).lastRefreshed || 0;
          
          // Refresh every 1 hour (3600 seconds)
          if (now - lastRefreshed > 3600) {
            try {
              const dbUser = await prisma.user.findUnique({
                where: { id: token.id as string },
                select: { role: true }
              });
              
              if (dbUser) {
                token.role = dbUser.role as UserRole;
                (token as { lastRefreshed?: number }).lastRefreshed = now;
              }
            } catch (error) {
              logger.error({ error, tokenId: token.id }, "[JWT Callback] Failed to refresh user role");
            }
          }
        }

        return token;
      } catch (error) {
        logger.error({ error }, "[JWT Callback] Critical failure");
        return token; // Return whatever we have rather than failing completely
      }
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      try {
        if (token?.id && session.user) {
          const extendedUser = {
            ...session.user,
            id: token.id,
            role: token.role,
          };
          session.user = extendedUser;
        }
        return session;
      } catch (error) {
        logger.error({ error }, "[Session Callback] failure");
        return session;
      }
    },
    async redirect({ url, baseUrl }) {
      try {
        // Allows relative callback URLs
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        // Allows callback URLs on the same origin
        else if (new URL(url).origin === baseUrl) return url;
        return `${baseUrl}/dashboard`;
      } catch (error) {
        logger.warn({ error, url }, "[Redirect Callback] fallback used");
        return `${baseUrl}/dashboard`;
      }
    },
  },
};
