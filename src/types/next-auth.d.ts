import { DefaultSession, DefaultJWT } from "next-auth";

declare global {
  type UserRole = "ADMIN" | "MEMBER" | "VIEWER";
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
  }
}
