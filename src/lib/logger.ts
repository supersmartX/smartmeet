import pino from 'pino';

/**
 * Custom logger configuration for Next.js
 * 
 * This logger is safe for use in both server and browser environments.
 */
const createLogger = () => {
  // Check if we are in a browser environment
  const isBrowser = typeof window !== 'undefined';

  if (isBrowser) {
    // Browser: Use standard pino with console output
    return pino({
      level: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
      browser: {
        asObject: true
      }
    });
  }

  // Server: Environment-specific configuration
  if (process.env.NODE_ENV === 'development') {
    try {
      /**
       * In development server-side, we try to use pino-pretty as a stream.
       * We use eval('require') to hide this from Webpack's static analysis
       * so it doesn't try to bundle it (and its node-only dependencies like worker_threads)
       * for the client-side bundle.
       */
      const pretty = eval('require')('pino-pretty');
      return pino({
        level: process.env.LOG_LEVEL || 'info',
      }, pretty({
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'HH:MM:ss Z',
        singleLine: true,
      }));
    } catch {
      // Fallback if pino-pretty is not available or if require fails
      return pino({ level: 'info' });
    }
  }

  // Production Server: Standard JSON logging for better observability
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
};

const logger = createLogger();

export default logger;
