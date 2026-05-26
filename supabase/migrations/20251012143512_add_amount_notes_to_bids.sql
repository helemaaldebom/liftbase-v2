/*
  # Add new bid fields and update status values

  1. Changes
    - Add `amount` column to bids table (nullable, for dealer-submitted bids)
    - Add `notes` column to bids table (nullable, for dealer-submitted notes)
    - Add `submitted_at` column to track when dealer submitted the bid
    - Keep existing `bedrag` and `voorwaarden` columns for backward compatibility
    
  2. Notes
    - The `amount` field will be used when dealers submit bids via email link
    - The `bedrag` field will continue to be used for internally created bids
    - Status values will now include: 'pending', 'submitted', 'accepted', 'rejected'
    - Old status values ('Ingediend', 'Geaccepteerd', etc.) will continue to work
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bids' AND column_name = 'amount'
  ) THEN
    ALTER TABLE bids ADD COLUMN amount decimal(12,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bids' AND column_name = 'notes'
  ) THEN
    ALTER TABLE bids ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bids' AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE bids ADD COLUMN submitted_at timestamptz;
  END IF;
END $$;
