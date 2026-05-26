/*
  # Remove Verkoper Bid Update Policy

  1. Changes
    - REMOVES the policy that allowed verkopers to update bid status
    - Only managers should be able to accept/reject bids

  2. Security
    - Verkopers can NO LONGER accept/reject bids
    - Only managers can update bid status
*/

-- Remove the verkoper update policy if it exists
DROP POLICY IF EXISTS "Verkopers can update bids on own dossiers" ON bids;
