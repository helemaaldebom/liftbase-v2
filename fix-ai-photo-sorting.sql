-- Fix AI Photo Sorting
-- Run this SQL in your Supabase SQL Editor

-- Add UPDATE policy for photos table so AI sorting can work
CREATE POLICY IF NOT EXISTS "Verkopers and managers can update photos"
  ON photos
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('verkoper', 'manager')
    AND dossier_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = photos.dossier_id
      AND (dossiers.created_by = auth.uid()
           OR dossiers.assigned_to = auth.uid()
           OR (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager')
    )
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('verkoper', 'manager')
    AND dossier_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = photos.dossier_id
      AND (dossiers.created_by = auth.uid()
           OR dossiers.assigned_to = auth.uid()
           OR (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager')
    )
  );
