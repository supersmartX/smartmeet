
import { prisma } from "../src/lib/prisma";
import { getRedisClient } from "../src/lib/redis";
import { supabaseAdmin } from "../src/lib/supabase";
import * as dotenv from "dotenv";

dotenv.config();

async function runDiagnostics() {
  console.log("=== SmartMeet AI Pipeline Diagnostics ===\n");

  // 1. Check Environment Variables
  console.log("1. Checking Environment Variables:");
  const requiredVars = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SECRET_KEY",
    "WORKER_SECRET",
    "ENCRYPTION_SECRET"
  ];

  for (const v of requiredVars) {
    console.log(`${v}: ${process.env[v] ? "✅ Set" : "❌ MISSING"}`);
  }
  
  const redisVars = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "REDIS_URL"];
  console.log("\nRedis Variables:");
  for (const v of redisVars) {
    console.log(`${v}: ${process.env[v] ? "✅ Set" : "ℹ️ Not Set"}`);
  }
  console.log("");

  // 2. Check Database Connectivity
  try {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    console.log(`2. Database: ✅ Connected (${userCount} users found)`);
  } catch (error) {
    console.error("2. Database: ❌ Connection FAILED", error);
  }

  // 3. Check Redis Connectivity
  try {
    const redis = await getRedisClient();
    if (redis) {
      await redis.set("diag_test", "ok", { ex: 10 });
      const val = await redis.get("diag_test");
      console.log(`3. Redis: ✅ Connected (Test value: ${val})`);
    } else {
      console.log("3. Redis: ❌ NOT CONFIGURED (No client returned)");
    }
  } catch (error) {
    console.error("3. Redis: ❌ Connection FAILED", error);
  }

  // 4. Check Supabase Connectivity
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.storage.listBuckets();
      if (error) throw error;
      console.log(`4. Supabase: ✅ Connected (${data.length} buckets found)`);
      const recordings = data.find(b => b.name === 'recordings');
      console.log(`   Recordings bucket: ${recordings ? "✅ Found" : "❌ MISSING"}`);
    } else {
      console.log("4. Supabase: ❌ NOT CONFIGURED (supabaseAdmin is null)");
    }
  } catch (error) {
    console.error("4. Supabase: ❌ Connection FAILED", error);
  }

  // 5. Check AI API Connectivity
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://api.supersmartx.com:8000";
    console.log(`\n5. AI API Base: ${apiBase}`);
    const res = await fetch(`${apiBase}/health`).catch(() => null);
    if (res && res.ok) {
      console.log("   Health check: ✅ OK");
    } else {
      console.log(`   Health check: ❌ FAILED (Status: ${res?.status || "No response"})`);
    }
  } catch (error) {
    console.error("5. AI API: ❌ Connection FAILED", error);
  }

  console.log("\n=== Diagnostics Complete ===");
  process.exit(0);
}

runDiagnostics();
