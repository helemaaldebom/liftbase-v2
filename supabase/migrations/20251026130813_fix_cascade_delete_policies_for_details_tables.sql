/*
  # Fix CASCADE Delete Policies for Details Tables

  1. Problem
    - When deleting a dossier with CASCADE, the details tables check if the dossier exists
    - But during CASCADE, the dossier is already deleted, causing the check to fail
    - This blocks the CASCADE deletion

  2. Solution
    - Simplify DELETE policies for all details tables
    - Allow managers to delete any details record
    - This enables CASCADE deletion to work properly
    - When a dossier is deleted, all related details are automatically deleted

  3. Security
    - Only managers can explicitly delete details
    - CASCADE deletion works automatically when dossiers are deleted
    - Details cannot be deleted independently by non-managers

  4. Tables Updated
    - forklift_details
    - empty_container_handler_details
    - reachstacker_details
    - terminal_tractor_details
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can delete empty container handler details for their doss" ON empty_container_handler_details;
DROP POLICY IF EXISTS "Managers can delete forklift details" ON forklift_details;
DROP POLICY IF EXISTS "Users can delete reachstacker details for their dossiers" ON reachstacker_details;
DROP POLICY IF EXISTS "Users can delete terminal tractor details for their dossiers" ON terminal_tractor_details;

-- Create simple manager-only DELETE policies for all details tables

CREATE POLICY "Managers can delete forklift details"
  ON forklift_details
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can delete empty container handler details"
  ON empty_container_handler_details
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can delete reachstacker details"
  ON reachstacker_details
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can delete terminal tractor details"
  ON terminal_tractor_details
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );