/*
  # Update forklift_details table - Remove fields and update AdBlue

  1. Changes
    - Remove shift_type field
    - Remove particle_filter field
    - Change adblue from text to boolean (yes/no)

  2. Notes
    - Existing data in adblue field will be converted to boolean
*/

-- Remove shift_type column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'shift_type'
  ) THEN
    ALTER TABLE forklift_details DROP COLUMN shift_type;
  END IF;
END $$;

-- Remove particle_filter column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'particle_filter'
  ) THEN
    ALTER TABLE forklift_details DROP COLUMN particle_filter;
  END IF;
END $$;

-- Update adblue column from text to boolean
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'adblue' AND data_type = 'text'
  ) THEN
    -- Drop default first
    ALTER TABLE forklift_details 
    ALTER COLUMN adblue DROP DEFAULT;
    
    -- Convert existing text data to boolean
    ALTER TABLE forklift_details 
    ALTER COLUMN adblue TYPE boolean 
    USING CASE 
      WHEN adblue IS NULL OR adblue = '' THEN false 
      ELSE true 
    END;
    
    -- Set new default value
    ALTER TABLE forklift_details 
    ALTER COLUMN adblue SET DEFAULT false;
  END IF;
END $$;
