/*
  # Add missing fields to dossiers table for marktdata

  1. Changes to dossiers table
    - Add `merk` (text) - Brand name (e.g., Toyota, Linde)
    - Add `type` (text) - Model/type designation
    - Add `bouwjaar` (integer) - Year of manufacture
    - Add `serienummer` (text) - Serial number
    - Add `uren` (integer) - Hours on clock
    - Add `capaciteit` (integer) - Capacity in kg
    - Add `hefhoogte` (integer) - Lift height in mm
    - Add `verkoopdatum` (date) - Sale date
    - Add `land` (text) - Country
    - Add `locatie` (text) - Location/city
    - Add `is_marktdata` (boolean) - Flag to distinguish marktdata from regular dossiers

  2. Purpose
    - Enable proper marktdata entry with standardized field names
    - Match Excel column structure from HClifters taxatiebestand
    - Allow filtering between marktdata and regular dossiers
*/

-- Add marktdata-specific fields to dossiers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'merk'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN merk TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'type'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN type TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'bouwjaar'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN bouwjaar INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'serienummer'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN serienummer TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'uren'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN uren INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'capaciteit'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN capaciteit INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'hefhoogte'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN hefhoogte INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'verkoopdatum'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN verkoopdatum DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'land'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN land TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'locatie'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN locatie TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'is_marktdata'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN is_marktdata BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create index for faster marktdata filtering
CREATE INDEX IF NOT EXISTS idx_dossiers_is_marktdata ON dossiers(is_marktdata);
CREATE INDEX IF NOT EXISTS idx_dossiers_serienummer ON dossiers(serienummer);
CREATE INDEX IF NOT EXISTS idx_dossiers_merk ON dossiers(merk);
CREATE INDEX IF NOT EXISTS idx_dossiers_bouwjaar ON dossiers(bouwjaar);
