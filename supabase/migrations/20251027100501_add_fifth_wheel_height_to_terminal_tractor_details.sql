/*
  # Add fifth_wheel_height_mm to Terminal Tractor Details

  1. Changes
    - Add `fifth_wheel_height_mm` (integer) column to `terminal_tractor_details` table
    - This field stores the fifth wheel height in millimeters for terminal tractors

  2. Notes
    - Field was missing from the original table creation
    - Required by the TerminalTractorDetailsForm component
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'terminal_tractor_details' AND column_name = 'fifth_wheel_height_mm'
  ) THEN
    ALTER TABLE terminal_tractor_details ADD COLUMN fifth_wheel_height_mm integer;
  END IF;
END $$;
