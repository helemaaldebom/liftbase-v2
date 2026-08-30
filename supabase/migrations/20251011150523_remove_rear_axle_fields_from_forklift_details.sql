/*
  # Remove rear axle fields from forklift_details table

  1. Changes
    - Remove rear_axle_brand field
    - Remove rear_axle_type field

  2. Notes
    - rear_axle_remark field is kept
*/

-- Remove rear_axle_brand column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'rear_axle_brand'
  ) THEN
    ALTER TABLE forklift_details DROP COLUMN rear_axle_brand;
  END IF;
END $$;

-- Remove rear_axle_type column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'rear_axle_type'
  ) THEN
    ALTER TABLE forklift_details DROP COLUMN rear_axle_type;
  END IF;
END $$;