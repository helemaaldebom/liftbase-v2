/*
  # Fix Bids RLS Policies
  
  1. Problem
    - Manager update policy has inconsistent EXISTS usage
    - Duplicate dealer policies that may cause issues
    - get_dealer_id() function may cause recursion
  
  2. Solution
    - Clean up all bid policies
    - Use simple, direct checks without recursion
    - Ensure managers can always update bids
  
  3. Security
    - Managers can view, create, update, and delete all bids
    - Verkopers can view bids for their dossiers
    - Dealers can view and update only their own bids
*/

-- Drop all existing bid policies
DROP POLICY IF EXISTS "Dealers can read own bids" ON bids;
DROP POLICY IF EXISTS "Dealers can update own bids" ON bids;
DROP POLICY IF EXISTS "Dealers can update their own bids" ON bids;
DROP POLICY IF EXISTS "Dealers can view their own bids" ON bids;
DROP POLICY IF EXISTS "Handelaars can create bids" ON bids;
DROP POLICY IF EXISTS "Handelaars can update own bids" ON bids;
DROP POLICY IF EXISTS "Handelaars can view own bids" ON bids;
DROP POLICY IF EXISTS "Managers can create bids for dealers" ON bids;
DROP POLICY IF EXISTS "Managers can delete bids" ON bids;
DROP POLICY IF EXISTS "Managers can update bids" ON bids;
DROP POLICY IF EXISTS "Managers can view all bids" ON bids;
DROP POLICY IF EXISTS "Verkopers can view dossier bids" ON bids;

-- Manager policies (full access)
CREATE POLICY "Managers can view all bids"
  ON bids
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can create bids"
  ON bids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can update bids"
  ON bids
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can delete bids"
  ON bids
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

-- Verkoper policies (can view bids for their dossiers)
CREATE POLICY "Verkopers can view dossier bids"
  ON bids
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'verkoper'
    )
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = bids.dossier_id
      AND dossiers.created_by = auth.uid()
    )
  );

-- Dealer policies (can view and update their own bids)
-- Using user_profiles.dealer_id instead of recursive function
CREATE POLICY "Dealers can view own bids"
  ON bids
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.dealer_id = bids.dealer_id
    )
  );

CREATE POLICY "Dealers can update own bids"
  ON bids
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.dealer_id = bids.dealer_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.dealer_id = bids.dealer_id
    )
  );
