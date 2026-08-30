-- Manual User Deletion Script
-- Run this in Supabase SQL Editor to delete a user and all related data

-- STEP 1: Find the user you want to delete
-- Uncomment and run this query first to find the user ID:
/*
SELECT
  up.id,
  up.email,
  up.full_name,
  up.role,
  d.id as dealer_id,
  d.name as dealer_name
FROM user_profiles up
LEFT JOIN dealers d ON d.auth_user_id = up.id
ORDER BY up.created_at DESC;
*/

-- STEP 2: Delete the user
-- Replace 'USER_ID_HERE' with the actual user ID from step 1

DO $$
DECLARE
  v_user_id uuid := 'USER_ID_HERE';  -- Replace with actual user ID
  v_dealer_id uuid;
BEGIN
  -- Check if user is a dealer with auth account
  SELECT id INTO v_dealer_id
  FROM dealers
  WHERE auth_user_id = v_user_id;

  -- Delete dealer record if exists
  IF v_dealer_id IS NOT NULL THEN
    DELETE FROM dealers WHERE id = v_dealer_id;
    RAISE NOTICE 'Deleted dealer record: %', v_dealer_id;
  END IF;

  -- Delete user profile
  DELETE FROM user_profiles WHERE id = v_user_id;
  RAISE NOTICE 'Deleted user profile: %', v_user_id;

  -- Delete from auth.users (requires service role)
  DELETE FROM auth.users WHERE id = v_user_id;
  RAISE NOTICE 'Deleted auth user: %', v_user_id;

  RAISE NOTICE 'User successfully deleted!';
END $$;
