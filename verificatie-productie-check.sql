-- Verificatie productie-database vs. losse root-SQL-scripts (11-08-2026)
-- 100% read-only: alleen SELECT's op systeemcatalogi.
-- Draaien in Supabase SQL Editor, resultaat exporteren als CSV.

-- 1. Alle tabellen
SELECT 'tabel' AS categorie, tablename AS naam, '' AS detail
FROM pg_tables WHERE schemaname = 'public'

UNION ALL

-- 2. Alle triggers
SELECT DISTINCT 'trigger', trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'

UNION ALL

-- 3. Alle RLS-policies (incl. commando-type)
SELECT 'policy', policyname, tablename || ' (' || cmd || ')'
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

-- 4. Storage-policies (voor foto/document-buckets)
SELECT 'storage-policy', policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'

UNION ALL

-- 5. CHECK-constraints op advertisement_publications en dossiers
SELECT 'check-constraint', conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN ('advertisement_publications', 'dossiers', 'documents')
  AND c.contype = 'c'

UNION ALL

-- 6. Sentinel-kolommen uit de losse scripts: bestaat de kolom?
SELECT 'kolom', table_name || '.' || column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (
    ('photos', 'rotation_degrees'),
    ('photos', 'visible_online'),
    ('photos', 'display_order'),
    ('dossiers', 'sale_price'),
    ('dossiers', 'sold_at'),
    ('dossiers', 'sold_via_platform'),
    ('dossiers', 'latitude'),
    ('dossiers', 'longitude'),
    ('dossiers', 'customer_name'),
    ('dossiers', 'customer_id'),
    ('dossiers', 'fleet_number'),
    ('dossiers', 'serienummer'),
    ('dossiers', 'merk'),
    ('dossiers', 'is_marktdata'),
    ('dossiers', 'eindklantprijs'),
    ('dossiers', 'handelsprijs'),
    ('dossiers', 'fifth_wheel_height_mm'),
    ('reachstacker_details', 'stacking_height_8_6'),
    ('reachstacker_details', 'customer_fleet_number'),
    ('terminal_tractor_details', 'wheelbase_mm'),
    ('terminal_tractor_details', 'customer_fleet_number'),
    ('forklift_details', 'customer_fleet_number'),
    ('empty_container_handler_details', 'customer_fleet_number')
  )

ORDER BY categorie, naam;
