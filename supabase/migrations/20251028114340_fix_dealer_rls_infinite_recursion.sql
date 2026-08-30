/*
  # Fix Dealer RLS Infinite Recursion
  
  1. Problem
    - The dealer policy is causing infinite recursion
    - Normal users (managers/verkopers) are blocked by the dealer policy
  
  2. Solution
    - Drop the dealer-specific SELECT policy
    - Dealers will use the existing policies (they can view dossiers through their created_by or manager policies)
    - Dealers access dossiers through a separate dealer-specific page that doesn't require RLS
  
  3. Security
    - Application-level checks in DealerDossierViewPage ensure dealers only see their assigned dossiers
    - Existing RLS policies for managers and verkopers remain intact
*/

-- Drop the problematic dealer policy
DROP POLICY IF EXISTS "Dealers can view dossiers they have bids for" ON dossiers;

-- Drop similar policies on other tables
DROP POLICY IF EXISTS "Dealers can view forklift details for their bids" ON forklift_details;
DROP POLICY IF EXISTS "Dealers can view ECH details for their bids" ON empty_container_handler_details;
DROP POLICY IF EXISTS "Dealers can view reachstacker details for their bids" ON reachstacker_details;
DROP POLICY IF EXISTS "Dealers can view terminal tractor details for their bids" ON terminal_tractor_details;
DROP POLICY IF EXISTS "Dealers can view photos for their bids" ON photos;

-- Keep the bid policies for dealers (these don't cause recursion)
-- Dealers can still view and update their own bids
