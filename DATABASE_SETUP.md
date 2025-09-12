# Database Setup Guide

## Prerequisites

1. **PostgreSQL** installed on your system
2. **Node.js** (version 16 or higher)
3. **npm** or **yarn** package manager

## Step 1: Install PostgreSQL

### macOS (using Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

## Step 2: Create Database and User

Connect to PostgreSQL as the superuser:

```bash
# Connect to PostgreSQL
psql -U postgres

# Or on macOS with Homebrew
psql postgres
```

Run these SQL commands:

```sql
-- Create database
CREATE DATABASE binaai_dev;

-- Create user (optional, you can use your system user)
CREATE USER binaai_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE binaai_dev TO binaai_user;

-- Exit PostgreSQL
\q
```

## Step 3: Environment Configuration

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
# Environment Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL=postgres://binaai_user:your_secure_password@localhost:5432/binaai_dev

# Logging
LOG_LEVEL=debug
```

## Step 4: Run Database Migrations

```bash
# Install dependencies
npm install

# Run migrations to create tables
npm run migrate
```

## Step 5: Verify Setup

```bash
# Start the development server
npm run dev
```

The server should start without database connection errors.

## Database Schema

The migration creates the following table:

- **waitlist_signups**: Stores user signup data
  - `id`: Primary key (UUID)
  - `client_id`: Unique client identifier (UUID)
  - `idea`: User's app idea (text)
  - `name`: User's name (text)
  - `email`: User's email (text, unique)
  - `source_path`: Where the signup came from (text)
  - `user_agent`: Browser information (text)
  - `status`: Signup status ('draft' or 'submitted')
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

## Troubleshooting

### Connection Issues
- Verify PostgreSQL is running: `brew services list | grep postgresql`
- Check database exists: `psql -U postgres -l | grep binaai`
- Verify credentials in `.env` file

### Migration Issues
- Check database permissions
- Ensure database exists before running migrations
- Check logs for specific error messages

### Production Setup
For production, use environment variables or a managed database service:

```env
DATABASE_URL=postgres://username:password@hostname:5432/binaai_prod
NODE_ENV=production
LOG_LEVEL=info
```
