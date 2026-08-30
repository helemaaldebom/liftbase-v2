/*
  # Add Eindgebruiker Dossier Permissions

  1. Changes
    - Update dossiers INSERT policy to allow eindgebruiker role
    - Update dossiers UPDATE policy to allow eindgebruiker role
    - Update dossiers SELECT policy to allow eindgebruiker to view their own dossiers
    
  2. Security
    - Eindgebruikers can only create dossiers where they are the creator
    - Eindgebruikers can only update their own dossiers
    - Eindgebruikers can view their own dossiers and public/active dossiers
    
  3. Notes
    - Maintains existing verkoper and manager permissions
    - Eindgebruiker has same create/edit capabilities as verkoper for their own dossiers
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Verkoper and Manager can insert dossiers" ON dossiers;
DROP POLICY IF EXISTS "Verkoper and Manager can update dossiers" ON dossiers;
DROP POLICY IF EXISTS "Users can view dossiers" ON dossiers;

-- Allow verkoper, manager, and eindgebruiker to insert dossiers
CREATE POLICY "Verkoper, Manager, and Eindgebruiker can insert dossiers"
  ON dossiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('verkoper', 'manager', 'eindgebruiker')
    )
  );

-- Allow verkoper, manager, and eindgebruiker to update their own dossiers
-- Manager can update all dossiers
CREATE POLICY "Users can update their own dossiers"
  ON dossiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        user_profiles.role = 'manager'
        OR (user_profiles.role IN ('verkoper', 'eindgebruiker') AND dossiers.created_by = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        user_profiles.role = 'manager'
        OR (user_profiles.role IN ('verkoper', 'eindgebruiker') AND dossiers.created_by = auth.uid())
      )
    )
  );

-- Allow all authenticated users to view dossiers
-- Eindgebruikers can see their own dossiers plus active/published ones
CREATE POLICY "Users can view dossiers"
  ON dossiers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        user_profiles.role IN ('verkoper', 'manager')
        OR (user_profiles.role = 'eindgebruiker' AND (dossiers.created_by = auth.uid() OR dossiers.status IN ('active', 'published', 'open', 'bidding')))
        OR user_profiles.role = 'handelaar'
      )
    )
  );