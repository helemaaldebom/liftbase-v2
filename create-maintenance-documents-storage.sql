/*
  # Create storage bucket for maintenance documents

  1. Storage Bucket
    - Creates `maintenance-documents` bucket for storing PDF maintenance documents
    - Private bucket (not publicly accessible)

  2. Security Policies
    - Managers can upload and read all maintenance documents
    - Customers can only read their own maintenance documents (documents in their customer folder)
    - Eindgebruikers can upload and read all maintenance documents (same as managers)
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-documents',
  'maintenance-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow managers to upload maintenance documents
CREATE POLICY IF NOT EXISTS "Managers can upload maintenance documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-documents' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('manager', 'eindgebruiker')
  )
);

-- Allow managers and eindgebruikers to read all maintenance documents
CREATE POLICY IF NOT EXISTS "Managers can read all maintenance documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'maintenance-documents' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('manager', 'eindgebruiker')
  )
);

-- Allow customers to read their own maintenance documents
CREATE POLICY IF NOT EXISTS "Customers can read own maintenance documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'maintenance-documents' AND
  EXISTS (
    SELECT 1 FROM customers c
    WHERE c.user_id = auth.uid()
    AND (storage.foldername(name))[1] = c.id::text
  )
);

-- Allow managers to delete maintenance documents
CREATE POLICY IF NOT EXISTS "Managers can delete maintenance documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'maintenance-documents' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'manager'
  )
);
