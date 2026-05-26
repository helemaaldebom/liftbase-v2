/*
  # Update Dealers Policy - Manager Only

  1. Purpose
    - Restrict dealer management to managers only
    - Verkopers can still view dealers but cannot add, edit or delete

  2. Changes
    - Drop existing "Managers can manage dealers" policy
    - Create separate policies for different operations:
      - SELECT: Both verkoper and manager can view
      - INSERT/UPDATE/DELETE: Only manager can modify

  3. Security
    - Maintains read access for verkopers
    - Restricts write access to managers only
*/

-- Drop the existing policy that allowed both verkoper and manager
DROP POLICY IF EXISTS "Managers can manage dealers" ON dealers;

-- Allow verkoper and manager to view dealers
CREATE POLICY "Verkoper and manager can view dealers"
  ON dealers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('verkoper', 'manager')
    )
  );

-- Only managers can insert dealers
CREATE POLICY "Only managers can insert dealers"
  ON dealers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

-- Only managers can update dealers
CREATE POLICY "Only managers can update dealers"
  ON dealers
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

-- Only managers can delete dealers
CREATE POLICY "Only managers can delete dealers"
  ON dealers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );
