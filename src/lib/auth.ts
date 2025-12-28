import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import { NextAuthOptions, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import { Adapter } from "next-auth/adapters";
import { headers } from "next/headers";
import { checkLoginRateLimitWithIP, resetRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

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
            console.error("Auth authorize error:", error);
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
  debug: process.env.NODE_ENV === "development" || process.env.NEXTAUTH_DEBUG === "true",
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });
        if (dbUser && (dbUser as { role?: string }).role) {
          token.role = (dbUser as { role: string }).role as UserRole;
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token?.id && session.user) {
        const extendedUser = {
          ...session.user,
          id: token.id,
          role: token.role,
        };
        session.user = extendedUser;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },
};
