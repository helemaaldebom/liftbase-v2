/*
  # Create Dossier Attachments Table for PDF Support

  1. New Tables
    - `dossier_attachments`
      - `id` (uuid, primary key)
      - `dossier_id` (uuid, foreign key to dossiers)
      - `file_name` (text) - Original filename
      - `file_path` (text) - Path in storage bucket
      - `file_type` (text) - MIME type (application/pdf, etc)
      - `file_size` (integer) - File size in bytes
      - `uploaded_by` (uuid, foreign key to user_profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `dossier_attachments` table
    - Add policies for authenticated users to:
      - View attachments for dossiers they can access
      - Upload attachments to dossiers they can edit
      - Delete their own attachments (managers can delete any)

  3. Storage
    - Create storage bucket for dossier attachments
    - Set up policies for authenticated users to upload/download
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
