/*
  # Add INSERT policy for user_profiles

  1. Changes
    - Add policy to allow authenticated users to insert their own profile during registration
    - This is needed when new users sign up and need to create their profile record

  2. Security
    - Users can only insert a profile with their own user ID (auth.uid())
    - This prevents users from creating profiles for other users
*/

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
