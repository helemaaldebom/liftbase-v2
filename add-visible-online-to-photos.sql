/*
  # Add Online Visibility Control to Photos

  Dit script voegt een veld toe om te bepalen of een foto online zichtbaar mag zijn
  en voegt de benodigde UPDATE policy toe.

  1. Changes
    - Add `visible_online` column to photos table
    - Add UPDATE policy for verkopers and managers
    - Allows marking individual photos as visible/hidden for online publication
    - Defaults to true to maintain current behavior for existing photos

  2. Notes
    - This field controls whether a photo should be included in online listings (Mascus, Forklift International, etc.)
    - Existing photos will automatically be set to visible
    - Users can toggle this per photo for privacy or quality control

  INSTRUCTIES:
  1. Open Supabase Dashboard -> SQL Editor
  2. Plak deze SQL en klik op "Run"
*/

-- Add visible_online column to photos table
ALTER TABLE photos
ADD COLUMN IF NOT EXISTS visible_online boolean DEFAULT true NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN photos.visible_online IS 'Controls whether this photo should be visible in online publications and listings';

-- Add UPDATE policy for verkopers and managers
DROP POLICY IF EXISTS "Verkopers and managers can update photos" ON photos;

CREATE POLICY "Verkopers and managers can update photos"
  ON photos
  FOR UPDATE
  TO authenticated
  USING (
    dossier_id IS NOT NULL AND
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('verkoper', 'manager')
  )
  WITH CHECK (
    dossier_id IS NOT NULL AND
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('verkoper', 'manager')
  );
