/*
  # Allow Verkopers to Delete Photos

  1. Problem
    - Current DELETE policy only allows managers to delete photos
    - Verkopers cannot delete photos from their own dossiers via the UI
    - The "Verwijder alle foto's" button doesn't work because of RLS permissions

  2. Solution
    - Update DELETE policy to allow:
      - Managers can delete any photo
      - Verkopers can delete photos from dossiers they created
    - This allows both single photo deletion and bulk deletion ("alle foto's verwijderen")

  3. Security
    - Verkopers can only delete photos from their own dossiers
    - Managers can delete any photo
    - Storage bucket permissions remain the same (both can delete)
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Managers can delete photos" ON photos;

-- Create combined DELETE policy for managers and verkopers
CREATE POLICY "Managers and verkopers can delete photos"
  ON photos
  FOR DELETE
  TO authenticated
  USING (
    dossier_id IS NOT NULL
    AND (
      -- Managers can delete any photo
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'manager'
      )
      OR
      -- Verkopers can delete photos from their own dossiers
      EXISTS (
        SELECT 1 FROM dossiers
        WHERE dossiers.id = photos.dossier_id
        AND dossiers.created_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'verkoper'
        )
      )
    )
  );
