import { RateLimiterMemory, RateLimiterRedis, RateLimiterAbstract } from "rate-limiter-flexible";
import type { Redis as UpstashRedis } from "@upstash/redis";
import type IORedis from "ioredis";

import logger from "./logger";

// Configuration for rate limiters
type LimiterType = "api" | "login" | "general";

interface Config {
  points: number;
  duration: string;
  durationSec: number;
  keyPrefix?: string;
}

const LIMITER_CONFIGS: Record<LimiterType, Config> = {
  api: {
    points: 50,
    duration: "60s", 
    durationSec: 60,
    keyPrefix: "api_rate_limit",
  },
  login: {
    points: 5,
    duration: "15m",
    durationSec: 60 * 15,
  },
  general: {
    points: 100,
    duration: "1h",
    durationSec: 60 * 60,
  },
};

// 1. Try Upstash REST (Best for Serverless/Edge)
let upstashRedisInstance: UpstashRedis | null = null;

async function getUpstashRedis() {
  if (upstashRedisInstance) return upstashRedisInstance;
  
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (url && token) {
    const { Redis } = await import("@upstash/redis");
    upstashRedisInstance = new Redis({
      url,
      token,
    });
  }
  
  return upstashRedisInstance;
}

// 2. Try Standard Redis (ioredis)
let ioRedisClientInstance: IORedis | null = null;

async function getIORedisClient() {
  if (ioRedisClientInstance) return ioRedisClientInstance;
  
  const upstash = await getUpstashRedis();
  if (!upstash && process.env.REDIS_URL) {
    const { default: IORedisClient } = await import("ioredis");
    ioRedisClientInstance = new IORedisClient(process.env.REDIS_URL, { maxRetriesPerRequest: 3 });
  }
  
  return ioRedisClientInstance;
}

/**
 * Interface for rate limit results
 */
export interface RateLimitResult {
  allowed: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
  retryAfter?: number;
}

/**
 * Upstash Implementation
 */
async function upstashConsume(type: LimiterType, key: string): Promise<RateLimitResult> {
  const config = LIMITER_CONFIGS[type];
  const redis = await getUpstashRedis();
  
  if (!redis) {
    throw new Error("Upstash Redis not initialized");
  }

  const { Ratelimit } = await import("@upstash/ratelimit");
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.points, config.duration as `${number}s` | `${number}m` | `${number}h` | `${number}d`),
    prefix: `@upstash/ratelimit/${type}`,
  });

  const { success, limit, remaining, reset } = await ratelimit.limit(key);
  const now = Date.now();
  
  return {
    allowed: success,
    limit,
    remaining,
    reset: reset - now,
    retryAfter: !success ? Math.ceil((reset - now) / 1000) : 0,
  };
}

/**
 * Standard Flexible Implementation (Memory or ioredis)
 */
let flexibleLimiters: Record<string, RateLimiterAbstract> | null = null;

async function getFlexibleLimiter(type: LimiterType): Promise<RateLimiterAbstract> {
  if (!flexibleLimiters) {
    const ioRedisClient = await getIORedisClient();
    flexibleLimiters = {
      api: ioRedisClient 
        ? new RateLimiterRedis({ storeClient: ioRedisClient, points: LIMITER_CONFIGS.api.points, duration: LIMITER_CONFIGS.api.durationSec, keyPrefix: "api" })
        : new RateLimiterMemory({ points: LIMITER_CONFIGS.api.points, duration: LIMITER_CONFIGS.api.durationSec }),
      login: ioRedisClient
        ? new RateLimiterRedis({ storeClient: ioRedisClient, points: LIMITER_CONFIGS.login.points, duration: LIMITER_CONFIGS.login.durationSec, keyPrefix: "login" })
        : new RateLimiterMemory({ points: LIMITER_CONFIGS.login.points, duration: LIMITER_CONFIGS.login.durationSec }),
      general: ioRedisClient
        ? new RateLimiterRedis({ storeClient: ioRedisClient, points: LIMITER_CONFIGS.general.points, duration: LIMITER_CONFIGS.general.durationSec, keyPrefix: "general" })
        : new RateLimiterMemory({ points: LIMITER_CONFIGS.general.points, duration: LIMITER_CONFIGS.general.durationSec }),
    };
  }
  return flexibleLimiters[type];
}

async function flexibleConsume(type: LimiterType, key: string): Promise<RateLimitResult> {
  const limiter = await getFlexibleLimiter(type);
  try {
    const res = await limiter.consume(key);
    return {
      allowed: true,
      limit: limiter.points,
      remaining: res.remainingPoints,
      reset: res.msBeforeNext,
      retryAfter: 0,
    };
  } catch (err: unknown) {
    const res = err as { msBeforeNext: number };
    return {
      allowed: false,
      limit: limiter.points,
      remaining: 0,
      reset: res.msBeforeNext || 0,
      retryAfter: Math.ceil((res.msBeforeNext || 0) / 1000),
    };
  }
}

/**
 * Main Check Function
 */
async function checkRateLimit(type: LimiterType, key: string): Promise<RateLimitResult> {
  const upstash = await getUpstashRedis();
  if (upstash) {
    return upstashConsume(type, key);
  }
  return flexibleConsume(type, key);
}

export async function checkApiRateLimit(key: string): Promise<RateLimitResult> {
  return checkRateLimit("api", key);
}

export async function checkLoginRateLimit(key: string): Promise<RateLimitResult> {
  return checkRateLimit("login", key);
}

export async function checkGeneralRateLimit(key: string): Promise<RateLimitResult> {
  return checkRateLimit("general", key);
}

/**
 * Enhanced login rate limiting with IP tracking
 */
export async function checkLoginRateLimitWithIP(email: string, ip?: string): Promise<RateLimitResult> {
  const emailResult = await checkLoginRateLimit(email);
  if (!emailResult.allowed) return emailResult;
  
  if (ip) {
    const ipKey = `login:ip:${ip}`;
    const ipResult = await checkLoginRateLimit(ipKey);
    if (!ipResult.allowed) return ipResult;
    
    return {
      ...emailResult,
      remaining: Math.min(emailResult.remaining || 0, ipResult.remaining || 0)
    };
  }
  
  return emailResult;
}

/**
 * Reset rate limit (Note: Upstash Ratelimit doesn't have a simple delete-by-key, 
 * so we fallback to manual key deletion if needed)
 */
export async function resetRateLimit(key: string, type: LimiterType): Promise<void> {
  try {
    const upstashRedis = await getUpstashRedis();
    const ioRedisClient = await getIORedisClient();
    
    if (upstashRedis) {
      const prefix = `@upstash/ratelimit/${type}`;
      await upstashRedis.del(`${prefix}:${key}`);
    } else if (ioRedisClient) {
      await ioRedisClient.del(`${type}:${key}`);
    } else {
      const limiter = await getFlexibleLimiter(type);
      if (limiter instanceof RateLimiterMemory) {
        await limiter.delete(key);
      }
    }
  } catch (error) {
    logger.error({ error, type, key }, "Failed to reset rate limit");
  }
}
