/*
  # Add marktdata read policy for all authenticated users

  This migration adds a policy that allows all authenticated users to read marktdata records.
  Previously, only managers could read all dossiers, and verkopers could only read their own.
  Marktdata records need to be accessible to everyone for the taxatie tool to function.

  ## Changes
  - Add SELECT policy for authenticated users to read marktdata records (is_marktdata = true)
*/

CREATE POLICY "All authenticated users can read marktdata"
  ON dossiers
  FOR SELECT
  TO authenticated
  USING (is_marktdata = true);
