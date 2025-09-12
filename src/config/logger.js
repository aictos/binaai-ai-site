import pino from 'pino';
import morgan from 'morgan';
import config from './env.js';

/**
 * Application logger using Pino
 * Configured for structured JSON logging in production
 */
const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.NODE_ENV === 'production'
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }),
});

/**
 * HTTP request logger middleware using Morgan
 * Writes to the main logger in structured format
 */
const requestLogger = morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: {
    write: (message) => {
      logger.info(message.trim(), 'http');
    },
  },
});

export { logger, requestLogger };
