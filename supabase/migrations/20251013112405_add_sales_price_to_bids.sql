/*
  # Add Sales Price to Bids

  1. Changes
    - Add `sales_price` column to `bids` table to track the actual sales price to dealers
    - This is separate from the bid `amount` (dealer's offer) and represents the final negotiated price
  
  2. Security
    - No RLS changes needed, existing policies apply
*/

-- Add sales_price column to bids table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bids' AND column_name = 'sales_price'
  ) THEN
    ALTER TABLE bids ADD COLUMN sales_price DECIMAL(10, 2);
  END IF;
END $$;
