import { config } from 'dotenv';

// Load environment variables in development
if (process.env.NODE_ENV !== 'production') {
  config();
}

/**
 * Application configuration
 * All environment variables are loaded and validated here
 */
const appConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://localhost:5432/binaai_dev',

  // Security
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100, // requests per window

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Database connection options
  DB_SSL: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Validate required environment variables
const requiredVars = ['DATABASE_URL'];
const missingVars = requiredVars.filter((varName) => !appConfig[varName.replace('REQUIRED_', '')]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  process.exit(1);
}

// Freeze the configuration to prevent accidental modifications
export default Object.freeze(appConfig);
