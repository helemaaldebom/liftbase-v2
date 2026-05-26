/*
  # Replace 'draft' status with 'stock'

  1. Changes
    - Update all existing dossiers with status 'draft' to 'stock'
    - This consolidates status values to only use: open, stock, bidding, sold, archived

  2. Notes
    - No data loss - only status value change
    - All 'draft' references in code will be updated separately
*/

-- Update all draft dossiers to stock
UPDATE dossiers
SET status = 'stock'
WHERE status = 'draft';
