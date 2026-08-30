/*
  # Separate DELETE Policies for Dossiers and Marktdata

  1. Changes
    - Separate DELETE policy for managers to delete regular dossiers (is_marktdata = false)
    - Keep separate DELETE policy for authenticated users to delete marktdata (is_marktdata = true)
    - This ensures that dossiers and marktdata have separate delete permissions

  2. Security
    - Managers can ONLY delete regular dossiers (is_marktdata = false)
    - All authenticated users can ONLY delete marktdata (is_marktdata = true)
    - These policies are mutually exclusive - no overlap

  3. Notes
    - When a dossier or marktdata is deleted, all related data is automatically deleted via CASCADE:
      - forklift_details, empty_container_handler_details, etc.
      - price_history, photos, bids
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can delete marktdata" ON dossiers;
DROP POLICY IF EXISTS "Managers can delete any dossier" ON dossiers;

-- Policy for authenticated users to delete marktdata ONLY
CREATE POLICY "Authenticated users can delete marktdata"
  ON dossiers
  FOR DELETE
  TO authenticated
  USING (is_marktdata = true);

-- Policy for managers to delete regular dossiers ONLY (NOT marktdata)
CREATE POLICY "Managers can delete regular dossiers"
  ON dossiers
  FOR DELETE
  TO authenticated
  USING (
    is_marktdata = false
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );