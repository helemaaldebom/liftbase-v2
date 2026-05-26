/*
  # Add Price Fields to Dossiers Table

  1. Changes
    - Add handelsprijs column for trade/dealer price
    - Add eindklantprijs column for end customer price
    
  2. Purpose
    - Track pricing information for all equipment types
    - Make pricing data available in marktdata database view
    - Support price tracking for sales and market analysis

  3. Notes
    - Both fields are nullable to support gradual data entry
    - Uses numeric type for decimal precision
    - No RLS changes needed as dossiers table already has policies
*/

DO $$
BEGIN
  -- Add handelsprijs (trade price)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'handelsprijs'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN handelsprijs numeric;
  END IF;

  -- Add eindklantprijs (end customer price)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'eindklantprijs'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN eindklantprijs numeric;
  END IF;
END $$;