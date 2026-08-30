/*
  # Add Capacity Row Fields to Reachstacker Details

  1. Problem
    - ReachstackerDetailsForm expects capacity_1st_row, capacity_2nd_row, capacity_3rd_row
    - Database only has capacity_kg field
    - This causes "Could not find the 'capacity_1st_row' column" error

  2. Solution
    - Add three capacity row fields for reachstacker stacking specifications
    - Keep capacity_kg for backward compatibility
    - Each row represents different stacking heights

  3. New Fields
    - `capacity_1st_row` (integer) - Capacity for 1st row stacking in kg
    - `capacity_2nd_row` (integer) - Capacity for 2nd row stacking in kg  
    - `capacity_3rd_row` (integer) - Capacity for 3rd row stacking in kg

  4. Notes
    - These fields are specific to reachstacker stacking capabilities
    - Different from basic capacity_kg which represents overall capacity
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'capacity_1st_row'
  ) THEN
    ALTER TABLE reachstacker_details ADD COLUMN capacity_1st_row INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'capacity_2nd_row'
  ) THEN
    ALTER TABLE reachstacker_details ADD COLUMN capacity_2nd_row INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'capacity_3rd_row'
  ) THEN
    ALTER TABLE reachstacker_details ADD COLUMN capacity_3rd_row INTEGER;
  END IF;
END $$;