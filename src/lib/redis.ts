import logger from "./logger";

// Shared interfaces for Redis clients
export interface RedisClient {
  del(key: string): Promise<number>;
  get<T = string>(key: string): Promise<T | null>;
  set(key: string, value: string | number, options?: { ex?: number }): Promise<string | null>;
  incr(key: string): Promise<number>;
  rpush(key: string, value: string): Promise<number>;
  lpop<T = string>(key: string): Promise<T | null>;
  llen(key: string): Promise<number>;
}

let upstashRedisInstance: RedisClient | null = null;
let ioRedisClientInstance: RedisClient | null = null;

/**
 * Get Upstash Redis client (REST-based, best for serverless)
 */
export async function getUpstashRedis(): Promise<RedisClient | null> {
  if (upstashRedisInstance) return upstashRedisInstance;
  
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (url && token) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const upstashModule = await (import("@upstash/redis") as Promise<any>).catch(() => {
        logger.warn("@upstash/redis module not available");
        return null;
      });
      if (upstashModule && upstashModule.Redis) {
        upstashRedisInstance = new upstashModule.Redis({
          url,
          token,
        }) as unknown as RedisClient;
        logger.info("Upstash Redis initialized successfully");
      }
    } catch (error) {
      logger.error({ error }, "Failed to initialize Upstash Redis");
    }
  }
  
  return upstashRedisInstance;
}

/**
 * Get Standard Redis client (ioredis, best for long-running processes)
 */
export async function getIORedisClient(): Promise<RedisClient | null> {
  if (ioRedisClientInstance) return ioRedisClientInstance;
  
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ioredisModule = await (import("ioredis") as Promise<any>).catch(() => {
        logger.warn("ioredis module not available");
        return null;
      });
      if (ioredisModule && (ioredisModule.default || ioredisModule)) {
        const IORedisClient = ioredisModule.default || ioredisModule;
        ioRedisClientInstance = new IORedisClient(redisUrl, { 
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => Math.min(times * 50, 2000),
        }) as unknown as RedisClient;
        logger.info("IORedis client initialized successfully");
      }
    } catch (error) {
      logger.error({ error }, "Failed to initialize IORedis client");
    }
  }
  
  return ioRedisClientInstance;
}

/**
 * Get the best available Redis client based on environment
 */
export async function getRedisClient(): Promise<RedisClient | null> {
  // Prefer Upstash in serverless environments
  const upstash = await getUpstashRedis();
  if (upstash) return upstash as RedisClient;
  
  // Fallback to IORedis
  const ioredis = await getIORedisClient();
  if (ioredis) return ioredis as RedisClient;
  
  return null;
}
