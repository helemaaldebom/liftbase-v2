-- Add sale_price, sold_at, and sold_via_platform columns to dossiers table
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS sale_price numeric;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS sold_at timestamptz;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS sold_via_platform text;

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dossiers'
AND column_name IN ('sale_price', 'sold_at', 'sold_via_platform');
