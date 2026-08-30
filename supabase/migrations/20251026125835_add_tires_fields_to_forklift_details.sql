/*
  # Add Tires Fields to Forklift Details

  1. Changes
    - Add `tire_size_front` (text) to forklift_details table
    - Add `tire_size_back` (text) to forklift_details table
    - Add `tire_type` (text) to forklift_details table

  2. Notes
    - All fields are nullable to allow gradual data entry
    - tire_type represents the type of tire (solid or air suspended)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'tire_size_front'
  ) THEN
    ALTER TABLE forklift_details ADD COLUMN tire_size_front text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'tire_size_back'
  ) THEN
    ALTER TABLE forklift_details ADD COLUMN tire_size_back text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'tire_type'
  ) THEN
    ALTER TABLE forklift_details ADD COLUMN tire_type text;
  END IF;
END $$;