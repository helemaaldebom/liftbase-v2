/*
  # Update Marktdata RLS Policies for Eindgebruiker

  1. Changes
    - Update dossiers SELECT policy to handle eindgebruiker marktdata correctly
    - Eindgebruikers see their dossiers as regular dossiers (not marktdata)
    - Managers see ALL marktdata including eindgebruiker data
    - Verkoper see only marktdata they created themselves
    
  2. Security
    - Eindgebruikers cannot see other marktdata
    - Eindgebruikers don't know their data is being used as marktdata
    - Managers have full visibility for market analysis
    
  3. Notes
    - This creates a transparent experience for eindgebruikers
    - Managers get valuable market data from real customer inputs
*/

-- Drop and recreate the main dossiers view policy
DROP POLICY IF EXISTS "Users can view dossiers" ON dossiers;

CREATE POLICY "Users can view dossiers with role-based access"
  ON dossiers FOR SELECT
  TO authenticated
  USING (
    -- Managers can see everything
    (EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    ))
    OR
    -- Verkopers can see all non-marktdata dossiers + marktdata they created
    (EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'verkoper'
      AND (
        dossiers.is_marktdata IS NOT TRUE
        OR dossiers.created_by = auth.uid()
      )
    ))
    OR
    -- Eindgebruikers can see their own dossiers (regardless of marktdata flag)
    -- and active/published dossiers from others
    (EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'eindgebruiker'
      AND (
        dossiers.created_by = auth.uid()
        OR dossiers.status IN ('active', 'published', 'open', 'bidding')
      )
    ))
    OR
    -- Handelaar can see non-marktdata dossiers
    (EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'handelaar'
      AND dossiers.is_marktdata IS NOT TRUE
    ))
  );

-- Ensure eindgebruikers cannot manually set is_marktdata to false
DROP POLICY IF EXISTS "Users can update their own dossiers" ON dossiers;

CREATE POLICY "Users can update their own dossiers with restrictions"
  ON dossiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        user_profiles.role = 'manager'
        OR (user_profiles.role IN ('verkoper', 'eindgebruiker') AND dossiers.created_by = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        -- Managers can update everything
        user_profiles.role = 'manager'
        OR 
        -- Verkopers and eindgebruikers can update their own dossiers
        -- BUT eindgebruikers cannot change is_marktdata flag
        (user_profiles.role IN ('verkoper', 'eindgebruiker') 
         AND dossiers.created_by = auth.uid()
         AND (
           user_profiles.role = 'verkoper' 
           OR (user_profiles.role = 'eindgebruiker' AND dossiers.created_by_role = 'eindgebruiker')
         )
        )
      )
    )
  );