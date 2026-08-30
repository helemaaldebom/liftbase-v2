/*
  # Add missing equipment types to dossiers constraint

  1. Changes
    - Drop existing CHECK constraint on equipment_type
    - Add new CHECK constraint that includes all equipment types currently in use
  
  2. Equipment Types Added
    - general_equipment (nieuwe categorie voor overige equipment)
    - other (legacy waarde)
    - forklift (legacy waarde)
  
  3. Notes
    - This allows users to create dossiers for all equipment types
    - Includes legacy values to maintain data integrity
*/

-- Drop the existing constraint
ALTER TABLE dossiers 
DROP CONSTRAINT IF EXISTS dossiers_equipment_type_check;

-- Add the new constraint with all equipment types included
ALTER TABLE dossiers 
ADD CONSTRAINT dossiers_equipment_type_check 
CHECK (equipment_type IN (
  'heavy_duty_forklift',
  'empty_container_handler', 
  'reachstacker', 
  'terminal_tractor',
  'general_equipment',
  'forklift',
  'other'
));