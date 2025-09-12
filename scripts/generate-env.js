#!/usr/bin/env node

/**
 * Environment Configuration Generator
 * Generates environment-specific configuration files
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const environments = {
  development: {
    NODE_ENV: 'development',
    PORT: 3000,
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/binaai_dev',
    LOG_LEVEL: 'debug',
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX_REQUESTS: 100
  },
  test: {
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/binaai_test',
    LOG_LEVEL: 'error',
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX_REQUESTS: 1000
  },
  staging: {
    NODE_ENV: 'staging',
    PORT: 3000,
    DATABASE_URL: 'postgres://binaai_user:${DB_PASSWORD}@${DB_HOST}:5432/binaai_staging',
    LOG_LEVEL: 'info',
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX_REQUESTS: 50
  },
  production: {
    NODE_ENV: 'production',
    PORT: 3000,
    DATABASE_URL: 'postgres://binaai_user:${DB_PASSWORD}@${DB_HOST}:5432/binaai_prod',
    LOG_LEVEL: 'info',
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX_REQUESTS: 50
  }
};

async function generateEnvFile(environment) {
  const config = environments[environment];
  if (!config) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  const envContent = `# Environment Configuration for ${environment}
# Generated on ${new Date().toISOString()}

# Application
NODE_ENV=${config.NODE_ENV}
PORT=${config.PORT}

# Database
DATABASE_URL=${config.DATABASE_URL}

# Logging
LOG_LEVEL=${config.LOG_LEVEL}

# Security
RATE_LIMIT_WINDOW_MS=${config.RATE_LIMIT_WINDOW_MS}
RATE_LIMIT_MAX_REQUESTS=${config.RATE_LIMIT_MAX_REQUESTS}

# Additional environment-specific variables
${environment === 'production' ? `
# Production security settings
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false

# Monitoring
ENABLE_METRICS=true
` : ''}

${environment === 'staging' ? `
# Staging settings
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
` : ''}

${environment === 'test' ? `
# Test settings
DB_SSL=false
` : ''}
`;

  const envFile = `.env.${environment}`;
  await writeFile(envFile, envContent);
  console.log(`✅ Generated environment configuration: ${envFile}`);
}

async function generateDockerEnv(environment) {
  const config = environments[environment];
  if (!config) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  const dockerEnvContent = `# Docker Environment Configuration for ${environment}
# Generated on ${new Date().toISOString()}

NODE_ENV=${config.NODE_ENV}
PORT=${config.PORT}
DATABASE_URL=${config.DATABASE_URL}
LOG_LEVEL=${config.LOG_LEVEL}
RATE_LIMIT_WINDOW_MS=${config.RATE_LIMIT_WINDOW_MS}
RATE_LIMIT_MAX_REQUESTS=${config.RATE_LIMIT_MAX_REQUESTS}

# Docker-specific variables
POSTGRES_DB=${config.DATABASE_URL.split('/').pop()}
POSTGRES_USER=binaai_user
POSTGRES_PASSWORD=binaai_password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Redis
REDIS_URL=redis://redis:6379
`;

  const dockerEnvFile = `.env.docker.${environment}`;
  await writeFile(dockerEnvFile, dockerEnvContent);
  console.log(`✅ Generated Docker environment configuration: ${dockerEnvFile}`);
}

async function generateKubernetesConfig(environment) {
  const config = environments[environment];
  if (!config) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  const k8sConfig = `apiVersion: v1
kind: ConfigMap
metadata:
  name: binaai-config-${environment}
  namespace: default
data:
  NODE_ENV: "${config.NODE_ENV}"
  PORT: "${config.PORT}"
  LOG_LEVEL: "${config.LOG_LEVEL}"
  RATE_LIMIT_WINDOW_MS: "${config.RATE_LIMIT_WINDOW_MS}"
  RATE_LIMIT_MAX_REQUESTS: "${config.RATE_LIMIT_MAX_REQUESTS}"

---
apiVersion: v1
kind: Secret
metadata:
  name: binaai-secrets-${environment}
  namespace: default
type: Opaque
data:
  DATABASE_URL: ${Buffer.from(config.DATABASE_URL).toString('base64')}
  DB_PASSWORD: ${Buffer.from('your-secure-password').toString('base64')}
`;

  const k8sFile = `k8s/config-${environment}.yaml`;
  await mkdir('k8s', { recursive: true });
  await writeFile(k8sFile, k8sConfig);
  console.log(`✅ Generated Kubernetes configuration: ${k8sFile}`);
}

async function main() {
  const command = process.argv[2];
  const environment = process.argv[3];

  try {
    if (command === 'all') {
      // Generate all environments
      for (const env of Object.keys(environments)) {
        await generateEnvFile(env);
        await generateDockerEnv(env);
        await generateKubernetesConfig(env);
      }
    } else if (environment) {
      // Generate specific environment
      await generateEnvFile(environment);
      await generateDockerEnv(environment);
      await generateKubernetesConfig(environment);
    } else {
      console.log(`
Environment Configuration Generator

Usage:
  node scripts/generate-env.js <command> [environment]

Commands:
  all                    - Generate all environments
  <environment>          - Generate specific environment

Environments:
  development, test, staging, production

Examples:
  node scripts/generate-env.js all
  node scripts/generate-env.js production
  node scripts/generate-env.js staging
      `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
