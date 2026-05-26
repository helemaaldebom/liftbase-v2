-- Fix Photo Upload Permissions for Eindgebruikers
-- Run this SQL in your Supabase SQL Editor

-- Drop the old policy
DROP POLICY IF EXISTS "Verkopers and managers can insert photos" ON photos;

-- Create new policy that includes eindgebruikers
CREATE POLICY "Users can insert photos for their dossiers"
  ON photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    dossier_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = photos.dossier_id
      AND (
        -- Verkopers and eindgebruikers can upload to their own dossiers
        (dossiers.created_by = auth.uid()
         AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('verkoper', 'manager', 'eindgebruiker'))
        -- Verkopers can upload to assigned dossiers
        OR (dossiers.assigned_to = auth.uid()
            AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('verkoper', 'manager'))
        -- Managers can upload to any dossier
        OR (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
      )
    )
  );

-- Also update storage policy for eindgebruikers
DROP POLICY IF EXISTS "Verkopers managers upload dossier photos" ON storage.objects;

CREATE POLICY "Users can upload dossier photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'dossier-photos'
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('verkoper', 'manager', 'eindgebruiker')
  );
