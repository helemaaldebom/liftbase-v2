/*
  Fix HTTP Request Queue Null URL Error

  This error occurs when a database trigger or function tries to make
  an HTTP request with a null URL using pg_net extension.

  Execute this in Supabase SQL Editor
*/

-- Step 1: Find all functions that use pg_net
SELECT
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosrc LIKE '%net.http%'
   OR p.prosrc LIKE '%http_request%'
   OR p.proname LIKE '%http%'
ORDER BY n.nspname, p.proname;

-- Step 2: Find all triggers that might be problematic
SELECT
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgname NOT LIKE 'RI_%'
ORDER BY tgrelid::regclass::text, tgname;

-- Step 3: Check if pg_net extension is installed
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Step 4: Clear any stuck entries in http_request_queue
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'net'
        AND table_name = 'http_request_queue'
    ) THEN
        -- Count entries with null URLs
        RAISE NOTICE 'Found % entries with null URLs',
            (SELECT COUNT(*) FROM net.http_request_queue WHERE url IS NULL);

        -- Delete them
        DELETE FROM net.http_request_queue WHERE url IS NULL;

        RAISE NOTICE 'Cleared null URL entries from http_request_queue';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not access http_request_queue: %', SQLERRM;
END $$;

-- Step 5: If you find a specific trigger causing issues, drop it like this:
-- DROP TRIGGER IF EXISTS trigger_name ON table_name;

SELECT 'Review the results above to identify problematic triggers or functions' as next_step;
