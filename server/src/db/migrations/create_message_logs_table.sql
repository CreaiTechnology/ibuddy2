-- Create message_logs table for storing auto-reply interactions
CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  sender JSONB NOT NULL,
  response JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS message_logs_timestamp_idx ON message_logs(timestamp);
CREATE INDEX IF NOT EXISTS message_logs_platform_idx ON message_logs(platform);
CREATE INDEX IF NOT EXISTS message_logs_text_idx ON message_logs USING gin(to_tsvector('english', text));

-- Add comment to the table
COMMENT ON TABLE message_logs IS 'Stores all incoming messages and their auto-reply responses'; 