import { getUpstashRedis, getIORedisClient } from "@/lib/redis";
import logger from "./logger";

// Standard Flexible Implementation (Memory or ioredis) types
interface RateLimiterAbstract {
  points: number;
  consume(key: string): Promise<{ remainingPoints: number; msBeforeNext: number }>;
  delete(key: string): Promise<boolean>;
}

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
  
  try {
    const redis = await getUpstashRedis();
    
    if (!redis) {
      // Fallback to flexible rate limiting if Upstash Redis is not available
      logger.warn("Upstash Redis not available, falling back to flexible rate limiting");
      return flexibleConsume(type, key);
    }

    const ratelimitModule = await import("@upstash/ratelimit").catch(() => {
      logger.warn("@upstash/ratelimit module not available");
      return null;
    });
    
    if (!ratelimitModule || !ratelimitModule.Ratelimit) {
      logger.warn("@upstash/ratelimit not available, falling back to flexible rate limiting");
      return flexibleConsume(type, key);
    }
    
    const ratelimit = new ratelimitModule.Ratelimit({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      redis: redis as any,
      limiter: ratelimitModule.Ratelimit.slidingWindow(config.points, config.duration as `${number}s` | `${number}m` | `${number}h` | `${number}d`),
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
  } catch (error) {
    logger.error({ error }, "Upstash rate limiting failed, falling back to flexible rate limiting");
    return flexibleConsume(type, key);
  }
}

/**
 * Standard Flexible Implementation (Memory or ioredis)
 */
let flexibleLimiters: Record<string, RateLimiterAbstract> | null = null;

async function getFlexibleLimiter(type: LimiterType): Promise<RateLimiterAbstract> {
  if (!flexibleLimiters) {
    const { RateLimiterMemory, RateLimiterRedis } = await import("rate-limiter-flexible");
    const ioRedisClient = await getIORedisClient();
    flexibleLimiters = {
      api: ioRedisClient 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? new RateLimiterRedis({ storeClient: ioRedisClient as any, points: LIMITER_CONFIGS.api.points, duration: LIMITER_CONFIGS.api.durationSec, keyPrefix: "api" })
        : new RateLimiterMemory({ points: LIMITER_CONFIGS.api.points, duration: LIMITER_CONFIGS.api.durationSec }),
      login: ioRedisClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? new RateLimiterRedis({ storeClient: ioRedisClient as any, points: LIMITER_CONFIGS.login.points, duration: LIMITER_CONFIGS.login.durationSec, keyPrefix: "login" })
        : new RateLimiterMemory({ points: LIMITER_CONFIGS.login.points, duration: LIMITER_CONFIGS.login.durationSec }),
      general: ioRedisClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? new RateLimiterRedis({ storeClient: ioRedisClient as any, points: LIMITER_CONFIGS.general.points, duration: LIMITER_CONFIGS.general.durationSec, keyPrefix: "general" })
        : new RateLimiterMemory({ points: LIMITER_CONFIGS.general.points, duration: LIMITER_CONFIGS.general.durationSec }),
    } as Record<string, RateLimiterAbstract>;
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
      if (typeof limiter.delete === 'function') {
        await limiter.delete(key);
      }
    }
  } catch (error) {
    logger.error({ error, type, key }, "Failed to reset rate limit");
  }
}
