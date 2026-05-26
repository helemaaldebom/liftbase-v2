/*
  # Fix Document Upload System

  1. Storage Bucket
    - Recreate 'dossier-documents' bucket with correct settings
    - 50MB file size limit
    - PDF, Excel (.xlsx, .xls), Word (.docx, .doc) support

  2. Storage Policies
    - Fix policies with unique names
    - Allow authenticated users to upload
    - Allow authenticated users to read
    - Allow users to delete their own files
    - Allow managers to delete any file

  3. Database Table
    - Ensure documents table exists with correct structure
    - RLS policies for authenticated users
*/

-- Drop existing storage policies for dossier-documents bucket
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Managers can delete any document" ON storage.objects;

-- Drop policies with different names that might exist
DROP POLICY IF EXISTS "dossier_documents_upload" ON storage.objects;
DROP POLICY IF EXISTS "dossier_documents_read" ON storage.objects;
DROP POLICY IF EXISTS "dossier_documents_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "dossier_documents_delete_manager" ON storage.objects;

-- Ensure the bucket exists (will not fail if it already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dossier-documents',
  'dossier-documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];

-- Create storage policies with unique names
CREATE POLICY "dossier_documents_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dossier-documents');

CREATE POLICY "dossier_documents_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'dossier-documents');

CREATE POLICY "dossier_documents_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'dossier-documents')
  WITH CHECK (bucket_id = 'dossier-documents');

CREATE POLICY "dossier_documents_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'dossier-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'manager'
      )
    )
  );

-- Ensure documents table exists
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  display_order integer DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing table policies
DROP POLICY IF EXISTS "Authenticated users can view documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
DROP POLICY IF EXISTS "Managers can delete any document" ON documents;

-- Create table policies
CREATE POLICY "Authenticated users can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    auth.uid() = uploaded_by
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_documents_dossier_id ON documents(dossier_id);
CREATE INDEX IF NOT EXISTS idx_documents_display_order ON documents(dossier_id, display_order);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
