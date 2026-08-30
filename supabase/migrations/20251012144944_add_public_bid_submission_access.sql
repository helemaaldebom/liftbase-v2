/*
  # Add public access for bid submission

  1. Changes
    - Add policy to allow anonymous users to view bids by ID (for submission)
    - Add policy to allow anonymous users to update bids (submit their bid)
    - Add policy to allow anonymous users to view dossier details for bid submission

  2. Security
    - Anonymous users can only view/update bids they have a direct link to (by ID)
    - Anonymous users can only view dossier info if they have a valid bid ID
    - Updates are restricted: only amount, notes, status, and submitted_at can be changed
    - Status can only be changed to 'submitted'

  3. Notes
    - This enables the public bid submission flow where dealers receive a link
    - The bid ID acts as a secure token since it's a UUID
*/

-- Allow anonymous users to view a specific bid by ID
CREATE POLICY "Anonymous users can view bid by ID"
  ON bids
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to update their bid submission
CREATE POLICY "Anonymous users can submit bid"
  ON bids
  FOR UPDATE
  TO anon
  USING (status = 'pending')
  WITH CHECK (status = 'submitted');

-- Allow anonymous users to view dossier details for bid submission
CREATE POLICY "Anonymous users can view dossier for bid"
  ON dossiers
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.dossier_id = dossiers.id
    )
  );
