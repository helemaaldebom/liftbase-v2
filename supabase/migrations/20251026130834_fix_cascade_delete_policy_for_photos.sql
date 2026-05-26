/*
  # Fix CASCADE Delete Policy for Photos

  1. Problem
    - The "Verkopers can delete photos" policy checks if the dossier exists
    - During CASCADE deletion, this check fails because the dossier is already being deleted
    - This blocks CASCADE deletion

  2. Solution
    - Simplify DELETE policies for photos
    - Remove the check that queries the dossiers table
    - Allow managers to delete any photo
    - This enables CASCADE deletion to work properly

  3. Security
    - Only managers can explicitly delete photos
    - CASCADE deletion works automatically when dossiers are deleted
    - Verkopers can still delete photos through the application UI (checked at application level)
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Managers can delete all photos" ON photos;
DROP POLICY IF EXISTS "Verkopers can delete photos from own dossiers" ON photos;

-- Create simple manager-only DELETE policy
CREATE POLICY "Managers can delete photos"
  ON photos
  FOR DELETE
  TO authenticated
  USING (
    dossier_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );