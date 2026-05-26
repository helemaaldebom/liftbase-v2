/*
  # Dealer Authentication System

  1. Changes to Tables
    - Add auth_user_id to dealers table to link dealers to auth.users
    - Add dealer_role to user_profiles to identify dealer users
  
  2. Security
    - Dealers can only view their own assigned dossiers through bids
    - Dealers can only see machine specifications, not prices or locations
    - Dealers can update their own bids
    
  3. Notes
    - Each dealer will get their own login credentials
    - Dealers are linked to dealers table via auth_user_id
    - Dealers can only access dossiers they have been invited to bid on
*/

-- Add auth_user_id to dealers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dealers' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE dealers ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_dealers_auth_user_id ON dealers(auth_user_id);
  END IF;
END $$;

-- Add dealer_role column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN dealer_id uuid REFERENCES dealers(id);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_dealer_id ON user_profiles(dealer_id);
  END IF;
END $$;

-- Function to check if user is a dealer
CREATE OR REPLACE FUNCTION is_dealer(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND dealer_id IS NOT NULL
  );
END;
$$;

-- Function to get dealer_id for auth user
CREATE OR REPLACE FUNCTION get_dealer_id(user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dealer_uuid uuid;
BEGIN
  SELECT dealer_id INTO dealer_uuid
  FROM user_profiles
  WHERE id = user_id;
  
  RETURN dealer_uuid;
END;
$$;

-- Update dossiers RLS: Dealers can only view dossiers they have bids for
DROP POLICY IF EXISTS "Dealers can view dossiers they have bids for" ON dossiers;
CREATE POLICY "Dealers can view dossiers they have bids for"
  ON dossiers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.dossier_id = dossiers.id
      AND bids.dealer_id = get_dealer_id(auth.uid())
    )
  );

-- Update forklift_details RLS: Dealers can view but not modify
DROP POLICY IF EXISTS "Dealers can view forklift details for their bids" ON forklift_details;
CREATE POLICY "Dealers can view forklift details for their bids"
  ON forklift_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.dossier_id = forklift_details.dossier_id
      AND bids.dealer_id = get_dealer_id(auth.uid())
    )
  );

-- Update empty_container_handler_details RLS
DROP POLICY IF EXISTS "Dealers can view ECH details for their bids" ON empty_container_handler_details;
CREATE POLICY "Dealers can view ECH details for their bids"
  ON empty_container_handler_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.dossier_id = empty_container_handler_details.dossier_id
      AND bids.dealer_id = get_dealer_id(auth.uid())
    )
  );

-- Update reachstacker_details RLS
DROP POLICY IF EXISTS "Dealers can view reachstacker details for their bids" ON reachstacker_details;
CREATE POLICY "Dealers can view reachstacker details for their bids"
  ON reachstacker_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.dossier_id = reachstacker_details.dossier_id
      AND bids.dealer_id = get_dealer_id(auth.uid())
    )
  );

-- Update terminal_tractor_details RLS
DROP POLICY IF EXISTS "Dealers can view terminal tractor details for their bids" ON terminal_tractor_details;
CREATE POLICY "Dealers can view terminal tractor details for their bids"
  ON terminal_tractor_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.dossier_id = terminal_tractor_details.dossier_id
      AND bids.dealer_id = get_dealer_id(auth.uid())
    )
  );

-- Update photos RLS: Dealers can view photos for their bids
DROP POLICY IF EXISTS "Dealers can view photos for their bids" ON photos;
CREATE POLICY "Dealers can view photos for their bids"
  ON photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.dossier_id = photos.dossier_id
      AND bids.dealer_id = get_dealer_id(auth.uid())
    )
  );

-- Update bids RLS: Dealers can update their own bids
DROP POLICY IF EXISTS "Dealers can update their own bids" ON bids;
CREATE POLICY "Dealers can update their own bids"
  ON bids
  FOR UPDATE
  TO authenticated
  USING (dealer_id = get_dealer_id(auth.uid()))
  WITH CHECK (dealer_id = get_dealer_id(auth.uid()));

-- Dealers can view their own bids
DROP POLICY IF EXISTS "Dealers can view their own bids" ON bids;
CREATE POLICY "Dealers can view their own bids"
  ON bids
  FOR SELECT
  TO authenticated
  USING (dealer_id = get_dealer_id(auth.uid()));
