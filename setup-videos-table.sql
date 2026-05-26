-- Manual setup script for videos table and storage
-- Run this in your Supabase SQL Editor if the automatic migration didn't work

-- Drop existing table if it exists (to recreate with correct structure)
DROP TABLE IF EXISTS videos CASCADE;

-- Create videos table
CREATE TABLE videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  filename text NOT NULL,
  file_size_bytes bigint NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Policies for videos
DROP POLICY IF EXISTS "Users can view videos for dossiers they can access" ON videos;
CREATE POLICY "Users can view videos for dossiers they can access"
  ON videos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = videos.dossier_id
    )
  );

DROP POLICY IF EXISTS "Verkoper and manager can insert videos" ON videos;
CREATE POLICY "Verkoper and manager can insert videos"
  ON videos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('verkoper', 'manager')
    )
  );

DROP POLICY IF EXISTS "Verkoper and manager can update videos" ON videos;
CREATE POLICY "Verkoper and manager can update videos"
  ON videos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('verkoper', 'manager')
    )
  );

DROP POLICY IF EXISTS "Verkoper and manager can delete videos" ON videos;
CREATE POLICY "Verkoper and manager can delete videos"
  ON videos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('verkoper', 'manager')
    )
  );

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('dossier-videos', 'dossier-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for videos bucket
DROP POLICY IF EXISTS "Authenticated users can view videos" ON storage.objects;
CREATE POLICY "Authenticated users can view videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'dossier-videos');

DROP POLICY IF EXISTS "Verkoper and manager can upload videos" ON storage.objects;
CREATE POLICY "Verkoper and manager can upload videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'dossier-videos'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('verkoper', 'manager')
    )
  );

DROP POLICY IF EXISTS "Verkoper and manager can delete videos" ON storage.objects;
CREATE POLICY "Verkoper and manager can delete videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'dossier-videos'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('verkoper', 'manager')
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_dossier_id ON videos(dossier_id);
CREATE INDEX IF NOT EXISTS idx_videos_display_order ON videos(dossier_id, display_order);
