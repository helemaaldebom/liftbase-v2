/*
  # Add customer_fleet_number to all equipment details tables

  1. Changes
    - Add `customer_fleet_number` (text) column to:
      - forklift_details
      - empty_container_handler_details
      - reachstacker_details
      - terminal_tractor_details
    - This field stores the customer's fleet number (Vlootnummer klant)

  2. Notes
    - Field is added right after hours_on_clock for consistency
    - Used to track customer fleet numbers for equipment
*/

-- Add customer_fleet_number to forklift_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'customer_fleet_number'
  ) THEN
    ALTER TABLE forklift_details ADD COLUMN customer_fleet_number text;
  END IF;
END $$;

-- Add customer_fleet_number to empty_container_handler_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empty_container_handler_details' AND column_name = 'customer_fleet_number'
  ) THEN
    ALTER TABLE empty_container_handler_details ADD COLUMN customer_fleet_number text;
  END IF;
END $$;

-- Add customer_fleet_number to reachstacker_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'customer_fleet_number'
  ) THEN
    ALTER TABLE reachstacker_details ADD COLUMN customer_fleet_number text;
  END IF;
END $$;

-- Add customer_fleet_number to terminal_tractor_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'terminal_tractor_details' AND column_name = 'customer_fleet_number'
  ) THEN
    ALTER TABLE terminal_tractor_details ADD COLUMN customer_fleet_number text;
  END IF;
END $$;
