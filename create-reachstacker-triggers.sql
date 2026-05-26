/*
  # Auto-create and sync reachstacker details

  1. Trigger Function
    - Creates reachstacker_details automatically when a dossier of type 'reachstacker' is created
    - Copies brand, model, year from dossiers to reachstacker_details

  2. Update Function
    - Syncs updates from dossiers table to reachstacker_details table
    - Updates brand, type, year when dossier is updated

  3. Backfill
    - Creates missing reachstacker_details records for existing reachstacker dossiers
*/

-- Function to auto-create reachstacker_details from dossier
CREATE OR REPLACE FUNCTION auto_create_reachstacker_details()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create reachstacker_details for reachstacker equipment type
  IF NEW.equipment_type = 'reachstacker' THEN
    INSERT INTO reachstacker_details (
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

-- Create trigger to automatically create reachstacker_details after dossier insert
DROP TRIGGER IF EXISTS trigger_auto_create_reachstacker_details ON dossiers;
CREATE TRIGGER trigger_auto_create_reachstacker_details
  AFTER INSERT ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_reachstacker_details();

-- Function to sync dossier updates to reachstacker_details
CREATE OR REPLACE FUNCTION sync_dossier_to_reachstacker_details()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only sync for reachstackers and only if brand, model, or year changed
  IF NEW.equipment_type = 'reachstacker'
     AND (OLD.brand IS DISTINCT FROM NEW.brand
          OR OLD.model IS DISTINCT FROM NEW.model
          OR OLD.year IS DISTINCT FROM NEW.year) THEN

    -- Update reachstacker_details if it exists
    UPDATE reachstacker_details
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

-- Create trigger to sync dossier updates to reachstacker_details
DROP TRIGGER IF EXISTS trigger_sync_dossier_to_reachstacker_details ON dossiers;
CREATE TRIGGER trigger_sync_dossier_to_reachstacker_details
  AFTER UPDATE ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION sync_dossier_to_reachstacker_details();

-- Backfill: Create reachstacker_details for existing reachstacker dossiers
INSERT INTO reachstacker_details (
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
WHERE d.equipment_type = 'reachstacker'
  AND NOT EXISTS (
    SELECT 1 FROM reachstacker_details rd
    WHERE rd.dossier_id = d.id
  )
ON CONFLICT (dossier_id) DO NOTHING;
