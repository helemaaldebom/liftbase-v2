-- Bulk Dealer Deletion Script
-- Use this to delete multiple dealers at once

-- OPTION 1: Delete all dealers WITHOUT auth accounts
-- (dealers that don't have login capability)
/*
DELETE FROM dealers WHERE auth_user_id IS NULL;
*/

-- OPTION 2: Delete dealers by name pattern
-- Example: delete all test dealers
/*
DELETE FROM dealers WHERE name ILIKE '%test%';
*/

-- OPTION 3: Delete specific dealers by ID
-- Replace with actual dealer IDs
/*
DELETE FROM dealers
WHERE id IN (
  'dealer-id-1',
  'dealer-id-2',
  'dealer-id-3'
);
*/

-- OPTION 4: Delete dealers WITH auth accounts (full cleanup)
-- This deletes dealer records AND their auth accounts
DO $$
DECLARE
  dealer_record RECORD;
  deleted_count INTEGER := 0;
BEGIN
  -- Loop through dealers that match your criteria
  FOR dealer_record IN
    SELECT id, auth_user_id, name
    FROM dealers
    WHERE name ILIKE '%test%'  -- CHANGE THIS FILTER
  LOOP
    RAISE NOTICE 'Deleting dealer: % (ID: %)', dealer_record.name, dealer_record.id;

    -- Delete dealer record
    DELETE FROM dealers WHERE id = dealer_record.id;

    -- If dealer had auth account, delete that too
    IF dealer_record.auth_user_id IS NOT NULL THEN
      DELETE FROM user_profiles WHERE id = dealer_record.auth_user_id;
      DELETE FROM auth.users WHERE id = dealer_record.auth_user_id;
      RAISE NOTICE '  ✓ Deleted auth account';
    END IF;

    deleted_count := deleted_count + 1;
  END LOOP;

  RAISE NOTICE 'Total dealers deleted: %', deleted_count;
END $$;
