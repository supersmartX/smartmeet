
const { Redis } = require('@upstash/redis');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    console.log("Upstash Redis credentials missing");
    return;
  }

  const redis = new Redis({ url, token });
  const len = await redis.llen("smartmeet_ai_queue");
  console.log(`Queue length: ${len}`);
  const dlqLen = await redis.llen("smartmeet_ai_dlq");
  console.log(`DLQ length: ${dlqLen}`);
  
  if (len > 0) {
    const tasks = await redis.lrange("smartmeet_ai_queue", 0, -1);
    console.log("Tasks in queue:", JSON.stringify(tasks, null, 2));
  }
}

main().catch(console.error);
