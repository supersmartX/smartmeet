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
    // In development server-side, we try to use pino-pretty if available.
    // However, we avoid dynamic require/eval to be compatible with Edge Runtime.
    // If pino-pretty is needed, it should be configured via the transport option or standard import
    // but standard pino output is safer for edge compatibility.
    return pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss Z',
          singleLine: true,
        },
      },
    });
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
