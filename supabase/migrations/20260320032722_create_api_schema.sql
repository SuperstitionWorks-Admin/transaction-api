/*
  # Transaction Categorization API Schema

  1. New Tables
    - `api_keys`
      - `id` (uuid, primary key)
      - `name` (text) - Descriptive name for the API key
      - `key_hash` (text, unique) - Hashed API key for security
      - `is_active` (boolean) - Whether the key is active
      - `monthly_limit` (integer) - Monthly request limit
      - `created_at` (timestamptz) - When the key was created

    - `api_usage`
      - `id` (uuid, primary key)
      - `api_key_id` (uuid, foreign key) - References api_keys
      - `endpoint` (text) - API endpoint called
      - `request_count` (integer) - Number of transactions processed
      - `created_at` (timestamptz) - When the request was made

    - `categorization_logs`
      - `id` (uuid, primary key)
      - `api_key_id` (uuid, foreign key) - References api_keys
      - `original_text` (text) - Original transaction description
      - `normalized_text` (text) - Normalized transaction text
      - `merchant` (text) - Identified merchant
      - `category` (text) - Assigned category
      - `confidence` (numeric) - Confidence score
      - `created_at` (timestamptz) - When the categorization occurred

  2. Security
    - Enable RLS on all tables
    - Add policies for service role access only
    - API keys are hashed before storage

  3. Indexes
    - Index on key_hash for fast lookups
    - Index on api_key_id for usage queries
    - Index on created_at for time-based queries
*/

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text UNIQUE NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  monthly_limit integer DEFAULT 1000 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create api_usage table
CREATE TABLE IF NOT EXISTS api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create categorization_logs table
CREATE TABLE IF NOT EXISTS categorization_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE NOT NULL,
  original_text text NOT NULL,
  normalized_text text NOT NULL,
  merchant text NOT NULL,
  category text NOT NULL,
  confidence numeric NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key_id ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_categorization_logs_api_key_id ON categorization_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_categorization_logs_created_at ON categorization_logs(created_at);

-- Enable Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
-- These policies allow the service role (used by the API) to access all data
CREATE POLICY "Service role can manage api_keys"
  ON api_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage api_usage"
  ON api_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage categorization_logs"
  ON categorization_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
