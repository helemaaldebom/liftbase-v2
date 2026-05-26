/*
  # Update Terminal Tractor Details Table Fields

  1. Changes
    - Remove capacity_1st_row, capacity_2nd_row, capacity_3rd_row columns
    - Remove mast, free_lift, lift_height_mm columns
    - Add fifth_wheel_height_mm column

  2. Notes
    - This aligns the terminal tractor fields with the specific requirements for this equipment type
    - Uses IF EXISTS checks to safely handle columns that may or may not exist
*/

DO $$
BEGIN
  -- Remove capacity columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'terminal_tractor_details' AND column_name = 'capacity_1st_row'
  ) THEN
    ALTER TABLE terminal_tractor_details DROP COLUMN capacity_1st_row;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'terminal_tractor_details' AND column_name = 'capacity_2nd_row'
  ) THEN
    ALTER TABLE terminal_tractor_details DROP COLUMN capacity_2nd_row;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'terminal_tractor_details' AND column_name = 'capacity_3rd_row'
  ) THEN
    ALTER TABLE terminal_tractor_details DROP COLUMN capacity_3rd_row;
  END IF;

  -- Remove mast-related columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'terminal_tractor_details' AND column_name = 'mast'
  ) THEN
    ALTER TABLE terminal_tractor_details DROP COLUMN mast;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'terminal_tractor_details' AND column_name = 'free_lift'
  ) THEN
    ALTER TABLE terminal_tractor_details DROP COLUMN free_lift;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'terminal_tractor_details' AND column_name = 'lift_height_mm'
  ) THEN
    ALTER TABLE terminal_tractor_details DROP COLUMN lift_height_mm;
  END IF;

  -- Add fifth_wheel_height_mm if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'terminal_tractor_details' AND column_name = 'fifth_wheel_height_mm'
  ) THEN
    ALTER TABLE terminal_tractor_details ADD COLUMN fifth_wheel_height_mm integer;
  END IF;
END $$;