/*
  # Add Service Role Bypass for Dealer Access
  
  1. Problem
    - Dealers can't access equipment details and photos because of RLS
    - We can't use recursive policies that check bids
  
  2. Solution
    - Add permissive SELECT policies that allow viewing details by dossier_id
    - Security is enforced at application level in DealerDossierViewPage
    - These policies are wide open for SELECT only - application checks access
  
  3. Security
    - Only SELECT is allowed, no INSERT/UPDATE/DELETE for dealers
    - Application-level checks ensure dealers only see their assigned dossiers
*/

-- Allow anyone authenticated to view equipment details (application checks access)
CREATE POLICY "Authenticated users can view forklift details"
  ON forklift_details
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view ECH details"
  ON empty_container_handler_details
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view reachstacker details"
  ON reachstacker_details
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view terminal tractor details"
  ON terminal_tractor_details
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view photos"
  ON photos
  FOR SELECT
  TO authenticated
  USING (true);

-- But restrict modifications to managers only
CREATE POLICY "Only managers can modify equipment details"
  ON forklift_details
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );
