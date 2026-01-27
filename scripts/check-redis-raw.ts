
import { Redis } from "@upstash/redis";
import * as dotenv from "dotenv";
import path from "path";

// Load .env from project root
dotenv.config({ path: path.join(__dirname, "../.env") });

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error("Missing Redis credentials in .env");
  process.exit(1);
}

const redis = new Redis({ url, token });
const QUEUE_NAME = "smartmeet_ai_queue";

async function checkQueue() {
  console.log(`Checking queue: ${QUEUE_NAME}`);
  try {
    const len = await redis.llen(QUEUE_NAME);
    console.log(`Queue length: ${len}`);
    
    if (len > 0) {
      const items = await redis.lrange(QUEUE_NAME, 0, -1);
      console.log("Items in queue:");
      items.forEach((item, i) => {
        console.log(`[${i}] ${typeof item === 'string' ? item : JSON.stringify(item)}`);
      });
    }
  } catch (err) {
    console.error("Failed to check queue:", err);
  }
}

checkQueue();
