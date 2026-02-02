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
export async function getAIConfiguration(user: { id?: string; apiKey: string | null; preferredProvider: string | null; preferredModel?: string | null }) {
  if (!user.apiKey) return { apiKey: null, provider: "openai", rawProvider: "openai", model: "gpt-4o" };

  const preferredProvider = user.preferredProvider?.toLowerCase() || "openai";
  let rawProvider = preferredProvider;
  const preferredModel = user.preferredModel || (rawProvider === "openai" ? "gpt-4o" : undefined);
  let model = preferredModel;

  let decrypted: string;
  try {
    decrypted = decrypt(user.apiKey);
  } catch (error) {
    logger.error({ error, userId: user.id, apiKeyPreview: user.apiKey?.substring(0, 10) + "..." }, "Failed to decrypt API key in getAIConfiguration");
    throw new Error("Your AI configuration is invalid (decryption failed). Please re-enter your API keys in Settings.");
  }

  let apiKey = decrypted;

  try {
    const keys = JSON.parse(decrypted);
    
    // Logic to ensure API key matches the provider
    if (keys[rawProvider]) {
      apiKey = keys[rawProvider];
    } else if (keys["openai"]) {
      // Fallback to OpenAI if preferred provider key is missing
      apiKey = keys["openai"];
      rawProvider = "openai";
      model = "gpt-4o"; // Reset model for OpenAI
    } else {
      // Fallback to the first available key
      const firstProvider = Object.keys(keys)[0];
      if (firstProvider) {
        apiKey = keys[firstProvider];
        rawProvider = firstProvider;
        model = undefined; // Let default logic handle model
      } else {
         // No keys found in the JSON object
         logger.warn({ userId: user.id }, "No API keys found in decrypted configuration");
         throw new Error("No API keys found. Please add an API key in Settings.");
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("No API keys found")) {
        throw error;
    }
    // Legacy single key format - assume it matches the preferred provider or default
    // If it's a legacy key, we can't really know which provider it is for sure, 
    // but usually it was OpenAI. 
    // We'll leave rawProvider as is, assuming the user knows what they are doing.
  }

  const providerMap: Record<string, string> = {
    "anthropic": "claude",
    "google": "gemini",
    "openai": "openai",
    "groq": "groq",
    "custom": "custom"
  };

  const provider = providerMap[rawProvider] || "openai";

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

    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'recordings';
    const { data, error } = await supabaseAdmin
      .storage
      .from(bucketName)
      .createSignedUploadUrl(path, { upsert: true });

    if (error) {
      logger.error({ error, bucket: bucketName, path }, "Supabase storage upload URL error");
      throw new Error(`Storage error: ${error.message}. Please ensure the '${bucketName}' bucket exists in Supabase.`);
    }

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

/**
 * Creates a signed URL for downloading/playing a file
 */
export async function createSignedDownloadUrl(path: string, expiresIn: number = 3600): Promise<ActionResult<string>> {
  try {
    if (!supabaseAdmin) throw new Error("Storage service not configured");

    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'recordings';
    const { data, error } = await supabaseAdmin
      .storage
      .from(bucketName)
      .createSignedUrl(path, expiresIn);

    if (error) {
      logger.error({ error, bucket: bucketName, path }, "Supabase storage download URL error");
      throw new Error(`Storage error: ${error.message}. Please ensure the '${bucketName}' bucket exists.`);
    }

    return { success: true, data: data.signedUrl };
  } catch (error: unknown) {
    logger.error({ error, path }, "Failed to create signed download URL");
    return { success: false, error: error instanceof Error ? error.message : "Failed to create download URL" };
  }
}

export async function triggerWorker(meetingId: string): Promise<ActionResult> {
  const { env } = await import("@/lib/env");
  const workerSecret = env.WORKER_SECRET;
  
  if (!workerSecret) {
    logger.warn("WORKER_SECRET not configured. Background worker will not be triggered.");
    return { success: false, error: "Worker secret not configured" };
  }

  try {
    // Determine the base URL:
    // 1. Try env.APP_URL (which we just added)
    // 2. Fallback to detection from headers if available
    let baseUrl = env.APP_URL;
    
    try {
      const headerList = await headers();
      const host = headerList.get("host");
      const protocol = headerList.get("x-forwarded-proto") || "http";
      if (host && !baseUrl.includes(host)) {
        baseUrl = `${protocol}://${host}`;
      }
    } catch {
      // Headers might not be available in all contexts (e.g. some background jobs)
    }

    logger.info({ meetingId, baseUrl }, "Triggering background worker");
    
    // Fire and forget the worker trigger
    fetch(`${baseUrl}/api/v1/worker/process`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${workerSecret}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ triggeredAt: new Date().toISOString() })
    }).catch(err => logger.error({ err, meetingId }, "Failed to trigger worker fetch"));

    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, meetingId }, "Failed to trigger worker");
    return { success: false, error: error instanceof Error ? error.message : "Failed to trigger worker" };
  }
}
