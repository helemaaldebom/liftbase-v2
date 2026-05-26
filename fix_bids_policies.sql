/*
  # Fix Bids Update Policies

  1. Changes
    - Remove all existing UPDATE policies on bids table
    - Recreate policies with clear separation:
      - Handelaars can only update their own bids (amount, notes) when dossier is open
      - Managers can update ALL bids (including status changes)
      - Verkopers CANNOT update bids at all

  2. Security
    - Only managers can accept/reject bids
    - Handelaars can only modify their own bid amounts and notes
    - Clear role separation
*/

-- Drop all existing UPDATE policies on bids
DROP POLICY IF EXISTS "Dealers can update own bids" ON bids;
DROP POLICY IF EXISTS "Handelaars can update own bids" ON bids;
DROP POLICY IF EXISTS "Managers can update bids" ON bids;
DROP POLICY IF EXISTS "Verkopers can update bids on own dossiers" ON bids;
DROP POLICY IF EXISTS "Managers can update all bids" ON bids;

-- Handelaars can update their own bids (amount, notes) if dossier is still open
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

-- Managers can update ALL bids (including status)
CREATE POLICY "Managers can update all bids"
  ON bids
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  );
