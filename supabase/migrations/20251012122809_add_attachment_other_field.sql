/*
  # Add attachment_other field to forklift_details

  1. Changes
    - Add `attachment_other` text field to `forklift_details` table
    - This field stores custom attachment descriptions when "Other" is selected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'attachment_other'
  ) THEN
    ALTER TABLE forklift_details ADD COLUMN attachment_other text DEFAULT '';
  END IF;
END $$;
