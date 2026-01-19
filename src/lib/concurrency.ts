import logger from "./logger";

/**
 * Redis-backed Concurrency Limiter (Semaphore)
 * Used to limit the number of simultaneous calls to external APIs or heavy processing tasks.
 */
export class ConcurrencyLimiter {
  private serviceName: string;
  private maxConcurrency: number;
  private prefix: string;
  private timeoutMs: number;

  constructor(serviceName: string, maxConcurrency: number, timeoutMs: number = 300000) { // Default 5 mins timeout
    this.serviceName = serviceName;
    this.maxConcurrency = maxConcurrency;
    this.prefix = `concurrency:${serviceName}`;
    this.timeoutMs = timeoutMs;
  }

  private async getRedis() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (url && token) {
      const { Redis } = await import("@upstash/redis");
      return new Redis({ url, token });
    }
    return null;
  }

  /**
   * Try to acquire a slot for processing.
   * Returns a release function if successful, null otherwise.
   */
  async acquire(requestId: string): Promise<(() => Promise<void>) | null> {
    const redis = await this.getRedis();
    if (!redis) {
      logger.warn({ serviceName: this.serviceName }, "Redis not available for concurrency limiting, failing open");
      return async () => {}; // No-op release
    }

    const key = `${this.prefix}:slots`;
    const requestKey = `${this.prefix}:request:${requestId}`;

    try {
      // Use the number of active request keys as the source of truth for concurrency
      // This is much more resilient to crashes than a separate counter
      const keys = await redis.keys(`${this.prefix}:request:*`);
      const current = keys.length;
      
      if (current >= this.maxConcurrency) {
        logger.warn({ 
          serviceName: this.serviceName, 
          current, 
          max: this.maxConcurrency 
        }, "Concurrency limit reached");
        return null;
      }

      // Set a request-specific key with TTL to handle crashes
      await redis.set(requestKey, "active", { px: this.timeoutMs });

      // Return release function
      return async () => {
        try {
          await redis.del(requestKey);
        } catch (err) {
          logger.error({ err, requestId }, "Error releasing concurrency slot");
        }
      };
    } catch (err) {
      logger.error({ err, serviceName: this.serviceName }, "Concurrency acquire error");
      return async () => {}; // Fail open
    }
  }

  /**
   * Wrap a function with concurrency limits
   */
  async run<T>(requestId: string, fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire(requestId);
    if (!release) {
      throw new Error(`Concurrency limit exceeded for ${this.serviceName}`);
    }

    try {
      return await fn();
    } finally {
      await release();
    }
  }
}

// Export a singleton instance for OpenAI calls
export const aiConcurrencyLimiter = new ConcurrencyLimiter(
  "openai", 
  parseInt(process.env.MAX_AI_CONCURRENCY || "5"), // Default 5 concurrent AI tasks
  parseInt(process.env.AI_TASK_TIMEOUT_MS || "600000") // Default 10 mins
);
