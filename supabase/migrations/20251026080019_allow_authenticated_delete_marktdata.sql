/*
  # Allow authenticated users to delete marktdata

  1. Changes
    - Drop the restrictive "Only managers can delete marktdata" policy
    - Create a new policy that allows all authenticated users to delete marktdata records
  
  2. Security
    - Policy only applies to records where is_marktdata = true
    - Still requires authentication
    - Does not affect regular dossier delete permissions
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Only managers can delete marktdata" ON dossiers;

-- Create a new policy allowing authenticated users to delete marktdata
CREATE POLICY "Authenticated users can delete marktdata"
  ON dossiers FOR DELETE
  TO authenticated
  USING (
    is_marktdata = true
  );