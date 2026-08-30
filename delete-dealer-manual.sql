-- Manual Dealer Deletion Script
-- Run this in Supabase SQL Editor to delete a dealer (with or without auth account)

-- STEP 1: Find the dealer you want to delete
-- Uncomment and run this query first:
/*
SELECT
  d.id as dealer_id,
  d.name,
  d.email,
  d.auth_user_id,
  CASE
    WHEN d.auth_user_id IS NULL THEN 'Geen login'
    ELSE 'Met login'
  END as login_status
FROM dealers d
ORDER BY d.created_at DESC;
*/

-- STEP 2: Delete dealer WITHOUT login account
-- Replace 'DEALER_ID_HERE' with the actual dealer ID from step 1
/*
DELETE FROM dealers WHERE id = 'DEALER_ID_HERE';
*/

-- STEP 3: Delete dealer WITH login account (complete cleanup)
-- Replace 'DEALER_ID_HERE' with the actual dealer ID from step 1
DO $$
DECLARE
  v_dealer_id uuid := 'DEALER_ID_HERE';  -- Replace with actual dealer ID
  v_auth_user_id uuid;
BEGIN
  -- Get the auth_user_id if it exists
  SELECT auth_user_id INTO v_auth_user_id
  FROM dealers
  WHERE id = v_dealer_id;

  -- Delete dealer record
  DELETE FROM dealers WHERE id = v_dealer_id;
  RAISE NOTICE 'Deleted dealer record: %', v_dealer_id;

  -- If dealer had auth account, delete that too
  IF v_auth_user_id IS NOT NULL THEN
    DELETE FROM user_profiles WHERE id = v_auth_user_id;
    RAISE NOTICE 'Deleted user profile: %', v_auth_user_id;

    DELETE FROM auth.users WHERE id = v_auth_user_id;
    RAISE NOTICE 'Deleted auth user: %', v_auth_user_id;
  END IF;

  RAISE NOTICE 'Dealer successfully deleted!';
END $$;
