import logger from "./logger";

/**
 * A utility for measuring performance of code blocks.
 */
export class Performance {
  private static marks = new Map<string, number>();

  /**
   * Start timing a block of code
   * @param label A unique label for this timing
   */
  static start(label: string) {
    this.marks.set(label, Date.now());
  }

  /**
   * Stop timing and log the duration
   * @param label The same label used in start()
   * @param context Additional context for the log
   */
  static end(label: string, context: Record<string, unknown> = {}) {
    const startTime = this.marks.get(label);
    if (!startTime) {
      logger.warn({ label }, "Performance.end called without matching Performance.start");
      return;
    }

    const duration = Date.now() - startTime;
    this.marks.delete(label);

    logger.info(
      { 
        ...context, 
        performance: { 
          label, 
          durationMs: duration,
          durationSec: (duration / 1000).toFixed(2)
        } 
      }, 
      `Performance: ${label}`
    );

    return duration;
  }

  /**
   * Wrap an async function with timing
   */
  static async measure<T>(
    label: string, 
    fn: () => Promise<T>, 
    context: Record<string, unknown> = {}
  ): Promise<T> {
    this.start(label);
    try {
      return await fn();
    } finally {
      this.end(label, context);
    }
  }
}
