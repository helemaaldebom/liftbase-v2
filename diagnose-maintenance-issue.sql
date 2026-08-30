-- Diagnostic queries for maintenance module

-- 1. Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('customers', 'maintenance_documents', 'maintenance_line_items', 'temporary_dossier_access')
ORDER BY table_name;

-- 2. Count documents (bypassing RLS as service role)
SELECT COUNT(*) as document_count FROM maintenance_documents;

-- 3. Check current user role
SELECT id, email, role FROM user_profiles WHERE id = auth.uid();

-- 4. List all RLS policies on maintenance_documents
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'maintenance_documents'
ORDER BY policyname;

-- 5. Sample document data (first 3 documents)
SELECT
  id,
  file_name,
  customer_id,
  extraction_status,
  match_status,
  uploaded_at
FROM maintenance_documents
ORDER BY uploaded_at DESC
LIMIT 3;

-- 6. Check customers table
SELECT COUNT(*) as customer_count FROM customers;
