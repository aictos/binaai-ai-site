#!/usr/bin/env node

import { startServer } from './server.js';
import { logger } from './config/logger.js';
import db from './db/pool.js';

/**
 * Application entry point
 * Initializes and starts the server
 */
async function main() {
  try {
    // Test database connection
    const dbHealth = await db.healthCheck();
    if (dbHealth.ok) {
      logger.info('Database connection verified');
    } else {
      logger.warn(
        { error: dbHealth.error },
        'Database connection failed, but starting server anyway'
      );
    }

    // Start the server
    startServer();
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to start application');
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled promise rejection');
  process.exit(1);
});

// Start the application
main();
