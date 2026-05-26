/*
  # Update Bids Status Constraint
  
  1. Problem
    - Current constraint only accepts Dutch status values
    - Frontend code uses English status values
    - This causes constraint violations when updating bid status
  
  2. Solution
    - Drop old constraint
    - Add new constraint that accepts both English and Dutch values
    - This maintains backwards compatibility
  
  3. Status Values
    - English: pending, submitted, updated, accepted, rejected
    - Dutch: Ingediend, Geüpdatet, Geweigerd, Geaccepteerd
*/

-- Drop the old constraint
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_status_check;

-- Add new constraint that accepts both English and Dutch values
ALTER TABLE bids ADD CONSTRAINT bids_status_check 
  CHECK (status IN (
    'pending',
    'submitted', 
    'updated',
    'accepted',
    'rejected',
    'Ingediend',
    'Geüpdatet',
    'Geweigerd',
    'Geaccepteerd'
  ));
