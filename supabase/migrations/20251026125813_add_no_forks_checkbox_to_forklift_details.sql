/*
  # Add No Forks Checkbox to Forklift Details

  1. Changes
    - Add `no_forks` (boolean) to forklift_details table

  2. Notes
    - Field defaults to false
    - When checked, indicates the forklift has no forks
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'no_forks'
  ) THEN
    ALTER TABLE forklift_details ADD COLUMN no_forks boolean DEFAULT false;
  END IF;
END $$;