/*
  # Add Photo Reordering Support

  1. Changes
    - Add RLS policy to allow authenticated users to update display_order of photos
    - This enables users to reorder photos in their dossiers

  2. Security
    - Policy ensures users can only update photos for dossiers they have access to
*/

-- Add policy to allow updating display_order for photos
CREATE POLICY "Users can update photo order for accessible dossiers"
  ON photos
  FOR UPDATE
  TO authenticated
  USING (
    dossier_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = photos.dossier_id
    )
  )
  WITH CHECK (
    dossier_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = photos.dossier_id
    )
  );
