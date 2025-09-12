import pg from 'pg';
import config from '../config/env.js';
import { logger } from '../config/logger.js';

const { Pool } = pg;

/**
 * PostgreSQL connection pool
 * Singleton pattern to ensure single pool instance across the application
 */
class DatabasePool {
  constructor() {
    if (DatabasePool.instance) {
      return DatabasePool.instance;
    }

    this.pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: config.DB_SSL,
      max: 20, // Maximum number of connections
      idleTimeoutMillis: 30000, // 30 seconds
      connectionTimeoutMillis: 10000, // 10 seconds
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on idle client');
    });

    // Handle connection events
    this.pool.on('connect', () => {
      logger.debug('New client connected to database');
    });

    this.pool.on('remove', () => {
      logger.debug('Client removed from database pool');
    });

    DatabasePool.instance = this;
    logger.info('Database pool initialized');
  }

  /**
   * Get a client from the pool
   */
  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug({ query: text, duration, rows: result.rowCount }, 'Database query executed');
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error({ query: text, duration, error: error.message }, 'Database query failed');
      throw error;
    }
  }

  /**
   * Close the pool
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info('Database pool closed');
    }
  }

  /**
   * Check database health
   */
  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      return {
        ok: true,
        timestamp: result.rows[0].current_time,
        poolConnected: this.pool.totalCount,
        poolIdle: this.pool.idleCount,
        poolWaiting: this.pool.waitingCount,
      };
    } catch (error) {
      logger.error({ error: error.message }, 'Database health check failed');
      return {
        ok: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
const db = new DatabasePool();
export default db;
