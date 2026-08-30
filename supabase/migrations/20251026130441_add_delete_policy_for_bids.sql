/*
  # Add DELETE Policy for Bids

  1. Changes
    - Add DELETE policy for managers to delete bids
    - This is required for CASCADE deletion when a dossier is deleted

  2. Security
    - Only managers can explicitly delete bids
    - When a dossier is deleted, bids are automatically deleted via CASCADE
    - RLS must allow this CASCADE deletion to work

  3. Notes
    - Without this policy, CASCADE deletion from dossiers would fail
    - This policy enables proper cleanup of related data
*/

-- Create policy for managers to delete bids
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