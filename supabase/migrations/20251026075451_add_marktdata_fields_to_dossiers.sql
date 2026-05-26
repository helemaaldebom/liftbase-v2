/*
  # Add Marktdata Fields to Dossiers Table

  1. Changes
    - Add serial_number column for tracking equipment serial numbers
    - Add fuel_type column for fuel/drive type (Diesel, Electric, etc.)
    - Add capacity column for equipment capacity in kg
    - Add load_center column for load center distance in mm
    - Add lifting_height column for maximum lifting height in mm
    - Add free_lift column for free lift height in mm
    - Add hours column for operating hours/mileage
    - Add mast_type column for mast configuration
    - Add attachment column for attachment type
    - Add country column for country/market
    - Add sale_date column for transaction date

  2. Notes
    - All columns are nullable to support gradual data migration
    - Uses appropriate data types for each field
    - No RLS changes needed as dossiers table already has policies
*/

DO $$
BEGIN
  -- Add serial number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'serial_number'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN serial_number text;
  END IF;

  -- Add fuel type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'fuel_type'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN fuel_type text;
  END IF;

  -- Add capacity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'capacity'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN capacity numeric;
  END IF;

  -- Add load center
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'load_center'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN load_center numeric;
  END IF;

  -- Add lifting height
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'lifting_height'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN lifting_height numeric;
  END IF;

  -- Add free lift
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'free_lift'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN free_lift numeric;
  END IF;

  -- Add hours
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'hours'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN hours numeric;
  END IF;

  -- Add mast type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'mast_type'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN mast_type text;
  END IF;

  -- Add attachment
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'attachment'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN attachment text;
  END IF;

  -- Add country
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'country'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN country text;
  END IF;

  -- Add sale date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'sale_date'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN sale_date date;
  END IF;
END $$;