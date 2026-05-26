/*
  # Add Purchase Price to Dossiers

  1. Changes
    - Add purchase_price (inkoopprijs) column to dossiers table
    
  2. Purpose
    - Track the purchase/acquisition price of equipment
    - Complete the full pricing lifecycle (purchase -> trade -> end customer -> sold)
    
  3. Notes
    - Field is nullable to support gradual data entry
    - Uses numeric type for decimal precision
    - No RLS changes needed as dossiers table already has policies
*/

DO $$
BEGIN
  -- Add purchase_price (inkoopprijs)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'purchase_price'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN purchase_price numeric;
  END IF;
END $$;
