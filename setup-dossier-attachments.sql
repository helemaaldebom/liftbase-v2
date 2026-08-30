/*
  # Create Dossier Attachments System

  Run this SQL in your Supabase SQL editor to set up the document attachment system.

  This creates:
  1. The dossier_attachments table
  2. RLS policies for secure access
  3. The storage bucket for files
  4. Storage policies for file operations
*/

-- Create attachments table
CREATE TABLE IF NOT EXISTS dossier_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE dossier_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view attachments for accessible dossiers" ON dossier_attachments;
DROP POLICY IF EXISTS "Users can upload attachments to editable dossiers" ON dossier_attachments;
DROP POLICY IF EXISTS "Users can delete own attachments, managers can delete any" ON dossier_attachments;

-- Policy: Users can view attachments for dossiers they can access
CREATE POLICY "Users can view attachments for accessible dossiers"
  ON dossier_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = dossier_attachments.dossier_id
      AND (
        dossiers.is_marktdata = true
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('manager', 'verkoper', 'eindgebruiker')
        )
      )
    )
  );

-- Policy: Authenticated users can insert attachments for dossiers they can edit
CREATE POLICY "Users can upload attachments to editable dossiers"
  ON dossier_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = dossier_attachments.dossier_id
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('manager', 'verkoper')
      )
    )
  );

-- Policy: Users can delete their own attachments, managers can delete any
CREATE POLICY "Users can delete own attachments, managers can delete any"
  ON dossier_attachments
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

-- Create storage bucket for dossier attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('dossier-attachments', 'dossier-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own attachments storage" ON storage.objects;

-- Storage policy: Authenticated users can upload attachments
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dossier-attachments');

-- Storage policy: Authenticated users can view attachments
CREATE POLICY "Authenticated users can view attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'dossier-attachments');

-- Storage policy: Users can delete their own attachments, managers can delete any
CREATE POLICY "Users can delete own attachments storage"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'dossier-attachments'
    AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'manager'
      )
    )
  );

-- Create trigger to update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_dossier_attachments_updated_at'
  ) THEN
    CREATE TRIGGER update_dossier_attachments_updated_at
      BEFORE UPDATE ON dossier_attachments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
