/*
  # Add Hydraulic Lines Field to Forklift Details

  1. Changes
    - Add `hydraulic_lines` (integer) to forklift_details table

  2. Notes
    - Field is nullable to allow gradual data entry
    - Field represents the number of hydraulic lines (typically 2, 3, 4, or 5)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'hydraulic_lines'
  ) THEN
    ALTER TABLE forklift_details ADD COLUMN hydraulic_lines integer;
  END IF;
END $$;