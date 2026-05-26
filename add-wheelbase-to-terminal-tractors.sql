/*
  # Add wheelbase_mm to Terminal Tractor Details

  1. Changes
    - Add `wheelbase_mm` (integer) column to `terminal_tractor_details` table
    - This field stores the wheelbase (wielbasis) in millimeters for terminal tractors

  2. Notes
    - Wheelbase is an important specification for terminal tractors
    - Required by both the TerminalTractorDetailsForm and MarktdataTerminalTractorForm components
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'terminal_tractor_details' AND column_name = 'wheelbase_mm'
  ) THEN
    ALTER TABLE terminal_tractor_details ADD COLUMN wheelbase_mm integer;
  END IF;
END $$;
