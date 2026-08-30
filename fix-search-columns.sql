-- Fix missing columns for global search functionality
-- Run this in your Supabase SQL Editor

-- Add marktdata-specific fields if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dossiers' AND column_name = 'merk'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN merk TEXT DEFAULT '';
    RAISE NOTICE 'Added column: merk';
  ELSE
    RAISE NOTICE 'Column merk already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dossiers' AND column_name = 'type'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN type TEXT DEFAULT '';
    RAISE NOTICE 'Added column: type';
  ELSE
    RAISE NOTICE 'Column type already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dossiers' AND column_name = 'bouwjaar'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN bouwjaar INTEGER;
    RAISE NOTICE 'Added column: bouwjaar';
  ELSE
    RAISE NOTICE 'Column bouwjaar already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dossiers' AND column_name = 'serienummer'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN serienummer TEXT;
    RAISE NOTICE 'Added column: serienummer';
  ELSE
    RAISE NOTICE 'Column serienummer already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dossiers' AND column_name = 'uren'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN uren INTEGER;
    RAISE NOTICE 'Added column: uren';
  ELSE
    RAISE NOTICE 'Column uren already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dossiers' AND column_name = 'capaciteit'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN capaciteit INTEGER;
    RAISE NOTICE 'Added column: capaciteit';
  ELSE
    RAISE NOTICE 'Column capaciteit already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dossiers' AND column_name = 'hefhoogte'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN hefhoogte INTEGER;
    RAISE NOTICE 'Added column: hefhoogte';
  ELSE
    RAISE NOTICE 'Column hefhoogte already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dossiers' AND column_name = 'is_marktdata'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN is_marktdata BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added column: is_marktdata';
  ELSE
    RAISE NOTICE 'Column is_marktdata already exists';
  END IF;
END $$;

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS idx_dossiers_merk ON dossiers(merk);
CREATE INDEX IF NOT EXISTS idx_dossiers_type ON dossiers(type);
CREATE INDEX IF NOT EXISTS idx_dossiers_serienummer ON dossiers(serienummer);
CREATE INDEX IF NOT EXISTS idx_dossiers_bouwjaar ON dossiers(bouwjaar);
CREATE INDEX IF NOT EXISTS idx_dossiers_is_marktdata ON dossiers(is_marktdata);

-- Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dossiers'
  AND column_name IN ('merk', 'type', 'bouwjaar', 'serienummer', 'uren', 'capaciteit', 'hefhoogte', 'is_marktdata')
ORDER BY column_name;
