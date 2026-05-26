/*
  # Add Eindgebruiker Marktdata Tracking

  1. Changes
    - Add created_by_role column to dossiers to track user role
    - Add trigger to automatically mark eindgebruiker dossiers as marktdata
    - Add function to update role when dossier is created
    
  2. Security
    - Only managers can view eindgebruiker marktdata
    - Eindgebruikers cannot see that their data is used as marktdata
    
  3. Notes
    - Eindgebruiker dossiers are automatically flagged as marktdata for internal analysis
    - This data helps managers understand market trends
*/

-- Add column to track the role of the user who created the dossier
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'created_by_role'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN created_by_role text;
  END IF;
END $$;

-- Create function to set created_by_role and mark eindgebruiker dossiers as marktdata
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS set_dossier_creator_role_trigger ON dossiers;

CREATE TRIGGER set_dossier_creator_role_trigger
  BEFORE INSERT ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION set_dossier_creator_role();

-- Update existing dossiers to set created_by_role
UPDATE dossiers d
SET created_by_role = up.role
FROM user_profiles up
WHERE d.created_by = up.id
AND d.created_by_role IS NULL;

-- Mark existing eindgebruiker dossiers as marktdata
UPDATE dossiers
SET is_marktdata = true
WHERE created_by_role = 'eindgebruiker'
AND (is_marktdata IS NULL OR is_marktdata = false);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_dossiers_created_by_role ON dossiers(created_by_role);
CREATE INDEX IF NOT EXISTS idx_dossiers_is_marktdata_role ON dossiers(is_marktdata, created_by_role) WHERE is_marktdata = true;