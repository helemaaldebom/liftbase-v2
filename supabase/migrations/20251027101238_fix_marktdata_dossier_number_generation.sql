/*
  # Fix Dossier Number Generation for Marktdata Records

  1. Problem
    - The trigger `set_dossier_number()` only generates dossier numbers for non-marktdata records
    - Marktdata records need a dossier_number too since it's a NOT NULL field
    
  2. Solution
    - Update trigger to generate dossier numbers for marktdata records too
    - Format for marktdata: MKT{YY}-{NNN} (e.g., MKT25-001)
    - Format for regular dossiers: HCL{YY}-{NNN} (unchanged)
    
  3. Notes
    - This ensures all records in the dossiers table get a valid dossier_number
*/

-- Update the generate function to handle marktdata separately
CREATE OR REPLACE FUNCTION generate_dossier_number(is_marktdata_record BOOLEAN DEFAULT FALSE)
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  year_prefix TEXT;
  max_number INT;
  next_number TEXT;
BEGIN
  -- Get current year as 2 digits (e.g., 25 for 2025)
  current_year := TO_CHAR(CURRENT_DATE, 'YY');
  
  IF is_marktdata_record THEN
    -- For marktdata, use MKT prefix
    year_prefix := 'MKT' || current_year || '-';
    
    -- Find the highest number for current year (only for marktdata)
    SELECT COALESCE(MAX(
      CASE 
        WHEN dossier_number LIKE year_prefix || '%' 
        THEN CAST(SUBSTRING(dossier_number FROM LENGTH(year_prefix) + 1) AS INTEGER)
        ELSE 0
      END
    ), 0) INTO max_number
    FROM dossiers
    WHERE is_marktdata IS TRUE;
  ELSE
    -- For regular dossiers, use HCL prefix
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
  END IF;
  
  -- Generate next number with leading zeros (3 digits)
  next_number := year_prefix || LPAD((max_number + 1)::TEXT, 3, '0');
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Update trigger to generate dossier number for both regular and marktdata records
CREATE OR REPLACE FUNCTION set_dossier_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dossier_number IS NULL OR NEW.dossier_number = '' THEN
    -- Generate appropriate dossier number based on is_marktdata flag
    NEW.dossier_number := generate_dossier_number(COALESCE(NEW.is_marktdata, FALSE));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger (no change needed, just for completeness)
DROP TRIGGER IF EXISTS trigger_set_dossier_number ON dossiers;
CREATE TRIGGER trigger_set_dossier_number
  BEFORE INSERT ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION set_dossier_number();

-- Update existing marktdata records that have empty or NULL dossier_number
DO $$
DECLARE
  rec RECORD;
  counter INT := 1;
BEGIN
  FOR rec IN 
    SELECT id 
    FROM dossiers 
    WHERE is_marktdata IS TRUE 
    AND (dossier_number IS NULL OR dossier_number = '' OR dossier_number LIKE 'HCL%')
    ORDER BY created_at ASC
  LOOP
    UPDATE dossiers 
    SET dossier_number = 'MKT25-' || LPAD(counter::TEXT, 3, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;
