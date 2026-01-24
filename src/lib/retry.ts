import logger from "@/lib/logger";

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  useJitter: boolean;
  retryableErrors?: (error: unknown) => boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffFactor: 2,
  useJitter: true,
};

/**
 * Utility for retrying operations with exponential backoff and jitter.
 */
export class RetryService {
  /**
   * Execute a function with retries.
   */
  static async execute<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    context: string = "Operation"
  ): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: unknown;
    let delay = opts.initialDelayMs;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (opts.retryableErrors && !opts.retryableErrors(error)) {
          logger.error({ error, context, attempt }, "Non-retryable error encountered");
          throw error;
        }

        if (attempt === opts.maxAttempts) {
          logger.error(
            { error, context, attempt },
            `Failed after ${opts.maxAttempts} attempts`
          );
          break;
        }

        // Calculate next delay
        const jitter = opts.useJitter ? Math.random() * 0.1 + 0.9 : 1;
        const nextDelay = Math.min(delay * opts.backoffFactor * jitter, opts.maxDelayMs);

        logger.warn(
          { error: error instanceof Error ? error.message : error, context, attempt, nextDelay },
          `Retrying ${context}...`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = nextDelay;
      }
    }

    throw lastError;
  }
}
