/*
  # Fix bids policies to allow manual entry and prevent array_agg errors

  1. Changes
    - Optimize RLS policies for bids table
    - Remove potentially problematic subqueries
    - Ensure proper policy structure for INSERT and SELECT operations

  2. Security
    - Managers can view and create all bids
    - Verkopers can view and create bids for their dossiers
    - Dealers can view and update their own bids
    - Eindgebruikers can create bids for their dossiers

  3. Notes
    - This fixes the array_agg error by simplifying policy queries
    - All existing functionality is preserved
    - Manual bid entry is now fully supported for all authorized roles
*/

-- Drop all existing bid policies to recreate them cleanly
DROP POLICY IF EXISTS "Managers can view all bids" ON bids;
DROP POLICY IF EXISTS "Managers can create bids" ON bids;
DROP POLICY IF EXISTS "Managers can create bids for dealers" ON bids;
DROP POLICY IF EXISTS "Managers can insert bids" ON bids;
DROP POLICY IF EXISTS "Managers can update bids" ON bids;
DROP POLICY IF EXISTS "Managers can update all bids" ON bids;
DROP POLICY IF EXISTS "Managers can delete bids" ON bids;
DROP POLICY IF EXISTS "Verkopers can view dossier bids" ON bids;
DROP POLICY IF EXISTS "Verkopers can view their dossier bids" ON bids;
DROP POLICY IF EXISTS "Verkopers can create bids for their dossiers" ON bids;
DROP POLICY IF EXISTS "Verkopers can insert bids for their dossiers" ON bids;
DROP POLICY IF EXISTS "Dealers can view own bids" ON bids;
DROP POLICY IF EXISTS "Dealers can update own bids" ON bids;
DROP POLICY IF EXISTS "Dealers can update their own bids" ON bids;
DROP POLICY IF EXISTS "Dealers can view their own bids" ON bids;
DROP POLICY IF EXISTS "Handelaars can view own bids" ON bids;
DROP POLICY IF EXISTS "Handelaars can create bids" ON bids;
DROP POLICY IF EXISTS "Handelaars can update own bids" ON bids;
DROP POLICY IF EXISTS "Eindgebruikers can view their dossier bids" ON bids;
DROP POLICY IF EXISTS "Eindgebruikers can insert bids for their dossiers" ON bids;
DROP POLICY IF EXISTS "Eindgebruikers can create bids for their dossiers" ON bids;

-- Manager policies (full access)
CREATE POLICY "Managers can view all bids"
  ON bids FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can insert bids"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can update all bids"
  ON bids FOR UPDATE
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
  ON bids FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

-- Verkoper policies
CREATE POLICY "Verkopers can view their dossier bids"
  ON bids FOR SELECT
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
      AND (dossiers.created_by = auth.uid() OR dossiers.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Verkopers can insert bids for their dossiers"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'verkoper'
    )
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = bids.dossier_id
      AND (dossiers.created_by = auth.uid() OR dossiers.assigned_to = auth.uid())
    )
  );

-- Eindgebruiker policies
CREATE POLICY "Eindgebruikers can view their dossier bids"
  ON bids FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'eindgebruiker'
    )
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = bids.dossier_id
      AND dossiers.created_by = auth.uid()
    )
  );

CREATE POLICY "Eindgebruikers can insert bids for their dossiers"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'eindgebruiker'
    )
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = bids.dossier_id
      AND dossiers.created_by = auth.uid()
    )
  );

-- Dealer policies (for dealers with user accounts)
CREATE POLICY "Dealers can view their own bids"
  ON bids FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dealers
      WHERE dealers.id = bids.dealer_id
      AND dealers.user_id = auth.uid()
    )
  );

CREATE POLICY "Dealers can update their own bids"
  ON bids FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dealers
      WHERE dealers.id = bids.dealer_id
      AND dealers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealers
      WHERE dealers.id = bids.dealer_id
      AND dealers.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bids_dossier_dealer ON bids(dossier_id, dealer_id);
CREATE INDEX IF NOT EXISTS idx_bids_created_updated ON bids(created_at DESC, updated_at DESC);
