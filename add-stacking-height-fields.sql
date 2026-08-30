/*
  # Add Stacking Height Fields to Reachstacker Details

  Voer deze SQL uit in Supabase Dashboard:
  Dashboard > SQL Editor > New Query > Plak deze SQL > Run

  1. Problem
    - ReachstackerDetailsForm expects stacking_height_8_6 and stacking_height_9_6
    - Database columns don't exist yet
    - This causes "Could not find the 'stacking_height_8_6' column" error

  2. Solution
    - Add two integer fields for stacking height specifications
    - Allow users to enter numeric values for 8'6" and 9'6" stacking heights

  3. New Fields
    - `stacking_height_8_6` (integer) - Numeric value for 8'6" stacking height
    - `stacking_height_9_6` (integer) - Numeric value for 9'6" stacking height

  4. Notes
    - Both fields are nullable integer fields
    - Users can enter specific numeric values for each stacking height
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'stacking_height_8_6'
  ) THEN
    ALTER TABLE reachstacker_details ADD COLUMN stacking_height_8_6 INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'stacking_height_9_6'
  ) THEN
    ALTER TABLE reachstacker_details ADD COLUMN stacking_height_9_6 INTEGER;
  END IF;
END $$;
