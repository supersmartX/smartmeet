import { RateLimiterMemory } from "rate-limiter-flexible";

// Create rate limiters for different endpoints
const apiRateLimiter = new RateLimiterMemory({
  keyPrefix: "api_rate_limit",
  points: 10, // 10 requests
  duration: 60, // per 60 seconds
});

const loginRateLimiter = new RateLimiterMemory({
  keyPrefix: "login_rate_limit",
  points: 5, // 5 attempts
  duration: 60 * 15, // per 15 minutes
});

const generalRateLimiter = new RateLimiterMemory({
  keyPrefix: "general_rate_limit",
  points: 100, // 100 requests
  duration: 60 * 60, // per hour
});

export interface RateLimitResult {
  allowed: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}

/**
 * Check API rate limit for a specific key (user ID, IP, etc.)
 */
export async function checkApiRateLimit(key: string): Promise<RateLimitResult> {
  try {
    const res = await apiRateLimiter.consume(key);
    return {
      allowed: true,
      limit: apiRateLimiter.points,
      remaining: res.remainingPoints,
      reset: res.msBeforeNext,
    };
  } catch (rateLimiterRes: unknown) {
    return {
      allowed: false,
      limit: apiRateLimiter.points,
      remaining: 0,
      reset: (rateLimiterRes as { msBeforeNext: number }).msBeforeNext,
    };
  }
}

/**
 * Check login rate limit for email/IP
 */
export async function checkLoginRateLimit(key: string): Promise<RateLimitResult> {
  try {
    const res = await loginRateLimiter.consume(key);
    return {
      allowed: true,
      limit: loginRateLimiter.points,
      remaining: res.remainingPoints,
      reset: res.msBeforeNext,
    };
  } catch (rateLimiterRes: unknown) {
    return {
      allowed: false,
      limit: loginRateLimiter.points,
      remaining: 0,
      reset: (rateLimiterRes as { msBeforeNext: number }).msBeforeNext,
    };
  }
}

/**
 * Check general rate limit for IP/user
 */
export async function checkGeneralRateLimit(key: string): Promise<RateLimitResult> {
  try {
    const res = await generalRateLimiter.consume(key);
    return {
      allowed: true,
      limit: generalRateLimiter.points,
      remaining: res.remainingPoints,
      reset: res.msBeforeNext,
    };
  } catch (rateLimiterRes: unknown) {
    return {
      allowed: false,
      limit: generalRateLimiter.points,
      remaining: 0,
      reset: (rateLimiterRes as { msBeforeNext: number }).msBeforeNext,
    };
  }
}

/**
 * Enhanced login rate limiting with IP tracking
 */
export async function checkLoginRateLimitWithIP(email: string, ip?: string): Promise<RateLimitResult> {
  // Rate limit by email first
  const emailResult = await checkLoginRateLimit(email);
  if (!emailResult.allowed) {
    return emailResult;
  }
  
  // Also rate limit by IP if available (prevents email rotation attacks)
  if (ip) {
    const ipKey = `login:ip:${ip}`;
    const ipResult = await checkLoginRateLimit(ipKey);
    if (!ipResult.allowed) {
      return {
        ...ipResult,
        remaining: Math.min(emailResult.remaining || 0, ipResult.remaining || 0)
      };
    }
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
  
  await limiter.delete(key);
}
