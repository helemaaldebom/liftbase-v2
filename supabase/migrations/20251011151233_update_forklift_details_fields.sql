/*
  # Update forklift_details table fields

  1. Changes
    - Change airco from text to boolean
    - Remove streetlights_front field
    - Remove streetlights_rear field
    - Remove work_light_front field
    - Remove work_light_rear field
    - Remove beacon field
    - Change radio from text to boolean
    - Remove extra_lights field
    - Remove extra_lights_2 field
    - Remove wheelbase field
    - Remove mirrors field
    - Remove mirrors_heated field

  2. Notes
    - Converting text fields to boolean where checkbox is needed
    - Removing fields no longer required in the form
*/

-- Change airco to boolean
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'airco' AND data_type = 'text'
  ) THEN
    ALTER TABLE forklift_details ALTER COLUMN airco DROP DEFAULT;
    ALTER TABLE forklift_details ALTER COLUMN airco TYPE boolean USING (airco = 'ja' OR airco = 'true');
    ALTER TABLE forklift_details ALTER COLUMN airco SET DEFAULT false;
  END IF;
END $$;

-- Change radio to boolean
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'radio' AND data_type = 'text'
  ) THEN
    ALTER TABLE forklift_details ALTER COLUMN radio DROP DEFAULT;
    ALTER TABLE forklift_details ALTER COLUMN radio TYPE boolean USING (radio = 'ja' OR radio = 'true' OR radio != '');
    ALTER TABLE forklift_details ALTER COLUMN radio SET DEFAULT false;
  END IF;
END $$;

-- Remove streetlights_front
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'streetlights_front'
  ) THEN
    ALTER TABLE forklift_details DROP COLUMN streetlights_front;
  END IF;
END $$;

-- Remove streetlights_rear
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'streetlights_rear'
  ) THEN
    ALTER TABLE forklift_details DROP COLUMN streetlights_rear;
  END IF;
END $$;

-- Remove work_light_front
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'work_light_front'
  ) THEN
    ALTER TABLE forklift_details DROP COLUMN work_light_front;
  END IF;
END $$;

-- Remove work_light_rear
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'work_light_rear'
  ) THEN
    ALTER TABLE forklift_details DROP COLUMN work_light_rear;
  END IF;
END $$;

-- Remove beacon
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'beacon'
  ) THEN
    ALTER TABLE forklift_details DROP COLUMN beacon;
  END IF;
END $$;

-- Remove extra_lights
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'extra_lights'
  ) THEN
    ALTER TABLE forklift_details DROP COLUMN extra_lights;
  END IF;
END $$;

-- Remove extra_lights_2
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'extra_lights_2'
  ) THEN
    ALTER TABLE forklift_details DROP COLUMN extra_lights_2;
  END IF;
END $$;

-- Remove wheelbase
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'wheelbase'
  ) THEN
    ALTER TABLE forklift_details DROP COLUMN wheelbase;
  END IF;
END $$;

-- Remove mirrors
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'mirrors'
  ) THEN
    ALTER TABLE forklift_details DROP COLUMN mirrors;
  END IF;
END $$;

-- Remove mirrors_heated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'mirrors_heated'
  ) THEN
    ALTER TABLE forklift_details DROP COLUMN mirrors_heated;
  END IF;
END $$;