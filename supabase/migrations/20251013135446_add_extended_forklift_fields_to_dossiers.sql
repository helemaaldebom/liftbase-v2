/*
  # Add extended forklift specification fields to dossiers

  1. Changes to dossiers table
    - Add `brandstof` (text) - Fuel/power type (Diesel, Elektrisch, LPG, Hybride)
    - Add `lastzwaartepunt` (integer) - Load center in mm
    - Add `vrije_hef` (integer) - Free lift in mm
    - Add `masttype` (text) - Mast type (Duplex, Triplex, etc.)
    - Add `aanbouwdeel` (text) - Attachment type

  2. Purpose
    - Complete Excel column alignment for HClifters taxatiebestand
    - Enable detailed forklift specifications in marktdata
    - Match industry-standard forklift specification fields
*/

-- Add extended forklift specification fields to dossiers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'brandstof'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN brandstof TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'lastzwaartepunt'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN lastzwaartepunt INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'vrije_hef'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN vrije_hef INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'masttype'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN masttype TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'aanbouwdeel'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN aanbouwdeel TEXT;
  END IF;
END $$;

-- Create indexes for commonly filtered fields
CREATE INDEX IF NOT EXISTS idx_dossiers_brandstof ON dossiers(brandstof);
CREATE INDEX IF NOT EXISTS idx_dossiers_capaciteit ON dossiers(capaciteit);
