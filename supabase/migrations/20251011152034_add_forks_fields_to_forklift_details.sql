/*
  # Add Forks Fields to Forklift Details

  1. Changes
    - Add `fork_length_mm` (integer) to forklift_details table
    - Add `fork_width_mm` (integer) to forklift_details table  
    - Add `fork_height_mm` (integer) to forklift_details table

  2. Notes
    - All fields are nullable to allow gradual data entry
    - Fields represent fork dimensions in millimeters
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'fork_length_mm'
  ) THEN
    ALTER TABLE forklift_details ADD COLUMN fork_length_mm integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'fork_width_mm'
  ) THEN
    ALTER TABLE forklift_details ADD COLUMN fork_width_mm integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'fork_height_mm'
  ) THEN
    ALTER TABLE forklift_details ADD COLUMN fork_height_mm integer;
  END IF;
END $$;
