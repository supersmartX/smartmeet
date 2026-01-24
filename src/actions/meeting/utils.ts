"use server";

import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import { decrypt } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { headers } from "next/headers";
import { checkApiRateLimit, checkGeneralRateLimit } from "@/lib/rate-limit";
import { ActionResult } from "@/types/meeting";
import logger from "@/lib/logger";

/**
 * Helper to get decrypted API key and mapped provider for a user
 */
export async function getAIConfiguration(user: { apiKey: string | null; preferredProvider: string | null; preferredModel?: string | null }) {
  if (!user.apiKey) return { apiKey: null, provider: "openai", rawProvider: "openai", model: "gpt-4o" };

  const rawProvider = user.preferredProvider?.toLowerCase() || "openai";
  const model = user.preferredModel || (rawProvider === "openai" ? "gpt-4o" : undefined);
  let decrypted: string;
  try {
    decrypted = decrypt(user.apiKey);
  } catch (error) {
    logger.error({ error, userId: (user as any).id }, "Failed to decrypt API key in getAIConfiguration");
    return { apiKey: null, provider: "openai", rawProvider: "openai", model: "gpt-4o" };
  }

  let apiKey = decrypted;

  try {
    const keys = JSON.parse(decrypted);
    apiKey = keys[rawProvider] || keys["openai"] || Object.values(keys)[0] as string;
  } catch {
    // Legacy single key format
  }

  const providerMap: Record<string, string> = {
    "anthropic": "claude",
    "google": "gemini",
    "openai": "openai",
    "groq": "groq",
    "openrouter": "openrouter",
    "custom": "custom"
  };

  const provider = providerMap[rawProvider] || rawProvider;

  return { apiKey, provider, rawProvider, model };
}

/**
 * Helper to check rate limit for the current user/IP
 */
export async function enforceRateLimit(type: "api" | "general" = "general") {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(',')[0] || 
             headerList.get("x-real-ip") || 
             "unknown";
  
  const session = await getServerSession(enhancedAuthOptions);
  const userId = session?.user?.id || "anonymous";
  const key = `${userId}:${ip}`;
  
  const result = type === "api" ? await checkApiRateLimit(key) : await checkGeneralRateLimit(key);
  
  if (!result.allowed) {
    throw new Error(`Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`);
  }
  
  return result;
}

export async function createSignedUploadUrl(fileName: string): Promise<ActionResult<{ signedUrl: string; path: string; token: string }>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const fileExt = fileName.split('.').pop();
    const path = `${session.user.id}/${uuidv4()}.${fileExt}`;

    if (!supabaseAdmin) throw new Error("Storage service not configured");

    const { data, error } = await supabaseAdmin
      .storage
      .from('recordings')
      .createSignedUrl(path, 3600);

    if (error) throw error;

    return { 
      success: true, 
      data: { 
        signedUrl: data.signedUrl, 
        path,
        token: uuidv4() // For verification
      } 
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create upload URL" };
  }
}

export async function triggerWorker() {
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerSecret) return;

  // Use the internal URL if possible, otherwise use the public one
  // In Next.js, we can often hit our own API route
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
  
  // Fire and forget the worker trigger
  fetch(`${baseUrl}/api/v1/worker/process`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${workerSecret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ triggeredAt: new Date().toISOString() })
  }).catch(err => logger.error({ err }, "Failed to trigger worker"));
}
