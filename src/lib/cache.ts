import { Redis as UpstashRedis } from "@upstash/redis";
import logger from "@/lib/logger";

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
    
    try {
      // Explicitly delete common keys first for speed
      const commonKeys = [
        `user:${userId}:meetings`,
        `user:${userId}:stats`
      ];
      await redis.del(...commonKeys);
      
      // Then clean up any others via pattern
      const keys = await redis.keys(`user:${userId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      logger.info({ userId, keysDeleted: keys.length + commonKeys.length }, "User cache invalidated");
    } catch (error) {
      logger.error({ error, userId }, "Failed to invalidate user cache");
    }
  },

  /**
   * Stale-While-Revalidate (SWR) pattern
   * Returns cached data immediately, then refreshes it in the background if stale
   */
  async swr<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 3600,
    staleSeconds: number = 86400 // 24 hours
  ): Promise<T> {
    const redis = await getRedis();
    if (!redis) return await fetcher();

    // Try to get cached data
    const cached = await redis.get<{ data: T; timestamp: number }>(key);
    const now = Date.now();

    if (cached) {
      const isStale = now - cached.timestamp > ttlSeconds * 1000;
      const isExpired = now - cached.timestamp > staleSeconds * 1000;

      if (!isStale) {
        return cached.data;
      }

      // If stale but not expired, return stale data and refresh in background
      if (!isExpired) {
        // Background refresh
        (async () => {
          try {
            const freshData = await fetcher();
            await this.set(key, { data: freshData, timestamp: Date.now() }, staleSeconds);
          } catch (error) {
            logger.error({ error, key }, "SWR background refresh failed");
          }
        })();
        return cached.data;
      }
    }

    // If no cache or expired, fetch and set
    const freshData = await fetcher();
    await this.set(key, { data: freshData, timestamp: Date.now() }, staleSeconds);
    return freshData;
  }
};
