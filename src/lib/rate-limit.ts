import { RateLimiterMemory, RateLimiterRedis, RateLimiterAbstract } from "rate-limiter-flexible";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";

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
    points: 10,
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
const upstashRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// 2. Try Standard Redis (ioredis)
const ioRedisClient = !upstashRedis && process.env.REDIS_URL 
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: 3 }) 
  : null;

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
  const ratelimit = new Ratelimit({
    redis: upstashRedis!,
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
const flexibleLimiters: Record<string, RateLimiterAbstract> = {
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

async function flexibleConsume(type: LimiterType, key: string): Promise<RateLimitResult> {
  const limiter = flexibleLimiters[type];
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
  if (upstashRedis) {
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
    if (upstashRedis) {
      const prefix = `@upstash/ratelimit/${type}`;
      await upstashRedis.del(`${prefix}:${key}`);
    } else if (ioRedisClient) {
      await ioRedisClient.del(`${type}:${key}`);
    } else {
      await (flexibleLimiters[type] as RateLimiterMemory).delete(key);
    }
  } catch (error) {
    console.error(`Failed to reset ${type} rate limit:`, error);
  }
}
