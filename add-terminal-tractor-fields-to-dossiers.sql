/*
  # Add Terminal Tractor Fields to Dossiers Table

  1. Changes
    - Add fifth_wheel_height_mm column for terminal tractor fifth wheel height
    - Ensure brandstof exists (should be from earlier migration but may be missing)
    - Ensure all equipment-type specific fields exist in dossiers table

  2. Purpose
    - Enable marktdata entry for terminal tractors
    - Ensure consistency across all equipment types
    - Support both manual entry and automated imports

  3. Instructions
    - Run this SQL in your Supabase SQL Editor
    - Go to: https://supabase.com/dashboard/project/wcjegvxnojzirwxogesj/sql
    - Paste this entire SQL and click Run

  4. Notes
    - All fields are nullable to support different equipment types
    - Fields specific to terminal tractors may be NULL for other equipment types
*/

DO $$
BEGIN
  -- Add fifth_wheel_height_mm for terminal tractors
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'fifth_wheel_height_mm'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN fifth_wheel_height_mm INTEGER;
  END IF;

  -- Ensure brandstof exists (fuel type in Dutch)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'brandstof'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN brandstof TEXT;
  END IF;

  -- Ensure land exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'land'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN land TEXT;
  END IF;

  -- Ensure locatie exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'locatie'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN locatie TEXT;
  END IF;

  -- Ensure uren exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'uren'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN uren INTEGER;
  END IF;

  -- Ensure merk exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'merk'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN merk TEXT DEFAULT '';
  END IF;

  -- Ensure type exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'type'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN type TEXT DEFAULT '';
  END IF;

  -- Ensure bouwjaar exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'bouwjaar'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN bouwjaar INTEGER;
  END IF;

  -- Ensure serienummer exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'serienummer'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN serienummer TEXT;
  END IF;

  -- Ensure verkoopdatum exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'verkoopdatum'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN verkoopdatum DATE;
  END IF;

  -- Ensure marktdata_bron exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'marktdata_bron'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN marktdata_bron TEXT;
  END IF;

  -- Ensure marktdata_bron_url exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'marktdata_bron_url'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN marktdata_bron_url TEXT;
  END IF;

  -- Ensure marktdata_notities exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'marktdata_notities'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN marktdata_notities TEXT;
  END IF;

  -- Ensure marktdata_ingevoerd_door exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'marktdata_ingevoerd_door'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN marktdata_ingevoerd_door UUID REFERENCES user_profiles(id);
  END IF;

  -- Ensure marktdata_invoerdatum exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'marktdata_invoerdatum'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN marktdata_invoerdatum TIMESTAMPTZ;
  END IF;

  -- Ensure is_marktdata exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'is_marktdata'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN is_marktdata BOOLEAN DEFAULT false;
  END IF;

  -- Ensure handelsprijs exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'handelsprijs'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN handelsprijs NUMERIC(12, 2);
  END IF;

  -- Ensure eindklantprijs exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'eindklantprijs'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN eindklantprijs NUMERIC(12, 2);
  END IF;
END $$;

-- Create indexes for commonly filtered fields
CREATE INDEX IF NOT EXISTS idx_dossiers_fifth_wheel_height ON dossiers(fifth_wheel_height_mm);
CREATE INDEX IF NOT EXISTS idx_dossiers_brandstof ON dossiers(brandstof);
CREATE INDEX IF NOT EXISTS idx_dossiers_land ON dossiers(land);
CREATE INDEX IF NOT EXISTS idx_dossiers_is_marktdata ON dossiers(is_marktdata);
CREATE INDEX IF NOT EXISTS idx_dossiers_serienummer ON dossiers(serienummer);
CREATE INDEX IF NOT EXISTS idx_dossiers_merk ON dossiers(merk);
CREATE INDEX IF NOT EXISTS idx_dossiers_bouwjaar ON dossiers(bouwjaar);
