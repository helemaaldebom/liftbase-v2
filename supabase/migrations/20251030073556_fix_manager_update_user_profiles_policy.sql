/*
  # Fix Manager User Profile Update Policy

  1. Problem
    - Managers cannot update other users' profiles
    - Only the "Users can update own profile" policy exists
    - Missing "Managers can update all profiles" policy

  2. Changes
    - Add policy to allow managers to update any user profile
    - Add policy to allow managers to delete user profiles
    - Add policy to allow managers to insert new user profiles

  3. Security
    - Only authenticated users with role 'manager' can manage other users
    - Uses is_manager() function for efficient role checking
*/

-- Drop the restrictive update policy temporarily
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Recreate the user self-update policy
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add manager update policy (this is the missing one!)
CREATE POLICY "Managers can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_manager())
  WITH CHECK (is_manager());

-- Add manager delete policy
CREATE POLICY "Managers can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (is_manager());

-- Add manager insert policy
CREATE POLICY "Managers can insert profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_manager());
