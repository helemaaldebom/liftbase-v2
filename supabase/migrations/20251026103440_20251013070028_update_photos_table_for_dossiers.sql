/*
  # Update photos table for dossiers
  
  1. Changes
    - Add dossier_id column to photos table
    - Update photos table to use Supabase Storage instead of OneDrive
    - Add storage_path column for Supabase Storage bucket path
    - Make machine_id nullable for backward compatibility
    - Add RLS policies for photo access
  
  2. New Columns
    - dossier_id (uuid, references dossiers)
    - storage_path (text) - path in Supabase Storage bucket
    - filename (text) - original filename
  
  3. Security
    - Enable RLS on photos table
    - Users can view photos for dossiers they can access
    - Verkopers and managers can upload photos
*/

-- Add new columns to photos table
DO $$
BEGIN
  -- Add dossier_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'dossier_id'
  ) THEN
    ALTER TABLE photos ADD COLUMN dossier_id uuid REFERENCES dossiers(id) ON DELETE CASCADE;
  END IF;

  -- Add storage_path column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE photos ADD COLUMN storage_path text;
  END IF;

  -- Add filename column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'filename'
  ) THEN
    ALTER TABLE photos ADD COLUMN filename text;
  END IF;

  -- Make machine_id nullable
  ALTER TABLE photos ALTER COLUMN machine_id DROP NOT NULL;
  
  -- Make onedrive_url nullable (we'll use storage_path now)
  ALTER TABLE photos ALTER COLUMN onedrive_url DROP NOT NULL;
  
  -- Make onedrive_key nullable
  ALTER TABLE photos ALTER COLUMN onedrive_key DROP NOT NULL;
  
  -- Make step_key nullable
  ALTER TABLE photos ALTER COLUMN step_key DROP NOT NULL;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_photos_dossier_id ON photos(dossier_id);

-- Enable RLS on photos table
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for photos

-- Users can view photos for dossiers they have access to
CREATE POLICY "Users can view photos for accessible dossiers"
  ON photos
  FOR SELECT
  TO authenticated
  USING (
    dossier_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = photos.dossier_id
    )
  );

-- Verkopers and managers can insert photos for their dossiers
CREATE POLICY "Verkopers and managers can insert photos"
  ON photos
  FOR INSERT
  TO authenticated
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

-- Verkopers can delete photos from their dossiers
CREATE POLICY "Verkopers can delete photos from own dossiers"
  ON photos
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'verkoper'
    AND dossier_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = photos.dossier_id
      AND (dossiers.created_by = auth.uid() OR dossiers.assigned_to = auth.uid())
    )
  );

-- Managers can delete all photos
CREATE POLICY "Managers can delete all photos"
  ON photos
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
    AND dossier_id IS NOT NULL
  );