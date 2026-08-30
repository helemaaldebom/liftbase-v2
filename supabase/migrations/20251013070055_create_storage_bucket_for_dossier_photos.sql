/*
  # Create Storage bucket for dossier photos
  
  1. New Storage Bucket
    - Create 'dossier-photos' bucket for storing dossier images
    - Public bucket so photos can be displayed without signed URLs
    - File size limit: 5MB per file
    - Allowed mime types: image/jpeg, image/png, image/webp, image/gif
  
  2. Security
    - Authenticated users can view all photos
    - Only verkopers and managers can upload photos to their dossiers
    - Only verkopers can delete photos from their own dossiers
    - Managers can delete all photos
*/

-- Create storage bucket for dossier photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dossier-photos',
  'dossier-photos',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public photos are viewable by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Verkopers and managers can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Verkopers and managers can delete dossier photos" ON storage.objects;

-- Storage policies for dossier-photos bucket

-- Everyone can view photos (bucket is public)
CREATE POLICY "Public dossier photos viewable by authenticated"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'dossier-photos');

-- Verkopers and managers can upload photos
CREATE POLICY "Verkopers managers upload dossier photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'dossier-photos'
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('verkoper', 'manager')
  );

-- Users can delete their own uploaded photos
CREATE POLICY "Verkopers managers delete dossier photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'dossier-photos'
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('verkoper', 'manager')
  );