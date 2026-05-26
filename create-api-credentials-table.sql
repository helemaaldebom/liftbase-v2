-- ============================================================================
-- API Credentials Storage Table
-- ============================================================================
--
-- Run this SQL script in your Supabase SQL Editor to create the api_credentials table.
-- This allows you to store Forklift International (and other platform) API keys
-- so you don't have to enter them manually each time you publish.
--
-- How to run:
-- 1. Go to your Supabase Dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this entire script
-- 5. Click "Run" or press Cmd/Ctrl + Enter
--
-- ============================================================================

-- Create the api_credentials table
CREATE TABLE IF NOT EXISTS api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  username text NOT NULL,
  api_key text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Add comment to table
COMMENT ON TABLE api_credentials IS 'Stores API credentials for various advertisement platforms';

-- Enable Row Level Security
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Managers can view API credentials" ON api_credentials;
DROP POLICY IF EXISTS "Managers can insert API credentials" ON api_credentials;
DROP POLICY IF EXISTS "Managers can update API credentials" ON api_credentials;
DROP POLICY IF EXISTS "Service role can access API credentials" ON api_credentials;

-- Policy: Managers can view API credentials
CREATE POLICY "Managers can view API credentials"
  ON api_credentials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

-- Policy: Managers can insert API credentials
CREATE POLICY "Managers can insert API credentials"
  ON api_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

-- Policy: Managers can update API credentials
CREATE POLICY "Managers can update API credentials"
  ON api_credentials
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

-- Policy: Service role can access API credentials (for edge functions)
CREATE POLICY "Service role can access API credentials"
  ON api_credentials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_api_credentials_updated_at ON api_credentials;
CREATE TRIGGER update_api_credentials_updated_at
  BEFORE UPDATE ON api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Done!
-- You can now go to Instellingen (Settings) in your app to configure your
-- Forklift International API credentials.
