/*
  # Sync dossier updates to forklift details
  
  1. Changes
    - Create trigger function to automatically update forklift_details when dossier brand/model/year changes
    - Ensures forklift_details stays in sync with parent dossier
    - Only syncs if forklift_details record already exists
  
  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS during sync
    - Maintains all existing RLS policies
*/

-- Create function to sync dossier updates to forklift_details
CREATE OR REPLACE FUNCTION sync_dossier_to_forklift_details()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only sync for heavy duty forklifts and only if brand, model, or year changed
  IF NEW.equipment_type = 'heavy_duty_forklift' 
     AND (OLD.brand IS DISTINCT FROM NEW.brand 
          OR OLD.model IS DISTINCT FROM NEW.model 
          OR OLD.year IS DISTINCT FROM NEW.year) THEN
    
    -- Update forklift_details if it exists
    UPDATE forklift_details
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

-- Create trigger to sync dossier updates to forklift_details
DROP TRIGGER IF EXISTS trigger_sync_dossier_to_forklift_details ON dossiers;
CREATE TRIGGER trigger_sync_dossier_to_forklift_details
  AFTER UPDATE ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION sync_dossier_to_forklift_details();