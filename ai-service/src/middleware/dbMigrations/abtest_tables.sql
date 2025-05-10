-- A/B Testing Tables for AI Service
-- Run this script in your Supabase SQL editor to create the tables for A/B testing

-- Table for test configurations
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  models JSONB NOT NULL, -- Array of model names to test
  traffic_percentage INTEGER NOT NULL DEFAULT 100, -- Percentage of traffic to include (0-100)
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ, -- NULL means ongoing
  metrics JSONB NOT NULL DEFAULT '{"rating": true, "processingTime": true}'::JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for user assignments to tests
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  user_id TEXT NOT NULL,
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  model TEXT NOT NULL, -- Assigned model name
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, test_id)
);

-- Table for test results
CREATE TABLE IF NOT EXISTS ab_test_results (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  model TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_user_id ON ab_test_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_test_id ON ab_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_user_id ON ab_test_results(user_id);

-- Trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ab_tests_updated_at
BEFORE UPDATE ON ab_tests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 