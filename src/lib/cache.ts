import { Redis as UpstashRedis } from "@upstash/redis";

let redisInstance: UpstashRedis | null = null;

async function getRedis() {
  if (redisInstance) return redisInstance;
  
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (url && token) {
    const { Redis } = await import("@upstash/redis");
    redisInstance = new Redis({
      url,
      token,
    });
  }
  
  return redisInstance;
}

/**
 * Simple cache wrapper for Upstash Redis
 */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const redis = await getRedis();
    if (!redis) return null;
    return await redis.get<T>(key);
  },

  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    const redis = await getRedis();
    if (!redis) return;
    await redis.set(key, value, { ex: ttlSeconds });
  },

  async delete(key: string): Promise<void> {
    const redis = await getRedis();
    if (!redis) return;
    await redis.del(key);
  },

  async invalidateUserCache(userId: string): Promise<void> {
    const redis = await getRedis();
    if (!redis) return;
    const keys = await redis.keys(`user:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
};
