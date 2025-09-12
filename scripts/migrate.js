#!/usr/bin/env node

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../src/db/pool.js';
import { logger } from '../src/config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Database migration script
 * Runs SQL files from src/db/migrations in order
 * Idempotent - safe to run multiple times
 */
class MigrationRunner {
  constructor() {
    this.migrationsPath = join(__dirname, '../src/db/migrations');
  }

  /**
   * Create migrations tracking table
   */
  async createMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await db.query(query);
    logger.info('Migrations table ensured');
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations() {
    try {
      const result = await db.query('SELECT filename FROM migrations ORDER BY id');
      return result.rows.map((row) => row.filename);
    } catch (error) {
      // Table might not exist yet
      return [];
    }
  }

  /**
   * Get list of migration files
   */
  async getMigrationFiles() {
    try {
      const files = await readdir(this.migrationsPath);
      return files.filter((file) => file.endsWith('.sql')).sort();
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to read migrations directory');
      return [];
    }
  }

  /**
   * Execute a single migration file
   */
  async executeMigration(filename) {
    const filePath = join(this.migrationsPath, filename);

    try {
      const sql = await readFile(filePath, 'utf8');

      // Execute migration in a transaction
      await db.query('BEGIN');

      // Execute the migration SQL
      await db.query(sql);

      // Record the migration as executed
      await db.query(
        'INSERT INTO migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
        [filename]
      );

      await db.query('COMMIT');

      logger.info({ filename }, 'Migration executed successfully');
    } catch (error) {
      await db.query('ROLLBACK');
      logger.error({ filename, error: error.message }, 'Migration failed');
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    try {
      logger.info('Starting database migrations...');

      // Ensure migrations table exists
      await this.createMigrationsTable();

      // Get executed and available migrations
      const [executedMigrations, migrationFiles] = await Promise.all([
        this.getExecutedMigrations(),
        this.getMigrationFiles(),
      ]);

      // Find pending migrations
      const pendingMigrations = migrationFiles.filter((file) => !executedMigrations.includes(file));

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }

      logger.info({ count: pendingMigrations.length }, 'Running pending migrations');

      // Execute pending migrations in order
      for (const filename of pendingMigrations) {
        await this.executeMigration(filename);
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error({ error: error.message }, 'Migration process failed');
      process.exit(1);
    }
  }
}

// Run migrations if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new MigrationRunner();

  runner
    .runMigrations()
    .then(() => {
      logger.info('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error: error.message }, 'Migration process failed');
      process.exit(1);
    })
    .finally(() => {
      db.close();
    });
} else {
  // If imported as a module, run migrations immediately
  const runner = new MigrationRunner();
  runner.runMigrations().catch((error) => {
    logger.error({ error: error.message }, 'Migration process failed');
    process.exit(1);
  });
}

export default MigrationRunner;
