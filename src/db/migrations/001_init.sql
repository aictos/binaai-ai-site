-- Migration 001: Create waitlist_signups table
-- Created: 2025-09-12
-- Description: Initial schema for storing waitlist signups and draft ideas

-- Enable UUID extension if not already enabled
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

-- Add comments for documentation
COMMENT ON TABLE waitlist_signups IS 'Stores waitlist signups and draft ideas from users';
COMMENT ON COLUMN waitlist_signups.id IS 'Primary key UUID';
COMMENT ON COLUMN waitlist_signups.client_id IS 'Unique client identifier for tracking user sessions';
COMMENT ON COLUMN waitlist_signups.idea IS 'User-provided idea or description';
COMMENT ON COLUMN waitlist_signups.name IS 'User name (optional)';
COMMENT ON COLUMN waitlist_signups.email IS 'User email (optional)';
COMMENT ON COLUMN waitlist_signups.user_agent IS 'Browser user agent string';
COMMENT ON COLUMN waitlist_signups.source_path IS 'Page path where signup originated';
COMMENT ON COLUMN waitlist_signups.status IS 'Status: draft, submitted, processed, etc.';
COMMENT ON COLUMN waitlist_signups.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN waitlist_signups.updated_at IS 'Last update timestamp';

-- Create check constraints for data validation
ALTER TABLE waitlist_signups 
ADD CONSTRAINT check_status_valid 
CHECK (status IN ('draft', 'submitted', 'processed', 'archived'));

ALTER TABLE waitlist_signups 
ADD CONSTRAINT check_idea_not_empty 
CHECK (length(trim(idea)) > 0);

-- Grant permissions (adjust as needed for your deployment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON waitlist_signups TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
