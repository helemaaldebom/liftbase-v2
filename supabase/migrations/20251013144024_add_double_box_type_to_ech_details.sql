/*
  # Add double box type field to empty container handler details

  1. Changes
    - Add `double_box_type` column to `empty_container_handler_details` table
      - Type: text
      - Nullable: true (only required when double_box is checked)
      - Stores the type of double box: "hook and side clamp", "horizontal twistlock", or "hook and wedge clamp"
  
  2. Notes
    - This field is conditionally used based on the `double_box` boolean field
    - No default value needed as it's only relevant when double_box is true
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empty_container_handler_details' AND column_name = 'double_box_type'
  ) THEN
    ALTER TABLE empty_container_handler_details 
    ADD COLUMN double_box_type text;
  END IF;
END $$;