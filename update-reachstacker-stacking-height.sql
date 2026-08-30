/*
  # Update Reachstacker Stacking Height Fields

  Deze SQL moet handmatig in Supabase worden uitgevoerd via:
  Dashboard > SQL Editor > New Query

  1. Changes
    - Verwijdert `mast_type` field van reachstacker_details
    - Vervangt `lift_height_mm` met twee integer fields:
      - `stacking_height_8_6` (integer) voor 8'6" stacking height waarde
      - `stacking_height_9_6` (integer) voor 9'6" stacking height waarde

  2. Notes
    - De nieuwe fields maken het mogelijk om specifieke waarden in te voeren voor stacking heights
    - Beide velden kunnen ingevuld worden met numerieke waarden
*/

DO $$
BEGIN
  -- Remove mast_type if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'mast_type'
  ) THEN
    ALTER TABLE reachstacker_details DROP COLUMN mast_type;
  END IF;

  -- Remove lift_height_mm if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'lift_height_mm'
  ) THEN
    ALTER TABLE reachstacker_details DROP COLUMN lift_height_mm;
  END IF;

  -- Add stacking_height_8_6 if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'stacking_height_8_6'
  ) THEN
    ALTER TABLE reachstacker_details ADD COLUMN stacking_height_8_6 integer;
  END IF;

  -- Add stacking_height_9_6 if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'stacking_height_9_6'
  ) THEN
    ALTER TABLE reachstacker_details ADD COLUMN stacking_height_9_6 integer;
  END IF;
END $$;
