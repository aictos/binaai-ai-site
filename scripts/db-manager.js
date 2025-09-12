#!/usr/bin/env node

/**
 * Database Management Script
 * Handles database creation, migration, and environment management
 */

import { readFile, writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from '../src/config/env.js';
import { logger } from '../src/config/logger.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseManager {
  constructor() {
    this.config = config;
    this.environments = {
      development: {
        database: 'binaai_dev',
        user: 'postgres',
        host: 'localhost',
        port: '5432'
      },
      test: {
        database: 'binaai_test',
        user: 'postgres',
        host: 'localhost',
        port: '5432'
      },
      production: {
        database: 'binaai_prod',
        user: process.env.DB_USER || 'binaai_user',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '5432'
      }
    };
  }

  /**
   * Parse DATABASE_URL to extract connection details
   */
  parseDatabaseUrl(url) {
    const regex = /postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
    const match = url.match(regex);
    
    if (!match) {
      throw new Error(`Invalid DATABASE_URL format: ${url}`);
    }

    return {
      user: match[1],
      password: match[2],
      host: match[3],
      port: match[4],
      database: match[5]
    };
  }

  /**
   * Get database connection details for current environment
   */
  getDbConfig() {
    const env = this.config.NODE_ENV;
    const dbUrl = this.config.DATABASE_URL;
    
    if (dbUrl) {
      return this.parseDatabaseUrl(dbUrl);
    }
    
    return this.environments[env] || this.environments.development;
  }

  /**
   * Check if PostgreSQL is running
   */
  async checkPostgresRunning() {
    try {
      await execAsync('pg_isready');
      logger.info('PostgreSQL is running');
      return true;
    } catch (error) {
      logger.error('PostgreSQL is not running or not accessible');
      return false;
    }
  }

  /**
   * Check if database exists
   */
  async databaseExists(dbName) {
    try {
      await execAsync(`psql -lqt | cut -d \\| -f 1 | grep -qw ${dbName}`);
      return true; // If grep succeeds, database exists
    } catch (error) {
      return false; // If grep fails, database doesn't exist
    }
  }

  /**
   * Create database
   */
  async createDatabase(dbName) {
    try {
      if (await this.databaseExists(dbName)) {
        logger.info(`Database '${dbName}' already exists`);
        return true;
      }

      await execAsync(`createdb ${dbName}`);
      logger.info(`Database '${dbName}' created successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to create database '${dbName}':`, error.message);
      return false;
    }
  }

  /**
   * Drop database (use with caution!)
   */
  async dropDatabase(dbName) {
    try {
      if (!(await this.databaseExists(dbName))) {
        logger.info(`Database '${dbName}' does not exist`);
        return true;
      }

      await execAsync(`dropdb ${dbName}`);
      logger.info(`Database '${dbName}' dropped successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to drop database '${dbName}':`, error.message);
      return false;
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    try {
      const { stdout, stderr } = await execAsync('npm run migrate');
      logger.info('Migrations completed successfully');
      if (stdout) logger.info(stdout);
      if (stderr) logger.warn(stderr);
      return true;
    } catch (error) {
      logger.error('Migration failed:', error.message);
      return false;
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      const dbConfig = this.getDbConfig();
      const { stdout } = await execAsync(`psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -c "SELECT 1;"`);
      logger.info('Database health check passed');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error.message);
      return false;
    }
  }

  /**
   * Setup database for current environment
   */
  async setupDatabase() {
    logger.info(`Setting up database for ${this.config.NODE_ENV} environment`);
    
    // Check if PostgreSQL is running
    if (!(await this.checkPostgresRunning())) {
      logger.error('PostgreSQL is not running. Please start it first.');
      return false;
    }

    // Get database configuration
    const dbConfig = this.getDbConfig();
    const dbName = dbConfig.database;

    // Create database if it doesn't exist
    if (!(await this.databaseExists(dbName))) {
      logger.info(`Creating database '${dbName}'`);
      if (!(await this.createDatabase(dbName))) {
        return false;
      }
    }

    // Run migrations
    logger.info('Running database migrations');
    if (!(await this.runMigrations())) {
      return false;
    }

    // Verify setup
    if (await this.checkDatabaseHealth()) {
      logger.info('Database setup completed successfully');
      return true;
    } else {
      logger.error('Database setup verification failed');
      return false;
    }
  }

  /**
   * Reset database (drop and recreate)
   */
  async resetDatabase() {
    const dbConfig = this.getDbConfig();
    const dbName = dbConfig.database;

    logger.warn(`Resetting database '${dbName}' - this will delete all data!`);
    
    if (await this.dropDatabase(dbName)) {
      return await this.setupDatabase();
    }
    
    return false;
  }

  /**
   * Generate environment-specific configuration
   */
  async generateEnvConfig(environment) {
    const envConfig = this.environments[environment];
    if (!envConfig) {
      throw new Error(`Unknown environment: ${environment}`);
    }

    const envContent = `# Environment Configuration for ${environment}
NODE_ENV=${environment}
PORT=3000

# Database Configuration
DATABASE_URL=postgres://${envConfig.user}@${envConfig.host}:${envConfig.port}/${envConfig.database}

# Logging
LOG_LEVEL=${environment === 'production' ? 'info' : 'debug'}

# Security (production overrides)
${environment === 'production' ? `
# Production security settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
` : ''}
`;

    const envFile = `.env.${environment}`;
    await writeFile(envFile, envContent);
    logger.info(`Generated environment configuration: ${envFile}`);
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const environment = process.argv[3] || 'development';
  
  const dbManager = new DatabaseManager();

  try {
    switch (command) {
      case 'setup':
        const setupResult = await dbManager.setupDatabase();
        if (setupResult) {
          console.log('✅ Database setup completed successfully');
        } else {
          console.log('❌ Database setup failed');
          process.exit(1);
        }
        break;
      case 'reset':
        const resetResult = await dbManager.resetDatabase();
        if (resetResult) {
          console.log('✅ Database reset completed successfully');
        } else {
          console.log('❌ Database reset failed');
          process.exit(1);
        }
        break;
      case 'health':
        const healthResult = await dbManager.checkDatabaseHealth();
        if (healthResult) {
          console.log('✅ Database health check passed');
        } else {
          console.log('❌ Database health check failed');
          process.exit(1);
        }
        break;
      case 'create':
        const dbConfig = dbManager.getDbConfig();
        const createResult = await dbManager.createDatabase(dbConfig.database);
        if (createResult) {
          console.log(`✅ Database '${dbConfig.database}' created successfully`);
        } else {
          console.log(`❌ Failed to create database '${dbConfig.database}'`);
          process.exit(1);
        }
        break;
      case 'drop':
        const dbConfig2 = dbManager.getDbConfig();
        const dropResult = await dbManager.dropDatabase(dbConfig2.database);
        if (dropResult) {
          console.log(`✅ Database '${dbConfig2.database}' dropped successfully`);
        } else {
          console.log(`❌ Failed to drop database '${dbConfig2.database}'`);
          process.exit(1);
        }
        break;
      case 'migrate':
        const migrateResult = await dbManager.runMigrations();
        if (migrateResult) {
          console.log('✅ Migrations completed successfully');
        } else {
          console.log('❌ Migrations failed');
          process.exit(1);
        }
        break;
      case 'generate-env':
        await dbManager.generateEnvConfig(environment);
        break;
      default:
        console.log(`
Database Management Commands:

  setup           - Setup database for current environment
  reset           - Reset database (drop and recreate)
  health          - Check database health
  create          - Create database only
  drop            - Drop database only
  migrate         - Run migrations only
  generate-env    - Generate environment configuration

Usage:
  node scripts/db-manager.js <command> [environment]

Examples:
  node scripts/db-manager.js setup
  node scripts/db-manager.js setup production
  node scripts/db-manager.js generate-env staging
        `);
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === undefined || process.argv[1].endsWith('db-manager.js')) {
  console.log('Script execution started...');
  main().catch((error) => {
    console.error('❌ Script execution failed:', error.message);
    process.exit(1);
  });
}

export default DatabaseManager;
