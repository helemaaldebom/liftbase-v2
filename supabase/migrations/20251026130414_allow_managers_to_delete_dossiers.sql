/*
  # Allow Managers to Delete All Dossiers

  1. Changes
    - Add DELETE policy for managers to delete any dossier (both regular and marktdata)
    - This allows managers to clean up test data and remove dossiers when needed

  2. Security
    - Only users with role 'manager' can delete dossiers
    - Verkoper and inkoper users cannot delete dossiers
    - When a dossier is deleted, all related data is automatically deleted via CASCADE:
      - forklift_details
      - empty_container_handler_details
      - reachstacker_details
      - terminal_tractor_details
      - price_history
      - photos
      - bids

  3. Notes
    - This policy works alongside the existing marktdata delete policy
    - Existing policy allows authenticated users to delete marktdata
    - New policy allows managers to delete any dossier
*/

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Authenticated users can delete marktdata" ON dossiers;

-- Create policy for authenticated users to delete marktdata
CREATE POLICY "Authenticated users can delete marktdata"
  ON dossiers
  FOR DELETE
  TO authenticated
  USING (is_marktdata = true);

-- Create policy for managers to delete any dossier
CREATE POLICY "Managers can delete any dossier"
  ON dossiers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );