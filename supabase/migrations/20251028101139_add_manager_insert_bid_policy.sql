/*
  # Allow managers to create bids on behalf of dealers

  1. Changes
    - Add INSERT policy for managers to create bids for any dealer
    - This allows managers to invite dealers to bid on dossiers
  
  2. Security
    - Only users with role 'manager' can create bids for dealers
    - Existing policies for dealers remain unchanged
*/

-- Allow managers to create bids on behalf of dealers
CREATE POLICY "Managers can create bids for dealers"
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
