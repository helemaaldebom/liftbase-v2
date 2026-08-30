/*
  # Fix Eindgebruiker Dossier Insert Issue

  1. Changes
    - Clean up duplicate INSERT policies on dossiers
    - Ensure trigger works correctly with RLS
    - Make trigger SECURITY INVOKER instead of SECURITY DEFINER
    
  2. Security
    - Maintain proper access control
    - Ensure eindgebruikers can create dossiers
    
  3. Notes
    - Removes old conflicting policies
    - Keeps only the comprehensive policy
*/

-- Drop old/conflicting policies
DROP POLICY IF EXISTS "Managers can insert dossiers" ON dossiers;
DROP POLICY IF EXISTS "Verkopers can create dossiers" ON dossiers;

-- Recreate the trigger function with SECURITY INVOKER
-- This ensures the trigger runs with the permissions of the user executing the query
CREATE OR REPLACE FUNCTION set_dossier_creator_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the role of the user creating the dossier
  SELECT role INTO NEW.created_by_role
  FROM user_profiles
  WHERE id = NEW.created_by;
  
  -- If created by eindgebruiker, automatically mark as marktdata
  IF NEW.created_by_role = 'eindgebruiker' THEN
    NEW.is_marktdata := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS set_dossier_creator_role_trigger ON dossiers;

CREATE TRIGGER set_dossier_creator_role_trigger
  BEFORE INSERT ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION set_dossier_creator_role();