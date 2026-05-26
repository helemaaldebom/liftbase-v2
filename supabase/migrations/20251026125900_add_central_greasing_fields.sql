/*
  # Add Central Greasing Fields

  1. Changes
    - Add central_greasing_chassis to all 4 equipment detail tables:
      - forklift_details
      - empty_container_handler_details
      - reachstacker_details
      - terminal_tractor_details
    - Add central_greasing_spreader to:
      - empty_container_handler_details
      - reachstacker_details

  2. Notes
    - All fields are boolean with default false
    - Fields are added before the tires section for proper organization
*/

-- Add central_greasing_chassis to forklift_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forklift_details' AND column_name = 'central_greasing_chassis'
  ) THEN
    ALTER TABLE forklift_details ADD COLUMN central_greasing_chassis boolean DEFAULT false;
  END IF;
END $$;

-- Add central_greasing_chassis to empty_container_handler_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empty_container_handler_details' AND column_name = 'central_greasing_chassis'
  ) THEN
    ALTER TABLE empty_container_handler_details ADD COLUMN central_greasing_chassis boolean DEFAULT false;
  END IF;
END $$;

-- Add central_greasing_spreader to empty_container_handler_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empty_container_handler_details' AND column_name = 'central_greasing_spreader'
  ) THEN
    ALTER TABLE empty_container_handler_details ADD COLUMN central_greasing_spreader boolean DEFAULT false;
  END IF;
END $$;

-- Add central_greasing_chassis to reachstacker_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'central_greasing_chassis'
  ) THEN
    ALTER TABLE reachstacker_details ADD COLUMN central_greasing_chassis boolean DEFAULT false;
  END IF;
END $$;

-- Add central_greasing_spreader to reachstacker_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reachstacker_details' AND column_name = 'central_greasing_spreader'
  ) THEN
    ALTER TABLE reachstacker_details ADD COLUMN central_greasing_spreader boolean DEFAULT false;
  END IF;
END $$;

-- Add central_greasing_chassis to terminal_tractor_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'terminal_tractor_details' AND column_name = 'central_greasing_chassis'
  ) THEN
    ALTER TABLE terminal_tractor_details ADD COLUMN central_greasing_chassis boolean DEFAULT false;
  END IF;
END $$;