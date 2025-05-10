-- Analytics Tables for AI Service
-- Run this script in your Supabase SQL editor to create the tables for analytics

-- Table for model usage tracking
CREATE TABLE IF NOT EXISTS model_usage (
  id UUID PRIMARY KEY,
  model TEXT NOT NULL,
  message_id TEXT NOT NULL,
  user_id TEXT,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  processing_time INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for response metrics
CREATE TABLE IF NOT EXISTS response_metrics (
  id UUID PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT,
  model TEXT NOT NULL,
  processing_time INTEGER NOT NULL DEFAULT 0,
  rating INTEGER,
  intent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_model_usage_model ON model_usage(model);
CREATE INDEX IF NOT EXISTS idx_model_usage_user_id ON model_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_model_usage_created_at ON model_usage(created_at);

CREATE INDEX IF NOT EXISTS idx_response_metrics_model ON response_metrics(model);
CREATE INDEX IF NOT EXISTS idx_response_metrics_user_id ON response_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_response_metrics_created_at ON response_metrics(created_at); 