# Infrastructure as Code - Binaai Backend

This document describes the infrastructure as code setup for the Binaai backend application, including database management, environment configuration, and deployment strategies.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │     Staging     │    │   Production    │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │    App    │  │    │  │    App    │  │    │  │    App    │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │PostgreSQL │  │    │  │PostgreSQL │  │    │  │PostgreSQL │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │   Redis   │  │    │  │   Redis   │  │    │  │   Redis   │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Local Development Setup

```bash
# Clone repository
git clone <repository-url>
cd binaai_ai

# Install dependencies
npm install

# Generate environment configurations
npm run env:generate all

# Start with Docker
npm run docker:up

# Setup database
npm run db:setup

# Start development server
npm run dev
```

### 2. Environment-Specific Setup

```bash
# Development
npm run db:setup
npm run dev

# Test
NODE_ENV=test npm run db:setup
NODE_ENV=test npm run dev

# Staging
npm run deploy staging

# Production
npm run deploy production
```

## 📁 Project Structure

```
binaai_ai/
├── .github/workflows/          # GitHub Actions CI/CD
├── k8s/                        # Kubernetes configurations
├── scripts/                    # Infrastructure scripts
│   ├── db-manager.js          # Database management
│   ├── generate-env.js        # Environment configuration
│   ├── deploy.js              # Deployment automation
│   └── init-db.sql            # Database initialization
├── src/                        # Application source
├── public/                     # Static files
├── docker-compose.yml          # Docker Compose configuration
├── Dockerfile                  # Docker image definition
└── .env.*                      # Environment configurations
```

## 🗄️ Database Management

### Database Scripts

| Command | Description |
|---------|-------------|
| `npm run db:setup` | Setup database for current environment |
| `npm run db:reset` | Reset database (drop and recreate) |
| `npm run db:health` | Check database health |
| `npm run db:create` | Create database only |
| `npm run db:drop` | Drop database only |
| `npm run db:migrate` | Run migrations only |

### Database Configuration

Each environment has its own database:

- **Development**: `binaai_dev`
- **Test**: `binaai_test`
- **Staging**: `binaai_staging`
- **Production**: `binaai_prod`

### Database Schema

The application uses a single table `waitlist_signups` with the following structure:

```sql
CREATE TABLE waitlist_signups (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id uuid NOT NULL UNIQUE,
    idea text NOT NULL,
    name text,
    email text,
    user_agent text,
    source_path text,
    status text NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);
```

## 🌍 Environment Configuration

### Environment Files

- `.env.development` - Development configuration
- `.env.test` - Test configuration
- `.env.staging` - Staging configuration
- `.env.production` - Production configuration

### Configuration Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment name | `development` |
| `PORT` | Application port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://localhost:5432/binaai_dev` |
| `LOG_LEVEL` | Logging level | `debug` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### Generating Configurations

```bash
# Generate all environments
npm run env:generate all

# Generate specific environment
npm run env:generate production
```

## 🐳 Docker Deployment

### Docker Compose

The application uses Docker Compose for local development and deployment:

```yaml
services:
  postgres:    # PostgreSQL database
  redis:       # Redis cache
  app:         # Application
```

### Docker Commands

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Start all services |
| `npm run docker:down` | Stop all services |
| `npm run docker:logs` | View logs |
| `npm run docker:build` | Build images |
| `npm run docker:reset` | Reset and rebuild |

### Docker Environment Variables

```bash
# Database
POSTGRES_DB=binaai_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Application
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@postgres:5432/binaai_dev
```

## ☸️ Kubernetes Deployment

### Kubernetes Configurations

- `k8s/config-development.yaml` - Development configuration
- `k8s/config-staging.yaml` - Staging configuration
- `k8s/config-production.yaml` - Production configuration

### Deploying to Kubernetes

```bash
# Apply configurations
kubectl apply -f k8s/config-production.yaml

# Deploy application
kubectl set image deployment/binaai-production binaai=binaai:latest
```

## 🚀 Deployment Automation

### Deployment Scripts

| Command | Description |
|---------|-------------|
| `npm run deploy development` | Deploy to development |
| `npm run deploy staging` | Deploy to staging |
| `npm run deploy production` | Deploy to production |
| `npm run rollback staging` | Rollback staging |
| `npm run health production` | Health check production |

### GitHub Actions

The repository includes GitHub Actions workflows for:

- **CI/CD Pipeline**: Automated testing and deployment
- **Environment-specific deployments**: Development, staging, production
- **Health checks**: Automated health monitoring
- **Rollback capabilities**: Quick rollback on failures

### Deployment Flow

1. **Code Push** → GitHub Actions triggers
2. **Tests** → Run linting and tests
3. **Build** → Build Docker image
4. **Deploy** → Deploy to target environment
5. **Health Check** → Verify deployment
6. **Rollback** → Rollback if health check fails

## 🔧 Development Workflow

### Local Development

1. **Start services**: `npm run docker:up`
2. **Setup database**: `npm run db:setup`
3. **Start app**: `npm run dev`
4. **Make changes**: Edit code
5. **Test changes**: `npm run test`
6. **Commit changes**: `git commit`

### Environment Promotion

1. **Development** → Test locally
2. **Staging** → Deploy to staging for testing
3. **Production** → Deploy to production after approval

### Database Migrations

1. **Create migration**: Add SQL file to `src/db/migrations/`
2. **Test migration**: `npm run db:migrate`
3. **Deploy migration**: Included in deployment process

## 🏥 Monitoring and Health Checks

### Health Endpoints

- `GET /api/health` - Application health
- `GET /api/health/db` - Database health

### Health Check Scripts

```bash
# Check application health
curl http://localhost:3000/api/health

# Check database health
npm run db:health
```

### Monitoring

- **Application logs**: Structured logging with Pino
- **Database logs**: PostgreSQL logs
- **Container logs**: Docker logs
- **Health metrics**: Custom health endpoints

## 🔒 Security Considerations

### Environment Security

- **Secrets management**: Use environment variables
- **Database credentials**: Secure credential storage
- **Network security**: Proper firewall configuration
- **SSL/TLS**: HTTPS in production

### Database Security

- **User permissions**: Least privilege access
- **Connection encryption**: SSL connections
- **Data validation**: Input validation and sanitization
- **Backup security**: Encrypted backups

## 🚨 Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check if PostgreSQL is running
   - Verify DATABASE_URL configuration
   - Check network connectivity

2. **Migration failed**
   - Check database permissions
   - Verify migration SQL syntax
   - Check for conflicting migrations

3. **Docker build failed**
   - Check Dockerfile syntax
   - Verify base image availability
   - Check resource constraints

4. **Deployment failed**
   - Check environment configuration
   - Verify target environment access
   - Check resource availability

### Debug Commands

```bash
# Check database status
npm run db:health

# View application logs
npm run docker:logs

# Check container status
docker ps

# Check database connection
psql $DATABASE_URL
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
