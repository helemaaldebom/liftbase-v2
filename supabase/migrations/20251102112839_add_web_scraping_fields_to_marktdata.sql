/*
  # Add Web Scraping Fields to Marktdata System

  ## Changes to dossiers table
  - Add `source_website` (text) - Website waar data vandaan komt (mascus, trucks.nl, etc.)
  - Add `is_scraped` (boolean) - Geeft aan of dit automatisch gescraped is
  - Add `scraped_at` (timestamp) - Wanneer de data is gescraped
  - Add `last_scraped_check` (timestamp) - Laatste keer dat advertentie is gecontroleerd
  - Add `advertentie_actief` (boolean) - Is de advertentie nog actief online

  ## Security
  - All fields can be written by authenticated users (for scraping functions)
  - Read access follows existing dossiers policies

  ## Important
  - Advertisements WITHOUT a price will be rejected by scraping functions
  - Duplicate detection based on source_url prevents double entries
*/

-- Add web scraping fields to dossiers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'source_website'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN source_website TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'is_scraped'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN is_scraped BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'scraped_at'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN scraped_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'last_scraped_check'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN last_scraped_check TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'advertentie_actief'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN advertentie_actief BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Create index for faster duplicate detection based on source URL
CREATE INDEX IF NOT EXISTS idx_dossiers_source_url ON dossiers(marktdata_bron_url) WHERE marktdata_bron_url IS NOT NULL;

-- Create index for scraped listings
CREATE INDEX IF NOT EXISTS idx_dossiers_is_scraped ON dossiers(is_scraped) WHERE is_scraped = true;

-- Create index for active advertisements
CREATE INDEX IF NOT EXISTS idx_dossiers_advertentie_actief ON dossiers(advertentie_actief) WHERE advertentie_actief = true;
