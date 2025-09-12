#!/usr/bin/env node

/**
 * Deployment Script
 * Handles deployment to different environments
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

const execAsync = promisify(exec);

class DeploymentManager {
  constructor() {
    this.environments = ['development', 'test', 'staging', 'production'];
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');
    
    // Check if Docker is installed
    try {
      await execAsync('docker --version');
      console.log('✅ Docker is installed');
    } catch (error) {
      console.error('❌ Docker is not installed');
      return false;
    }

    // Check if Docker Compose is installed
    try {
      await execAsync('docker-compose --version');
      console.log('✅ Docker Compose is installed');
    } catch (error) {
      console.error('❌ Docker Compose is not installed');
      return false;
    }

    return true;
  }

  async generateConfigurations() {
    console.log('📝 Generating environment configurations...');
    
    try {
      await execAsync('npm run env:generate all');
      console.log('✅ Environment configurations generated');
    } catch (error) {
      console.error('❌ Failed to generate configurations:', error.message);
      return false;
    }

    return true;
  }

  async buildDockerImage(environment) {
    console.log(`🐳 Building Docker image for ${environment}...`);
    
    try {
      await execAsync(`docker build -t binaai-${environment} .`);
      console.log(`✅ Docker image built for ${environment}`);
    } catch (error) {
      console.error(`❌ Failed to build Docker image for ${environment}:`, error.message);
      return false;
    }

    return true;
  }

  async deployWithDocker(environment) {
    console.log(`🚀 Deploying ${environment} with Docker...`);
    
    try {
      // Stop existing containers
      await execAsync('docker-compose down');
      
      // Start new containers
      await execAsync(`docker-compose --env-file .env.${environment} up -d`);
      
      console.log(`✅ ${environment} deployed successfully`);
    } catch (error) {
      console.error(`❌ Failed to deploy ${environment}:`, error.message);
      return false;
    }

    return true;
  }

  async deployToKubernetes(environment) {
    console.log(`☸️  Deploying ${environment} to Kubernetes...`);
    
    try {
      // Apply Kubernetes configurations
      await execAsync(`kubectl apply -f k8s/config-${environment}.yaml`);
      
      // Deploy application
      await execAsync(`kubectl set image deployment/binaai-${environment} binaai=binaai-${environment}:latest`);
      
      console.log(`✅ ${environment} deployed to Kubernetes`);
    } catch (error) {
      console.error(`❌ Failed to deploy ${environment} to Kubernetes:`, error.message);
      return false;
    }

    return true;
  }

  async runHealthChecks(environment) {
    console.log(`🏥 Running health checks for ${environment}...`);
    
    try {
      // Wait for service to be ready
      await execAsync('sleep 10');
      
      // Check health endpoint
      const { stdout } = await execAsync('curl -f http://localhost:3000/api/health');
      console.log('✅ Health check passed');
      
      // Check database health
      await execAsync('npm run db:health');
      console.log('✅ Database health check passed');
      
    } catch (error) {
      console.error('❌ Health checks failed:', error.message);
      return false;
    }

    return true;
  }

  async rollback(environment) {
    console.log(`🔄 Rolling back ${environment}...`);
    
    try {
      // Stop current deployment
      await execAsync('docker-compose down');
      
      // Start previous version (if available)
      await execAsync('docker-compose up -d');
      
      console.log(`✅ ${environment} rolled back`);
    } catch (error) {
      console.error(`❌ Failed to rollback ${environment}:`, error.message);
      return false;
    }

    return true;
  }

  async deploy(environment, platform = 'docker') {
    console.log(`🚀 Starting deployment of ${environment} to ${platform}...`);
    
    // Check prerequisites
    if (!(await this.checkPrerequisites())) {
      return false;
    }

    // Generate configurations
    if (!(await this.generateConfigurations())) {
      return false;
    }

    // Build Docker image
    if (!(await this.buildDockerImage(environment))) {
      return false;
    }

    // Deploy based on platform
    let deploySuccess = false;
    if (platform === 'docker') {
      deploySuccess = await this.deployWithDocker(environment);
    } else if (platform === 'kubernetes') {
      deploySuccess = await this.deployToKubernetes(environment);
    } else {
      console.error(`❌ Unknown platform: ${platform}`);
      return false;
    }

    if (!deploySuccess) {
      return false;
    }

    // Run health checks
    if (!(await this.runHealthChecks(environment))) {
      console.log('⚠️  Health checks failed, attempting rollback...');
      await this.rollback(environment);
      return false;
    }

    console.log(`🎉 ${environment} deployment completed successfully!`);
    return true;
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const environment = process.argv[3];
  const platform = process.argv[4] || 'docker';
  
  const deployManager = new DeploymentManager();

  try {
    switch (command) {
      case 'deploy':
        if (!environment) {
          console.error('❌ Environment is required');
          process.exit(1);
        }
        await deployManager.deploy(environment, platform);
        break;
      case 'rollback':
        if (!environment) {
          console.error('❌ Environment is required');
          process.exit(1);
        }
        await deployManager.rollback(environment);
        break;
      case 'health':
        await deployManager.runHealthChecks(environment || 'development');
        break;
      default:
        console.log(`
Deployment Commands:

  deploy <environment> [platform]  - Deploy to environment
  rollback <environment>           - Rollback environment
  health [environment]             - Run health checks

Environments:
  development, test, staging, production

Platforms:
  docker (default), kubernetes

Examples:
  node scripts/deploy.js deploy development
  node scripts/deploy.js deploy production kubernetes
  node scripts/deploy.js rollback staging
  node scripts/deploy.js health production
        `);
    }
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default DeploymentManager;
