-- Fix RLS policies for maintenance module to include verkopers

-- 1. Update customers policy to include verkopers
DROP POLICY IF EXISTS "Customers can read own profile" ON customers;
CREATE POLICY "Customers can read own profile" ON customers FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('manager', 'verkoper')
  )
);

-- 2. Add verkoper policy for maintenance_documents
DROP POLICY IF EXISTS "Verkopers can view all documents" ON maintenance_documents;
CREATE POLICY "Verkopers can view all documents" ON maintenance_documents FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.id = auth.uid()
  AND user_profiles.role = 'verkoper'
));

DROP POLICY IF EXISTS "Verkopers can insert documents" ON maintenance_documents;
CREATE POLICY "Verkopers can insert documents" ON maintenance_documents FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.id = auth.uid()
  AND user_profiles.role = 'verkoper'
));

DROP POLICY IF EXISTS "Verkopers can update documents" ON maintenance_documents;
CREATE POLICY "Verkopers can update documents" ON maintenance_documents FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.id = auth.uid()
  AND user_profiles.role = 'verkoper'
));

-- 3. Add verkoper policy for maintenance_line_items
DROP POLICY IF EXISTS "Verkopers can view all line items" ON maintenance_line_items;
CREATE POLICY "Verkopers can view all line items" ON maintenance_line_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.id = auth.uid()
  AND user_profiles.role = 'verkoper'
));

DROP POLICY IF EXISTS "Verkopers can manage line items" ON maintenance_line_items;
CREATE POLICY "Verkopers can manage line items" ON maintenance_line_items FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.id = auth.uid()
  AND user_profiles.role = 'verkoper'
));

-- 4. Add verkoper policy for temporary_dossier_access
DROP POLICY IF EXISTS "Verkopers can manage temporary access" ON temporary_dossier_access;
CREATE POLICY "Verkopers can manage temporary access" ON temporary_dossier_access FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.id = auth.uid()
  AND user_profiles.role = 'verkoper'
));

-- 5. Add verkoper policy for customer_classification_rules
DROP POLICY IF EXISTS "Verkopers can view all rules" ON customer_classification_rules;
CREATE POLICY "Verkopers can view all rules" ON customer_classification_rules FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.id = auth.uid()
  AND user_profiles.role = 'verkoper'
));
