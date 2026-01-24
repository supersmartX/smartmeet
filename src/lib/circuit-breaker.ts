import { getRedisClient } from "@/lib/redis";
import logger from "@/lib/logger";

interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before tripping the circuit
  resetTimeout: number;    // Time in milliseconds before attempting to reset (half-open)
  serviceName: string;      // Unique name for the service (e.g., "openai")
}

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * A simple Redis-backed Circuit Breaker to prevent cascading failures.
 * 
 * CLOSED: Service is working normally.
 * OPEN: Service has failed too many times, skipping requests.
 * HALF_OPEN: Testing if service has recovered.
 */
export class RedisCircuitBreaker {
  private config: CircuitBreakerConfig;
  private prefix: string;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
    this.prefix = `cb:${config.serviceName}`;
  }

  async getState(): Promise<CircuitState> {
    const redis = await getRedisClient();
    if (!redis) return "CLOSED";

    const isOpen = await redis.get<string>(`${this.prefix}:status`);
    if (isOpen === "OPEN") {
      // Check if it's time to try again (half-open)
      const openTime = await redis.get<number>(`${this.prefix}:open_time`);
      if (openTime && Date.now() - openTime > this.config.resetTimeout) {
        return "HALF_OPEN";
      }
      return "OPEN";
    }

    return "CLOSED";
  }

  async recordSuccess(): Promise<void> {
    const redis = await getRedisClient();
    if (!redis) return;
    // Reset failures on success
    await redis.del(`${this.prefix}:failures`);
    await redis.del(`${this.prefix}:status`);
    await redis.del(`${this.prefix}:open_time`);
  }

  async recordFailure(): Promise<void> {
    const redis = await getRedisClient();
    if (!redis) return;

    const failures = await redis.incr(`${this.prefix}:failures`);
    
    if (failures >= this.config.failureThreshold) {
      await redis.set(`${this.prefix}:status`, "OPEN");
      await redis.set(`${this.prefix}:open_time`, Date.now());
      logger.warn({ service: this.config.serviceName, failures }, "Circuit breaker tripped OPEN");
    }
  }

  /**
   * Execute a function with circuit breaker and optional retry protection
   */
  async execute<T>(
    fn: () => Promise<T>,
    retryOptions?: Partial<import("./retry").RetryOptions>
  ): Promise<T> {
    const state = await this.getState();

    if (state === "OPEN") {
      throw new Error(`Circuit breaker is OPEN for ${this.config.serviceName}`);
    }

    try {
      let result: T;
      if (retryOptions) {
        const { RetryService } = await import("./retry");
        result = await RetryService.execute(fn, retryOptions, this.config.serviceName);
      } else {
        result = await fn();
      }
      
      await this.recordSuccess();
      return result;
    } catch (error) {
      await this.recordFailure();
      throw error;
    }
  }
}

// Pre-configured breakers
export const aiCircuitBreaker = new RedisCircuitBreaker({
  serviceName: "ai-pipeline",
  failureThreshold: 5,    // Trip after 5 consecutive failures
  resetTimeout: 60000,    // Try again after 1 minute
});
