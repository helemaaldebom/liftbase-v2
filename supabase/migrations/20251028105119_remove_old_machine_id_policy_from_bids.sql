/*
  # Remove obsolete machine_id policy from bids table

  1. Changes
    - Drop the old policy "Verkopers and managers can read bids for their machines" that references the non-existent machines table
    - This policy is no longer needed as we've migrated from machine_id to dossier_id
    - The dossier-based policies already provide the correct access control
  
  2. Security
    - No security impact - the policy references a table that no longer exists
    - Proper access control is already in place via dossier-based policies
*/

-- Drop the obsolete policy that references the old machines table
DROP POLICY IF EXISTS "Verkopers and managers can read bids for their machines" ON bids;
