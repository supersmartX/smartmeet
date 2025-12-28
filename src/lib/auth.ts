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
      allowDangerousEmailAccountLinking: true,
    })] : []),
    ...(githubId && githubSecret ? [GitHubProvider({
      clientId: githubId,
      clientSecret: githubSecret,
      allowDangerousEmailAccountLinking: true,
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

        const headerList = await headers();
        const ipAddress = headerList.get("x-forwarded-for")?.split(',')[0] ||
                         headerList.get("x-real-ip");
        const userAgent = headerList.get("user-agent");

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.password) {
            throw new Error("No user found with this email");
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

          return user;
        } catch (error) {
          console.error("Auth authorize error:", error);
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === "development",
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
          token.role = (dbUser as { role: string }).role;
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token?.sub && session.user) {
        const extendedUser = {
          ...session.user,
          id: token.sub,
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
