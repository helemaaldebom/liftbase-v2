/*
  # Add Equipment Specification Fields to Dossiers Table

  1. Problem
    - When viewing marktdata, key specification fields are missing
    - Fields like capaciteit, lastzwaartepunt, hefhoogte, and uren are stored in details tables
    - This makes it impossible to display them in the marktdata overview without complex joins

  2. Solution
    - Add specification fields directly to the dossiers table
    - These fields will be synced from the details tables when equipment is created/updated
    - Fields are also used when manually entering marktdata

  3. New Fields Added
    - `capaciteit` (integer) - Equipment capacity in kg
    - `lastzwaartepunt` (integer) - Load center in mm
    - `hefhoogte` (integer) - Lift height in mm
    - `uren` (integer) - Hours on clock / operating hours
    - `vrije_hef` (text) - Free lift specification
    - `masttype` (text) - Mast type
    - `aanbouwdeel` (text) - Attachment type

  4. Usage
    - Forms will update these fields along with details tables
    - Marktdata import will populate these fields directly
    - Display logic uses these fields for consistent data access
*/

-- Add specification fields to dossiers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'capaciteit'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN capaciteit INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'lastzwaartepunt'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN lastzwaartepunt INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'hefhoogte'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN hefhoogte INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'uren'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN uren INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'vrije_hef'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN vrije_hef TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'masttype'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN masttype TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'aanbouwdeel'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN aanbouwdeel TEXT;
  END IF;
END $$;

-- Backfill existing dossiers with data from forklift_details
UPDATE dossiers d
SET 
  capaciteit = fd.capacity_kg,
  lastzwaartepunt = fd.load_center_mm,
  hefhoogte = fd.lift_height_mm,
  uren = fd.hours_on_clock,
  vrije_hef = fd.free_lift,
  masttype = fd.mast_type,
  aanbouwdeel = fd.attachment
FROM forklift_details fd
WHERE d.id = fd.dossier_id
  AND d.equipment_type = 'forklift'
  AND (d.capaciteit IS NULL OR d.uren IS NULL);

-- Backfill existing dossiers with data from empty_container_handler_details
UPDATE dossiers d
SET 
  capaciteit = echd.capacity_kg,
  uren = echd.hours_on_clock
FROM empty_container_handler_details echd
WHERE d.id = echd.dossier_id
  AND d.equipment_type = 'empty_container_handler'
  AND (d.capaciteit IS NULL OR d.uren IS NULL);

-- Backfill existing dossiers with data from reachstacker_details
UPDATE dossiers d
SET 
  capaciteit = rsd.capacity_kg,
  uren = rsd.hours_on_clock
FROM reachstacker_details rsd
WHERE d.id = rsd.dossier_id
  AND d.equipment_type = 'reachstacker'
  AND (d.capaciteit IS NULL OR d.uren IS NULL);

-- Backfill existing dossiers with data from terminal_tractor_details
UPDATE dossiers d
SET 
  uren = ttd.hours_on_clock
FROM terminal_tractor_details ttd
WHERE d.id = ttd.dossier_id
  AND d.equipment_type = 'terminal_tractor'
  AND d.uren IS NULL;