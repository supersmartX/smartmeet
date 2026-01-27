
const { getRedisClient } = require('../src/lib/redis');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const redis = await getRedisClient();
  if (!redis) {
    console.log("Redis not configured");
    return;
  }
  const len = await redis.llen("smartmeet_ai_queue");
  console.log(`Queue length: ${len}`);
  const dlqLen = await redis.llen("smartmeet_ai_dlq");
  console.log(`DLQ length: ${dlqLen}`);
}

main().catch(console.error);
