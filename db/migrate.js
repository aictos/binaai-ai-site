#!/usr/bin/env node

/**
 * Database Migration Runner
 * 
 * Usage:
 *   node db/migrate.js                    # Run all pending migrations
 *   node db/migrate.js --dry-run          # Show what would be executed
 *   node db/migrate.js --reset            # Drop and recreate all tables (DANGER!)
 * 
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

class MigrationRunner {
  constructor() {
    this.dryRun = process.argv.includes('--dry-run');
    this.reset = process.argv.includes('--reset');
  }

  async init() {
    // Create migrations tracking table if it doesn't exist
    const createMigrationsTable = `
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        version varchar(255) PRIMARY KEY,
        executed_at timestamptz NOT NULL DEFAULT NOW()
      );
    `;
    
    if (this.dryRun) {
      console.log('DRY RUN - Would execute:');
      console.log(createMigrationsTable);
    } else {
      await pool.query(createMigrationsTable);
      console.log(`✅ Migrations table '${MIGRATIONS_TABLE}' ready`);
    }
  }

  async getExecutedMigrations() {
    if (this.dryRun) return [];
    
    try {
      const result = await pool.query(`SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version`);
      return result.rows.map(row => row.version);
    } catch (error) {
      if (error.code === '42P01') { // table doesn't exist
        return [];
      }
      throw error;
    }
  }

  async getMigrationFiles() {
    try {
      const files = await fs.readdir(MIGRATIONS_DIR);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort();
    } catch (error) {
      console.error(`❌ Could not read migrations directory: ${MIGRATIONS_DIR}`);
      throw error;
    }
  }

  async getPendingMigrations() {
    const allMigrations = await this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    
    return allMigrations.filter(migration => {
      const version = migration.replace('.sql', '');
      return !executedMigrations.includes(version);
    });
  }

  async executeMigration(filename) {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const version = filename.replace('.sql', '');
    
    console.log(`\n📄 Processing migration: ${filename}`);
    
    try {
      const sql = await fs.readFile(filePath, 'utf8');
      
      if (this.dryRun) {
        console.log('DRY RUN - Would execute:');
        console.log('---');
        console.log(sql);
        console.log('---');
        return;
      }

      // Execute the migration in a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Execute the migration SQL
        await client.query(sql);
        
        // Record the migration as executed
        await client.query(
          `INSERT INTO ${MIGRATIONS_TABLE} (version) VALUES ($1)`,
          [version]
        );
        
        await client.query('COMMIT');
        console.log(`✅ Migration ${filename} executed successfully`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error(`❌ Migration ${filename} failed:`, error.message);
      throw error;
    }
  }

  async reset() {
    if (!this.reset) return;
    
    console.log('🔥 RESET MODE: Dropping all tables...');
    
    if (this.dryRun) {
      console.log('DRY RUN - Would drop all tables');
      return;
    }

    const dropTables = `
      DROP TABLE IF EXISTS waitlist_signups CASCADE;
      DROP TABLE IF EXISTS ${MIGRATIONS_TABLE} CASCADE;
      DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    `;

    await pool.query(dropTables);
    console.log('✅ All tables dropped');
  }

  async run() {
    try {
      console.log('🚀 Starting database migration...');
      console.log(`📊 Database: ${process.env.DATABASE_URL ? '[SET]' : '[NOT SET]'}`);
      
      if (this.reset) {
        await this.reset();
      }
      
      await this.init();
      
      const pendingMigrations = await this.getPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations. Database is up to date.');
        return;
      }
      
      console.log(`📋 Found ${pendingMigrations.length} pending migration(s):`);
      pendingMigrations.forEach(migration => {
        console.log(`   - ${migration}`);
      });
      
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log(`\n🎉 All migrations completed successfully!`);
      
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      process.exit(1);
    } finally {
      await pool.end();
    }
  }
}

// Run migrations if called directly
if (require.main === module) {
  const runner = new MigrationRunner();
  runner.run();
}

module.exports = MigrationRunner;
