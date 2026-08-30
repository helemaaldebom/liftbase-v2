/*
  # Add dossier date field and update dossier numbering format
  
  1. Changes
    - Add `dossier_datum` field with automatic date insertion
    - Create function to generate dossier numbers in format HCL{YY}-{NNN}
    - Create trigger to auto-generate dossier number on insert
    - Update existing dossier numbers to new format starting from HCL25-117
  
  2. Format
    - New format: HCL{YY}-{NNN} where YY is 2-digit year and NNN is sequential number
    - Example: HCL25-117, HCL25-118, HCL26-001, etc.
*/

-- Add dossier_datum field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'dossier_datum'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN dossier_datum date DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Create function to generate next dossier number
CREATE OR REPLACE FUNCTION generate_dossier_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  year_prefix TEXT;
  max_number INT;
  next_number TEXT;
BEGIN
  -- Get current year as 2 digits (e.g., 25 for 2025)
  current_year := TO_CHAR(CURRENT_DATE, 'YY');
  year_prefix := 'HCL' || current_year || '-';
  
  -- Find the highest number for current year (only for non-marktdata dossiers)
  SELECT COALESCE(MAX(
    CASE 
      WHEN dossier_number LIKE year_prefix || '%' 
      THEN CAST(SUBSTRING(dossier_number FROM LENGTH(year_prefix) + 1) AS INTEGER)
      ELSE 0
    END
  ), 116) INTO max_number
  FROM dossiers
  WHERE is_marktdata IS NOT TRUE;
  
  -- Generate next number with leading zeros (3 digits)
  next_number := year_prefix || LPAD((max_number + 1)::TEXT, 3, '0');
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate dossier number on insert (only for non-marktdata)
CREATE OR REPLACE FUNCTION set_dossier_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_marktdata IS NOT TRUE AND (NEW.dossier_number IS NULL OR NEW.dossier_number = '') THEN
    NEW.dossier_number := generate_dossier_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_dossier_number ON dossiers;
CREATE TRIGGER trigger_set_dossier_number
  BEFORE INSERT ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION set_dossier_number();

-- Update existing dossier numbers to new format
DO $$
DECLARE
  rec RECORD;
  counter INT := 117;
BEGIN
  -- Update existing non-marktdata dossiers in chronological order
  FOR rec IN 
    SELECT id 
    FROM dossiers 
    WHERE is_marktdata IS NOT TRUE AND (dossier_number IS NULL OR dossier_number = '' OR NOT dossier_number LIKE 'HCL%')
    ORDER BY created_at ASC
  LOOP
    UPDATE dossiers 
    SET dossier_number = 'HCL25-' || LPAD(counter::TEXT, 3, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;