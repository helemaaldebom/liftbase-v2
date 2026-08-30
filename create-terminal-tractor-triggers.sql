/*
  # Auto-create and sync terminal tractor details

  1. Trigger Function
    - Creates terminal_tractor_details automatically when a dossier of type 'terminal_tractor' is created
    - Copies brand, model, year from dossiers to terminal_tractor_details

  2. Update Function
    - Syncs updates from dossiers table to terminal_tractor_details table
    - Updates brand, type, year when dossier is updated

  3. Backfill
    - Creates missing terminal_tractor_details records for existing terminal tractor dossiers
*/

-- Function to auto-create terminal_tractor_details from dossier
CREATE OR REPLACE FUNCTION auto_create_terminal_tractor_details()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create terminal_tractor_details for terminal tractor equipment type
  IF NEW.equipment_type = 'terminal_tractor' THEN
    INSERT INTO terminal_tractor_details (
      dossier_id,
      brand,
      type,
      year_of_manufacture,
      remark,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.brand, ''),
      COALESCE(NEW.model, ''),
      NEW.year,
      COALESCE(NEW.description, ''),
      now(),
      now()
    )
    ON CONFLICT (dossier_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to automatically create terminal_tractor_details after dossier insert
DROP TRIGGER IF EXISTS trigger_auto_create_terminal_tractor_details ON dossiers;
CREATE TRIGGER trigger_auto_create_terminal_tractor_details
  AFTER INSERT ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_terminal_tractor_details();

-- Function to sync dossier updates to terminal_tractor_details
CREATE OR REPLACE FUNCTION sync_dossier_to_terminal_tractor_details()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only sync for terminal tractors and only if brand, model, or year changed
  IF NEW.equipment_type = 'terminal_tractor'
     AND (OLD.brand IS DISTINCT FROM NEW.brand
          OR OLD.model IS DISTINCT FROM NEW.model
          OR OLD.year IS DISTINCT FROM NEW.year) THEN

    -- Update terminal_tractor_details if it exists
    UPDATE terminal_tractor_details
    SET
      brand = COALESCE(NEW.brand, ''),
      type = COALESCE(NEW.model, ''),
      year_of_manufacture = NEW.year,
      updated_at = now()
    WHERE dossier_id = NEW.id;

  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to sync dossier updates to terminal_tractor_details
DROP TRIGGER IF EXISTS trigger_sync_dossier_to_terminal_tractor_details ON dossiers;
CREATE TRIGGER trigger_sync_dossier_to_terminal_tractor_details
  AFTER UPDATE ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION sync_dossier_to_terminal_tractor_details();

-- Backfill: Create terminal_tractor_details for existing terminal tractor dossiers
INSERT INTO terminal_tractor_details (
  dossier_id,
  brand,
  type,
  year_of_manufacture,
  remark
)
SELECT
  d.id,
  COALESCE(d.brand, ''),
  COALESCE(d.model, ''),
  d.year,
  COALESCE(d.description, '')
FROM dossiers d
WHERE d.equipment_type = 'terminal_tractor'
  AND NOT EXISTS (
    SELECT 1 FROM terminal_tractor_details td
    WHERE td.dossier_id = d.id
  )
ON CONFLICT (dossier_id) DO NOTHING;
