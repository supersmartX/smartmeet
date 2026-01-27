import { z } from "zod";
import logger from "./logger";

const isServer = typeof window === 'undefined';

const envSchema = z.object({
  DATABASE_URL: isServer ? z.string().min(1, "DATABASE_URL is required") : z.string().optional(),
  DIRECT_URL: isServer ? z.string().optional() : z.string().optional(),
  NEXTAUTH_SECRET: isServer ? z.string().min(1, "NEXTAUTH_SECRET is required") : z.string().optional(),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://api.supersmartx.com:8000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  
  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().min(1, "Supabase URL is required"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase Anon Key is required").refine(
    (val) => val !== "your-supabase-anon-key",
    { message: "Please replace 'your-supabase-anon-key' with your actual Supabase Anon Key in .env" }
  ),
  SUPABASE_SECRET_KEY: isServer ? z.string().optional() : z.string().optional(),
  
  // Stripe
  STRIPE_SECRET_KEY: isServer ? z.string().optional() : z.string().optional(),
  STRIPE_WEBHOOK_SECRET: isServer ? z.string().optional() : z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  
  // Security
  ENCRYPTION_SECRET: z.string().optional(),
});

const isBuildTime = process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build';

const _env = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GITHUB_ID: process.env.GITHUB_ID,
  GITHUB_SECRET: process.env.GITHUB_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET,
});

if (!_env.success) {
  if (isBuildTime) {
    console.warn("⚠️ [Build Time] Invalid environment variables detected. Skipping strict validation for build phase.");
    logger.warn({ errors: _env.error.format() }, "Invalid environment variables during build");
  } else {
    logger.error({ errors: _env.error.format() }, "Invalid environment variables");
    throw new Error(`Invalid environment variables: ${JSON.stringify(_env.error.format())}`);
  }
}

export const env = _env.success ? _env.data : ({} as z.infer<typeof envSchema>);
