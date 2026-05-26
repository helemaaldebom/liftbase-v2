/*
  # Auto-create and sync empty container handler details

  1. Trigger Function
    - Creates empty_container_handler_details automatically when a dossier of type 'empty_container_handler' is created
    - Copies brand, model, year from dossiers to empty_container_handler_details

  2. Update Function
    - Syncs updates from dossiers table to empty_container_handler_details table
    - Updates brand, type, year when dossier is updated

  3. Backfill
    - Creates missing empty_container_handler_details records for existing ECH dossiers
*/

-- Function to auto-create empty_container_handler_details from dossier
CREATE OR REPLACE FUNCTION auto_create_ech_details()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create empty_container_handler_details for ECH equipment type
  IF NEW.equipment_type = 'empty_container_handler' THEN
    INSERT INTO empty_container_handler_details (
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

-- Create trigger to automatically create empty_container_handler_details after dossier insert
DROP TRIGGER IF EXISTS trigger_auto_create_ech_details ON dossiers;
CREATE TRIGGER trigger_auto_create_ech_details
  AFTER INSERT ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_ech_details();

-- Function to sync dossier updates to empty_container_handler_details
CREATE OR REPLACE FUNCTION sync_dossier_to_ech_details()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only sync for ECH and only if brand, model, or year changed
  IF NEW.equipment_type = 'empty_container_handler'
     AND (OLD.brand IS DISTINCT FROM NEW.brand
          OR OLD.model IS DISTINCT FROM NEW.model
          OR OLD.year IS DISTINCT FROM NEW.year) THEN

    -- Update empty_container_handler_details if it exists
    UPDATE empty_container_handler_details
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

-- Create trigger to sync dossier updates to empty_container_handler_details
DROP TRIGGER IF EXISTS trigger_sync_dossier_to_ech_details ON dossiers;
CREATE TRIGGER trigger_sync_dossier_to_ech_details
  AFTER UPDATE ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION sync_dossier_to_ech_details();

-- Backfill: Create empty_container_handler_details for existing ECH dossiers
INSERT INTO empty_container_handler_details (
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
WHERE d.equipment_type = 'empty_container_handler'
  AND NOT EXISTS (
    SELECT 1 FROM empty_container_handler_details ed
    WHERE ed.dossier_id = d.id
  )
ON CONFLICT (dossier_id) DO NOTHING;
