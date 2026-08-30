/*
  # Update Forklift Details Permissions for Eindgebruiker

  1. Changes
    - Update forklift_details policies to include eindgebruiker
    - Allow eindgebruiker to create, update, and delete forklift details for their own dossiers
    
  2. Security
    - Eindgebruikers can only manage details for dossiers they created
    - Managers maintain full access
*/

-- Drop and recreate the create policy
DROP POLICY IF EXISTS "Verkopers and managers can create forklift details" ON forklift_details;

CREATE POLICY "Verkopers, managers, and eindgebruikers can create forklift details"
  ON forklift_details FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dossiers
      JOIN user_profiles ON user_profiles.id = auth.uid()
      WHERE dossiers.id = forklift_details.dossier_id
      AND user_profiles.role IN ('verkoper', 'manager', 'eindgebruiker')
      AND (user_profiles.role = 'manager' OR dossiers.created_by = auth.uid())
    )
  );

-- Drop and recreate the update policy  
DROP POLICY IF EXISTS "Verkopers can update forklift details for own dossiers" ON forklift_details;

CREATE POLICY "Verkopers and eindgebruikers can update forklift details for own dossiers"
  ON forklift_details FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dossiers
      JOIN user_profiles ON user_profiles.id = auth.uid()
      WHERE dossiers.id = forklift_details.dossier_id
      AND user_profiles.role IN ('verkoper', 'eindgebruiker')
      AND dossiers.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dossiers
      JOIN user_profiles ON user_profiles.id = auth.uid()
      WHERE dossiers.id = forklift_details.dossier_id
      AND user_profiles.role IN ('verkoper', 'eindgebruiker')
      AND dossiers.created_by = auth.uid()
    )
  );

-- Drop and recreate the delete policy
DROP POLICY IF EXISTS "Managers can delete forklift details" ON forklift_details;

CREATE POLICY "Managers and owners can delete forklift details"
  ON forklift_details FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dossiers
      JOIN user_profiles ON user_profiles.id = auth.uid()
      WHERE dossiers.id = forklift_details.dossier_id
      AND (
        user_profiles.role = 'manager'
        OR (user_profiles.role IN ('verkoper', 'eindgebruiker') AND dossiers.created_by = auth.uid())
      )
    )
  );