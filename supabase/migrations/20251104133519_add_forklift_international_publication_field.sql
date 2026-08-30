/*
  # Add Forklift International Publication Field

  1. Changes
    - Add `publish_to_forklift_international` column to dossiers table
    - Enable publication of forklifts to Forklift International platform

  2. New Column
    - `publish_to_forklift_international` (boolean, default: false)
      - Enables/disables automatic publication to Forklift International
      - Only relevant for equipment_type = 'Forklift'
*/

-- Add publication field for Forklift International
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS publish_to_forklift_international BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN dossiers.publish_to_forklift_international IS 'Enable publication to Forklift International platform';
