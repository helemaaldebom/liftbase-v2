/*
  # Auto-create forklift details with dossier data
  
  1. Changes
    - Create trigger function to automatically create forklift_details when a dossier is created
    - Automatically copies brand, type (as model), and year from dossiers to forklift_details
    - Ensures forklift_details.brand = dossiers.brand
    - Ensures forklift_details.type = dossiers.model
    - Ensures forklift_details.year_of_manufacture = dossiers.year
  
  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS during auto-creation
    - Maintains all existing RLS policies
*/

-- Create function to auto-create forklift_details when a dossier is created
CREATE OR REPLACE FUNCTION auto_create_forklift_details()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create forklift_details for heavy duty forklift equipment type
  IF NEW.equipment_type = 'heavy_duty_forklift' THEN
    INSERT INTO forklift_details (
      dossier_id,
      brand,
      type,
      year_of_manufacture,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.brand, ''),
      COALESCE(NEW.model, ''),
      NEW.year,
      now(),
      now()
    )
    ON CONFLICT (dossier_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create forklift_details after dossier insert
DROP TRIGGER IF EXISTS trigger_auto_create_forklift_details ON dossiers;
CREATE TRIGGER trigger_auto_create_forklift_details
  AFTER INSERT ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_forklift_details();