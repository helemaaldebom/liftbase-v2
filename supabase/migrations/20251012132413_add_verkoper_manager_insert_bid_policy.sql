/*
  # Add INSERT policy for verkopers and managers to create bids

  1. Changes
    - Add policy to allow verkopers and managers to insert bids on dossiers they manage
  
  2. Security
    - Verkopers can create bids for dossiers they created or are assigned to
    - Managers can create bids for any dossier
*/

CREATE POLICY "Verkopers can create bids for their dossiers"
  ON bids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      SELECT user_profiles.role
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    ) = 'verkoper'
    AND EXISTS (
      SELECT 1
      FROM dossiers
      WHERE dossiers.id = bids.dossier_id
      AND (dossiers.created_by = auth.uid() OR dossiers.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Managers can create bids for any dossier"
  ON bids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      SELECT user_profiles.role
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    ) = 'manager'
  );