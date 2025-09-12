-- Database initialization script for Docker
-- This script runs when the PostgreSQL container starts

-- Create databases for different environments
CREATE DATABASE binaai_dev;
CREATE DATABASE binaai_test;
CREATE DATABASE binaai_prod;

-- Create application user
CREATE USER binaai_user WITH PASSWORD 'binaai_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE binaai_dev TO binaai_user;
GRANT ALL PRIVILEGES ON DATABASE binaai_test TO binaai_user;
GRANT ALL PRIVILEGES ON DATABASE binaai_prod TO binaai_user;

-- Connect to development database and set up schema
\c binaai_dev;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the waitlist_signups table
CREATE TABLE IF NOT EXISTS waitlist_signups (
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

-- Add trigger to automatically update updated_at column
DROP TRIGGER IF EXISTS update_waitlist_signups_updated_at ON waitlist_signups;
CREATE TRIGGER update_waitlist_signups_updated_at
    BEFORE UPDATE ON waitlist_signups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_signups(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_client_id ON waitlist_signups(client_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_signups(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist_signups(created_at);

-- Add check constraints for data validation
ALTER TABLE waitlist_signups 
ADD CONSTRAINT check_status_valid 
CHECK (status IN ('draft', 'submitted', 'processed', 'archived'));

ALTER TABLE waitlist_signups 
ADD CONSTRAINT check_idea_not_empty 
CHECK (length(trim(idea)) > 0);

-- Grant permissions to application user
GRANT SELECT, INSERT, UPDATE, DELETE ON waitlist_signups TO binaai_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO binaai_user;

-- Repeat for test database
\c binaai_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS waitlist_signups (
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

DROP TRIGGER IF EXISTS update_waitlist_signups_updated_at ON waitlist_signups;
CREATE TRIGGER update_waitlist_signups_updated_at
    BEFORE UPDATE ON waitlist_signups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_signups(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_client_id ON waitlist_signups(client_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_signups(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist_signups(created_at);

ALTER TABLE waitlist_signups 
ADD CONSTRAINT check_status_valid 
CHECK (status IN ('draft', 'submitted', 'processed', 'archived'));

ALTER TABLE waitlist_signups 
ADD CONSTRAINT check_idea_not_empty 
CHECK (length(trim(idea)) > 0);

GRANT SELECT, INSERT, UPDATE, DELETE ON waitlist_signups TO binaai_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO binaai_user;

-- Repeat for production database
\c binaai_prod;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS waitlist_signups (
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

DROP TRIGGER IF EXISTS update_waitlist_signups_updated_at ON waitlist_signups;
CREATE TRIGGER update_waitlist_signups_updated_at
    BEFORE UPDATE ON waitlist_signups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_signups(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_client_id ON waitlist_signups(client_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_signups(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist_signups(created_at);

ALTER TABLE waitlist_signups 
ADD CONSTRAINT check_status_valid 
CHECK (status IN ('draft', 'submitted', 'processed', 'archived'));

ALTER TABLE waitlist_signups 
ADD CONSTRAINT check_idea_not_empty 
CHECK (length(trim(idea)) > 0);

GRANT SELECT, INSERT, UPDATE, DELETE ON waitlist_signups TO binaai_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO binaai_user;
