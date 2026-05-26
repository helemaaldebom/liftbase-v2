/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Changes
    - Drop the problematic "Managers can read all profiles" policy
    - Create a new policy that checks role directly from auth.jwt()
    - This avoids querying user_profiles table within its own policy
  
  2. Security
    - Maintains same security level
    - Managers can still read all profiles
    - Regular users can only read their own profile
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Managers can read all profiles" ON user_profiles;

-- Create new policy that checks role from JWT metadata instead of querying the table
CREATE POLICY "Managers can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role' = 'manager')
    OR (auth.uid() = id)
  );
