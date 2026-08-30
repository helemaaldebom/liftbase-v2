/*
  # Update RLS Policies for Marktdata Management

  1. Changes
    - Update dossiers table policies to allow verkopers to insert marktdata
    - Ensure only managers can edit/delete marktdata entries
    - Verkopers can view all marktdata
    - Managers have full access to all marktdata

  2. Important Notes
    - Verkopers can INSERT marktdata entries
    - Only managers (manager/directeur) can UPDATE or DELETE marktdata
    - All authenticated users can VIEW marktdata for reference
*/

-- Drop existing conflicting policies for dossiers if they exist
DROP POLICY IF EXISTS "Verkoper can insert marktdata" ON dossiers;
DROP POLICY IF EXISTS "Only managers can update marktdata" ON dossiers;
DROP POLICY IF EXISTS "Only managers can delete marktdata" ON dossiers;

-- Allow verkopers to insert marktdata
CREATE POLICY "Verkoper can insert marktdata"
  ON dossiers FOR INSERT
  TO authenticated
  WITH CHECK (
    is_marktdata = true
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('verkoper', 'manager', 'directeur')
    )
  );

-- Only managers can update marktdata
CREATE POLICY "Only managers can update marktdata"
  ON dossiers FOR UPDATE
  TO authenticated
  USING (
    is_marktdata = true
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'directeur')
    )
  )
  WITH CHECK (
    is_marktdata = true
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'directeur')
    )
  );

-- Only managers can delete marktdata
CREATE POLICY "Only managers can delete marktdata"
  ON dossiers FOR DELETE
  TO authenticated
  USING (
    is_marktdata = true
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'directeur')
    )
  );

-- Update photos table policies to support marktdata photos
DROP POLICY IF EXISTS "Users can upload photos for marktdata" ON photos;
CREATE POLICY "Users can upload photos for marktdata"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if the dossier is marktdata and user is verkoper/manager
    EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = photos.dossier_id
      AND dossiers.is_marktdata = true
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('verkoper', 'manager', 'directeur')
    )
  );
