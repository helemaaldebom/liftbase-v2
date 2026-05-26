-- Quick User Deletion by Email
-- Run this in Supabase SQL Editor
-- Replace 'user@example.com' with the actual email

DO $$
DECLARE
  v_user_id uuid;
  v_dealer_id uuid;
  v_email text := 'user@example.com';  -- REPLACE THIS
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM user_profiles
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found with email: %', v_email;
    RETURN;
  END IF;

  RAISE NOTICE 'Found user: % (ID: %)', v_email, v_user_id;

  -- Check if user is a dealer
  SELECT id INTO v_dealer_id
  FROM dealers
  WHERE auth_user_id = v_user_id;

  -- Delete dealer record if exists
  IF v_dealer_id IS NOT NULL THEN
    DELETE FROM dealers WHERE id = v_dealer_id;
    RAISE NOTICE '✓ Deleted dealer record';
  END IF;

  -- Delete user profile
  DELETE FROM user_profiles WHERE id = v_user_id;
  RAISE NOTICE '✓ Deleted user profile';

  -- Delete auth user
  DELETE FROM auth.users WHERE id = v_user_id;
  RAISE NOTICE '✓ Deleted auth user';

  RAISE NOTICE 'User % successfully deleted!', v_email;
END $$;
