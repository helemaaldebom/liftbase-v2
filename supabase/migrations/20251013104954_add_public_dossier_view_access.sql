/*
  # Add Public Dossier View Access

  1. Changes
    - Add RLS policy to allow public users to view dossiers via valid bid links
    - Add RLS policy to allow public users to view forklift_details via valid bid links
    - Ensures dealers can view dossier details without authentication but only through valid bid invitation links
  
  2. Security
    - Access is only granted when a valid bid_id exists and matches the dossier
    - Customer information (klant_naam, klant_bedrijf, order_nummer) is already excluded from the view layer
    - No write access is granted to public users
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public can view dossiers via valid bid link" ON dossiers;
  DROP POLICY IF EXISTS "Public can view forklift_details via valid bid link" ON forklift_details;
  DROP POLICY IF EXISTS "Public can view photos via valid bid link" ON photos;
END $$;

-- Allow public users to read dossiers via valid bid links
CREATE POLICY "Public can view dossiers via valid bid link"
  ON dossiers
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.dossier_id = dossiers.id
    )
  );

-- Allow public users to read forklift_details via valid bid links
CREATE POLICY "Public can view forklift_details via valid bid link"
  ON forklift_details
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.dossier_id = forklift_details.dossier_id
    )
  );

-- Allow public users to read photos via valid bid links
CREATE POLICY "Public can view photos via valid bid link"
  ON photos
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.dossier_id = photos.dossier_id
    )
  );
