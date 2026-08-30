/*
  # Manager User Management Policies

  1. Purpose
    - Enable managers to fully manage user accounts
    - Allow managers to create, read, update, and delete users
    - Ensure only managers have these elevated privileges

  2. Changes
    - Add policy for managers to update any user profile
    - Add policy for managers to delete user profiles
    - These policies work in addition to existing read policy

  3. Security
    - Only users with role 'manager' can manage other users
    - All policies verify manager role before allowing actions
*/

-- Allow managers to update any user profile
CREATE POLICY "Managers can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

-- Allow managers to delete user profiles
CREATE POLICY "Managers can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

-- Allow managers to insert new user profiles
CREATE POLICY "Managers can insert profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );
