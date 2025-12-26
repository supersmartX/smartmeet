import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { NextAuthOptions, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import { Adapter } from "next-auth/adapters";

console.log("NEXTAUTH_URL from process.env:", process.env.NEXTAUTH_URL);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                redirect_uri: (() => {
                  const uri = `${process.env.NEXTAUTH_URL}/api/auth/callback/google`;
                  console.log("Google redirect_uri:", uri);
                  return uri;
                })(),
              },
            },
          }),
        ]
      : []
    ),
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
            authorization: {
              params: {
                redirect_uri: (() => {
                  const uri = `${process.env.NEXTAUTH_URL}/api/auth/callback/github`;
                  console.log("GitHub redirect_uri:", uri);
                  return uri;
                })(),
              },
            },
          }),
        ]
      : []
    ),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.password) {
            throw new Error("No user found with this email");
          }

          const isCorrectPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isCorrectPassword) {
            throw new Error("Incorrect password");
          }

          if (!user.emailVerified) {
            throw new Error("Email not verified. Please check your inbox for a verification link.");
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
    error: "/login", // Redirect back to login on error
  },
  debug: false, // Enable debug for better logs
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });
        if (dbUser) {
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token?.sub && session.user) {
        // Extend the session user object with the user ID and role
        const extendedUser = {
          ...session.user,
          id: token.sub,
          role: token.role,
        };
        session.user = extendedUser;
      }
      return session;
    },
    async redirect({ baseUrl }) {
      console.log("baseUrl in redirect callback:", baseUrl);
      // Always redirect to the dashboard after login
      return baseUrl + '/dashboard';
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
