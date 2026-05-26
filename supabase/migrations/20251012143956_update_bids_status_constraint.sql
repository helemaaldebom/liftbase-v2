/*
  # Update bids status constraint to include new status values

  1. Changes
    - Drop existing status constraint check on bids table
    - Add new constraint that includes both old and new status values
    - Old values: 'Ingediend', 'Geüpdatet', 'Geweigerd', 'Geaccepteerd'
    - New values: 'pending', 'submitted', 'accepted', 'rejected'

  2. Notes
    - Both old and new status values are supported for backward compatibility
    - 'pending' = invitation sent, waiting for dealer to submit bid
    - 'submitted' = dealer has submitted their bid
    - 'accepted' = bid has been accepted
    - 'rejected' = bid has been rejected
*/

-- Drop the existing constraint
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_status_check;

-- Add new constraint with both old and new status values
ALTER TABLE bids ADD CONSTRAINT bids_status_check 
  CHECK (status IN (
    'Ingediend', 
    'Geüpdatet', 
    'Geweigerd', 
    'Geaccepteerd',
    'pending',
    'submitted',
    'accepted',
    'rejected'
  ));
