/*
  # Fix Photo Upload Permissions

  Dit script lost het probleem op waarbij foto uploads mislukken.

  1. Updates
    - Allow eindgebruikers to upload photos to their own dossiers
    - Update storage policy to include eindgebruiker role
    - Update photos table policy to allow eindgebruikers

  2. Security
    - Verkopers can upload to their own and assigned dossiers
    - Eindgebruikers can upload to their own dossiers
    - Managers can upload to any dossier

  INSTRUCTIES:
  1. Open Supabase Dashboard -> SQL Editor
  2. Plak deze SQL en klik op "Run"
*/

-- Fix photos table policy
DROP POLICY IF EXISTS "Verkopers and managers can insert photos" ON photos;
DROP POLICY IF EXISTS "Users can insert photos for their dossiers" ON photos;

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

-- Fix storage policy
DROP POLICY IF EXISTS "Verkopers managers upload dossier photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload dossier photos" ON storage.objects;

CREATE POLICY "Users can upload dossier photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'dossier-photos'
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('verkoper', 'manager', 'eindgebruiker')
  );
