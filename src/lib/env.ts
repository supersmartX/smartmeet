import { z } from "zod";

const isServer = typeof window === 'undefined';

const envSchema = z.object({
  DATABASE_URL: isServer ? z.string().min(1, "DATABASE_URL is required") : z.string().optional(),
  NEXTAUTH_SECRET: isServer ? z.string().min(1, "NEXTAUTH_SECRET is required") : z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("https://api.supersmartx.ai"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const _env = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NODE_ENV: process.env.NODE_ENV,
});

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
