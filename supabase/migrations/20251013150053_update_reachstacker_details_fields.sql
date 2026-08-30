/*
  # Update Reachstacker Details Fields

  1. Changes
    - Remove `capacity_kg`, `load_center_mm`, `mast_type`, `double_box`, `double_box_type`, `tire_type` fields
    - Add `capacity_1st_row`, `capacity_2nd_row`, `capacity_3rd_row` fields as integers
    - Update `lift_height_mm` to store specific values (4, 5, 6, or 8)

  2. Notes
    - Existing data in removed fields will be preserved but not accessible
    - New capacity fields allow separate tracking for each row
    - Lift height now uses integer values for dropdown options
*/

DO $$
BEGIN
  -- Add new capacity fields if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'capacity_1st_row'
  ) THEN
    ALTER TABLE reachstacker_details ADD COLUMN capacity_1st_row integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'capacity_2nd_row'
  ) THEN
    ALTER TABLE reachstacker_details ADD COLUMN capacity_2nd_row integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'capacity_3rd_row'
  ) THEN
    ALTER TABLE reachstacker_details ADD COLUMN capacity_3rd_row integer;
  END IF;

  -- Drop columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'capacity_kg'
  ) THEN
    ALTER TABLE reachstacker_details DROP COLUMN capacity_kg;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'load_center_mm'
  ) THEN
    ALTER TABLE reachstacker_details DROP COLUMN load_center_mm;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'mast_type'
  ) THEN
    ALTER TABLE reachstacker_details DROP COLUMN mast_type;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'double_box'
  ) THEN
    ALTER TABLE reachstacker_details DROP COLUMN double_box;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'double_box_type'
  ) THEN
    ALTER TABLE reachstacker_details DROP COLUMN double_box_type;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'tire_type'
  ) THEN
    ALTER TABLE reachstacker_details DROP COLUMN tire_type;
  END IF;
END $$;