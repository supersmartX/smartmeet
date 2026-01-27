
import { Redis } from "@upstash/redis";
import * as dotenv from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "../src/lib/crypto";

// Load .env from project root
dotenv.config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient();
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error("Missing Redis credentials in .env");
  process.exit(1);
}

const redis = new Redis({ url, token });
const QUEUE_NAME = "smartmeet_ai_queue";

async function manualProcess() {
  console.log("--- Manual AI Pipeline Processor ---");
  
  // 1. Get a task from Redis
  const taskData = await redis.lpop(QUEUE_NAME);
  if (!taskData) {
    console.log("No tasks in queue.");
    return;
  }

  const task = typeof taskData === 'string' ? JSON.parse(taskData) : taskData;
  const meetingId = task.data.meetingId;
  console.log(`Processing task ${task.id} for meeting ${meetingId}...`);

  try {
    // 2. Get meeting and user
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { user: true }
    });

    if (!meeting) {
      console.error(`Meeting ${meetingId} not found in DB.`);
      return;
    }

    if (!meeting.user.apiKey) {
      console.error(`User ${meeting.user.id} has no API key.`);
      return;
    }

    // 3. Test Decryption
    console.log("Testing API key decryption...");
    try {
      const decrypted = decrypt(meeting.user.apiKey);
      console.log("Decryption successful.");
      
      // 4. Test API Base URL
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
      console.log(`Testing AI API connectivity to ${apiBase}...`);
      const healthCheck = await fetch(`${apiBase}/health`).catch(e => ({ ok: false, statusText: e.message }));
      console.log(`AI API Health: ${healthCheck.ok ? '✅ OK' : '❌ Failed (' + healthCheck.statusText + ')'}`);

    } catch (err) {
      console.error("Decryption FAILED. Check ENCRYPTION_SECRET.", err);
      // Re-enqueue task since we failed
      await redis.rpush(QUEUE_NAME, JSON.stringify(task));
      return;
    }

    console.log("\nReady to process. Since internalProcessMeetingAI is complex, please use the /api/v1/worker/process endpoint or the fixed trigger logic in-app to process this task fully.");
    console.log("I have re-enqueued the task to ensure it's not lost.");
    await redis.rpush(QUEUE_NAME, JSON.stringify(task));

  } catch (err) {
    console.error("Manual process error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

manualProcess();
