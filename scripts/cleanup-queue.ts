
import { Redis } from "@upstash/redis";
import * as dotenv from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";

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

async function cleanupQueue() {
  console.log("Checking for stale tasks in queue...");
  
  const items = await redis.lrange(QUEUE_NAME, 0, -1);
  console.log(`Found ${items.length} items in queue.`);
  
  let validCount = 0;
  let invalidCount = 0;
  
  // Create a new list for valid tasks
  const validTasks = [];
  
  for (const item of items) {
    const task = typeof item === 'string' ? JSON.parse(item) : item;
    const meetingId = task.data.meetingId;
    
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId }
    });
    
    if (meeting) {
      console.log(`✅ Meeting ${meetingId} exists. Keeping task ${task.id}.`);
      validTasks.push(JSON.stringify(task));
      validCount++;
    } else {
      console.log(`❌ Meeting ${meetingId} NOT FOUND. Removing task ${task.id}.`);
      invalidCount++;
    }
  }
  
  if (invalidCount > 0) {
    console.log(`Cleaning up ${invalidCount} invalid tasks...`);
    await redis.del(QUEUE_NAME);
    if (validTasks.length > 0) {
      await redis.rpush(QUEUE_NAME, ...validTasks);
    }
    console.log("Cleanup complete.");
  } else {
    console.log("No invalid tasks found.");
  }
  
  await prisma.$disconnect();
}

cleanupQueue();
