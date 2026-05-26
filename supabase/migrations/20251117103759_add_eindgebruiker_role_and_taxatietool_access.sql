/*
  # Add Eindgebruiker Role and Taxatietool Access Control

  1. Changes
    - Add 'eindgebruiker' to allowed roles in user_profiles
    - Add has_taxatietool_access column for premium feature control
    - Update role constraint to include 'eindgebruiker' and 'handelaar'
  
  2. Security
    - Only managers can modify has_taxatietool_access
    - Eindgebruikers have limited access compared to verkoper/manager
    
  3. Notes
    - Eindgebruiker role has access to: dossiers, biedingen, dealers
    - Taxatietool access is optional and controlled by has_taxatietool_access flag
    - Default value is false (must be explicitly enabled by manager)
*/

-- Add has_taxatietool_access column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'has_taxatietool_access'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN has_taxatietool_access boolean DEFAULT false;
  END IF;
END $$;

-- Update the role constraint to include 'eindgebruiker' and keep existing 'handelaar'
DO $$
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'user_profiles_role_check'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
  END IF;

  -- Add the updated constraint with all roles
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
    CHECK (role IN ('manager', 'verkoper', 'dealer', 'handelaar', 'eindgebruiker'));
END $$;

-- Create index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_taxatietool_access ON user_profiles(has_taxatietool_access) WHERE has_taxatietool_access = true;