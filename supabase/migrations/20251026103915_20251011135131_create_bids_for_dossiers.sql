/*
  # Create bids for dossiers

  1. Changes
    - Add dossier_id column to bids table
    - Update RLS policies to work with dossiers
    - Add indexes for performance

  2. Security
    - Handelaars can view and create bids for open dossiers
    - Verkopers and managers can view all bids for their dossiers
    - Only handelaars can create bids

  3. Notes
    - Bids are now linked to dossiers instead of machines
    - Existing machine_id column kept for backward compatibility
*/

-- Add dossier_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bids' AND column_name = 'dossier_id'
  ) THEN
    ALTER TABLE bids ADD COLUMN dossier_id uuid REFERENCES dossiers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Dealers can view own bids" ON bids;
DROP POLICY IF EXISTS "Dealers can create bids" ON bids;
DROP POLICY IF EXISTS "Sellers can view bids" ON bids;
DROP POLICY IF EXISTS "Managers can view all bids" ON bids;

-- Handelaars can view their own bids
CREATE POLICY "Handelaars can view own bids"
  ON bids
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'handelaar'
    AND EXISTS (
      SELECT 1 FROM dealers
      WHERE dealers.id = bids.dealer_id
      AND dealers.user_id = auth.uid()
    )
  );

-- Verkopers can view bids for their dossiers
CREATE POLICY "Verkopers can view dossier bids"
  ON bids
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'verkoper'
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = bids.dossier_id
      AND (dossiers.created_by = auth.uid() OR dossiers.assigned_to = auth.uid())
    )
  );

-- Managers can view all bids
CREATE POLICY "Managers can view all bids"
  ON bids
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  );

-- Handelaars can create bids for open dossiers
CREATE POLICY "Handelaars can create bids"
  ON bids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'handelaar'
    AND EXISTS (
      SELECT 1 FROM dealers
      WHERE dealers.id = bids.dealer_id
      AND dealers.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = bids.dossier_id
      AND dossiers.status IN ('open', 'bidding')
    )
  );

-- Handelaars can update their own bids if dossier is still open
CREATE POLICY "Handelaars can update own bids"
  ON bids
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'handelaar'
    AND EXISTS (
      SELECT 1 FROM dealers
      WHERE dealers.id = bids.dealer_id
      AND dealers.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = bids.dossier_id
      AND dossiers.status IN ('open', 'bidding')
    )
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'handelaar'
    AND EXISTS (
      SELECT 1 FROM dealers
      WHERE dealers.id = bids.dealer_id
      AND dealers.user_id = auth.uid()
    )
  );

-- Managers can update bid status
CREATE POLICY "Managers can update bids"
  ON bids
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bids_dossier_id ON bids(dossier_id);
CREATE INDEX IF NOT EXISTS idx_bids_dealer_id ON bids(dealer_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at DESC);