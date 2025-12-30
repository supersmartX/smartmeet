import { RateLimiterMemory, RateLimiterRes, RateLimiterAbstract } from "rate-limiter-flexible";

// Configuration for rate limiters
const LIMITER_CONFIGS = {
  api: {
    points: 10,
    duration: 60,
    keyPrefix: "api_rate_limit",
  },
  login: {
    points: 5,
    duration: 60 * 15,
    keyPrefix: "login_rate_limit",
  },
  general: {
    points: 100,
    duration: 60 * 60,
    keyPrefix: "general_rate_limit",
  },
};

// Memory-based limiters (default fallback)
const apiRateLimiter = new RateLimiterMemory(LIMITER_CONFIGS.api);
const loginRateLimiter = new RateLimiterMemory(LIMITER_CONFIGS.login);
const generalRateLimiter = new RateLimiterMemory(LIMITER_CONFIGS.general);

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
 * Internal helper to format rate limiter results
 */
function formatResult(limiter: RateLimiterAbstract, res: RateLimiterRes, allowed: boolean): RateLimitResult {
  return {
    allowed,
    limit: limiter.points,
    remaining: allowed ? res.remainingPoints : 0,
    reset: res.msBeforeNext,
    retryAfter: !allowed ? Math.ceil(res.msBeforeNext / 1000) : 0,
  };
}

/**
 * Generic consume function with error handling
 */
async function consume(limiter: RateLimiterAbstract, key: string): Promise<RateLimitResult> {
  try {
    const res = await limiter.consume(key);
    return formatResult(limiter, res, true);
  } catch (rateLimiterRes: unknown) {
    return formatResult(limiter, rateLimiterRes as RateLimiterRes, false);
  }
}

/**
 * Check API rate limit
 */
export async function checkApiRateLimit(key: string): Promise<RateLimitResult> {
  return consume(apiRateLimiter, key);
}

/**
 * Check login rate limit
 */
export async function checkLoginRateLimit(key: string): Promise<RateLimitResult> {
  return consume(loginRateLimiter, key);
}

/**
 * Check general rate limit
 */
export async function checkGeneralRateLimit(key: string): Promise<RateLimitResult> {
  return consume(generalRateLimiter, key);
}

/**
 * Enhanced login rate limiting with IP tracking
 */
export async function checkLoginRateLimitWithIP(email: string, ip?: string): Promise<RateLimitResult> {
  // 1. Check email-based limit
  const emailResult = await checkLoginRateLimit(email);
  if (!emailResult.allowed) return emailResult;
  
  // 2. Check IP-based limit (prevents distributed attacks)
  if (ip) {
    const ipKey = `login:ip:${ip}`;
    const ipResult = await checkLoginRateLimit(ipKey);
    if (!ipResult.allowed) return ipResult;
    
    // Return the more restrictive of the two
    return {
      ...emailResult,
      remaining: Math.min(emailResult.remaining || 0, ipResult.remaining || 0)
    };
  }
  
  return emailResult;
}

/**
 * Reset rate limit for a specific key
 */
export async function resetRateLimit(key: string, type: 'api' | 'login' | 'general'): Promise<void> {
  const limiter = type === 'api' ? apiRateLimiter : 
                  type === 'login' ? loginRateLimiter : 
                  generalRateLimiter;
  
  try {
    await limiter.delete(key);
  } catch (error) {
    console.error(`Failed to reset ${type} rate limit for ${key}:`, error);
  }
}
