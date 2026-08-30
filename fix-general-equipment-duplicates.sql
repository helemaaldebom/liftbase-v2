-- Fix General Equipment Ltd duplicates
-- This script merges duplicate "General Equipment Ltd" records into one

-- Step 1: Find all General Equipment customers
DO $$
DECLARE
  keep_id uuid;
  duplicate_ids uuid[];
  duplicate_count int;
BEGIN
  -- Get all customer IDs with "General Equipment" in the name
  SELECT array_agg(id) INTO duplicate_ids
  FROM customers
  WHERE company_name ILIKE '%General Equipment%';

  -- Count how many we found
  duplicate_count := array_length(duplicate_ids, 1);

  IF duplicate_count IS NULL OR duplicate_count < 2 THEN
    RAISE NOTICE 'No duplicates found. Nothing to merge.';
  ELSE
    RAISE NOTICE 'Found % General Equipment customer(s)', duplicate_count;

    -- Keep the first one
    keep_id := duplicate_ids[1];
    RAISE NOTICE 'Keeping customer ID: %', keep_id;

    -- Update the name to "General Equipmet Ltd" (with typo as requested)
    UPDATE customers
    SET company_name = 'General Equipmet Ltd'
    WHERE id = keep_id;

    RAISE NOTICE 'Updated customer name to "General Equipmet Ltd"';

    -- Remove the keep_id from the duplicate_ids array
    duplicate_ids := duplicate_ids[2:duplicate_count];

    IF array_length(duplicate_ids, 1) > 0 THEN
      -- Update all maintenance_documents that reference the duplicates
      UPDATE maintenance_documents
      SET customer_id = keep_id
      WHERE customer_id = ANY(duplicate_ids);

      RAISE NOTICE 'Updated maintenance_documents';

      -- Update all temporary_dossier_access that reference the duplicates
      UPDATE temporary_dossier_access
      SET customer_id = keep_id
      WHERE customer_id = ANY(duplicate_ids);

      RAISE NOTICE 'Updated temporary_dossier_access';

      -- Delete the duplicate customers
      DELETE FROM customers
      WHERE id = ANY(duplicate_ids);

      RAISE NOTICE 'Deleted % duplicate customer(s)', array_length(duplicate_ids, 1);
    END IF;

    RAISE NOTICE 'Merge complete!';
  END IF;
END $$;

-- Also update any dossiers with General Equipment variations to use consistent name
UPDATE dossiers
SET customer_name = 'General Equipmet Ltd'
WHERE customer_name ILIKE '%General Equipment%'
  AND customer_name != 'General Equipmet Ltd';
