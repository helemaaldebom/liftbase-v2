-- =====================================================
-- MAINTENANCE COST DASHBOARD MODULE - COMPLETE SETUP
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to set up the maintenance module
-- 
-- This creates:
-- - customers table
-- - maintenance_documents table
-- - maintenance_line_items table
-- - customer_classification_rules table
-- - fx_rates table
-- - temporary_dossier_access table
-- - All necessary RLS policies
-- - Storage bucket for documents
-- - Helper views for dashboards
-- =====================================================

-- 1. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_person text,
  email text UNIQUE,
  phone text,
  address text,
  city text,
  country text,
  notes text,
  is_active boolean DEFAULT true,
  default_currency text DEFAULT 'EUR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Customers RLS policies
DROP POLICY IF EXISTS "Customers can read own profile" ON customers;
CREATE POLICY "Customers can read own profile" ON customers FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('manager', 'verkoper')
));

DROP POLICY IF EXISTS "Managers can manage all customers" ON customers;
CREATE POLICY "Managers can manage all customers" ON customers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'manager'));

-- 2. ADD COLUMNS TO DOSSIERS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dossiers' AND column_name = 'customer_id') THEN
    ALTER TABLE dossiers ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
    CREATE INDEX idx_dossiers_customer_id ON dossiers(customer_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dossiers' AND column_name = 'fleet_number') THEN
    ALTER TABLE dossiers ADD COLUMN fleet_number text;
    CREATE INDEX idx_dossiers_fleet_number ON dossiers(fleet_number);
  END IF;
END $$;

-- Add customer access policy to dossiers
DROP POLICY IF EXISTS "Customers can view own dossiers" ON dossiers;
CREATE POLICY "Customers can view own dossiers" ON dossiers FOR SELECT TO authenticated
USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- 3. TEMPORARY DOSSIER ACCESS
CREATE TABLE IF NOT EXISTS temporary_dossier_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES user_profiles(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  notes text,
  CONSTRAINT valid_expiry CHECK (expires_at > granted_at)
);

CREATE INDEX IF NOT EXISTS idx_temp_access_dossier ON temporary_dossier_access(dossier_id);
CREATE INDEX IF NOT EXISTS idx_temp_access_customer ON temporary_dossier_access(customer_id);
CREATE INDEX IF NOT EXISTS idx_temp_access_expires ON temporary_dossier_access(expires_at);
ALTER TABLE temporary_dossier_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can manage temporary access" ON temporary_dossier_access;
CREATE POLICY "Managers can manage temporary access" ON temporary_dossier_access FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'manager'));

DROP POLICY IF EXISTS "Customers can view their temporary access" ON temporary_dossier_access;
CREATE POLICY "Customers can view their temporary access" ON temporary_dossier_access FOR SELECT TO authenticated
USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Customers can view temporarily granted dossiers" ON dossiers;
CREATE POLICY "Customers can view temporarily granted dossiers" ON dossiers FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM temporary_dossier_access tda
  JOIN customers c ON c.id = tda.customer_id
  WHERE tda.dossier_id = dossiers.id AND c.user_id = auth.uid()
  AND tda.expires_at > now() AND tda.revoked_at IS NULL
));

-- 4. MAINTENANCE DOCUMENTS
CREATE TABLE IF NOT EXISTS maintenance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  dossier_id uuid REFERENCES dossiers(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  file_hash text NOT NULL,
  match_status text NOT NULL DEFAULT 'pending',
  serial_numbers text[],
  fleet_numbers text[],
  matching_notes text,
  document_date date,
  currency text DEFAULT 'EUR',
  total_amount_excl_vat decimal(10,2),
  supplier_name text,
  invoice_number text,
  extraction_status text DEFAULT 'pending',
  extraction_completed_at timestamptz,
  extraction_error text,
  raw_extraction_data jsonb,
  uploaded_by uuid REFERENCES user_profiles(id),
  uploaded_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_match_status CHECK (match_status IN ('pending', 'matched', 'unmatched', 'ambiguous', 'manual')),
  CONSTRAINT valid_extraction_status CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_maintenance_docs_customer ON maintenance_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_docs_dossier ON maintenance_documents(dossier_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_docs_hash ON maintenance_documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_maintenance_docs_status ON maintenance_documents(match_status);
CREATE INDEX IF NOT EXISTS idx_maintenance_docs_date ON maintenance_documents(document_date);
ALTER TABLE maintenance_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own documents" ON maintenance_documents;
CREATE POLICY "Customers can view own documents" ON maintenance_documents FOR SELECT TO authenticated
USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Customers can insert own documents" ON maintenance_documents;
CREATE POLICY "Customers can insert own documents" ON maintenance_documents FOR INSERT TO authenticated
WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Customers can update own documents" ON maintenance_documents;
CREATE POLICY "Customers can update own documents" ON maintenance_documents FOR UPDATE TO authenticated
USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Managers can manage all documents" ON maintenance_documents;
CREATE POLICY "Managers can manage all documents" ON maintenance_documents FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'manager'));

-- 5. MAINTENANCE LINE ITEMS
CREATE TABLE IF NOT EXISTS maintenance_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES maintenance_documents(id) ON DELETE CASCADE,
  dossier_id uuid REFERENCES dossiers(id) ON DELETE SET NULL,
  line_number integer NOT NULL,
  description text NOT NULL,
  amount_excl_vat decimal(10,2) NOT NULL,
  currency text DEFAULT 'EUR',
  category text NOT NULL DEFAULT 'unclassified',
  category_confidence decimal(3,2),
  classified_by text DEFAULT 'ai',
  classification_rule_id uuid,
  service_interval_hours integer,
  meter_reading integer,
  modified_by_customer boolean DEFAULT false,
  modified_at timestamptz,
  original_category text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_category CHECK (category IN ('preventive', 'corrective', 'tires', 'unclassified')),
  CONSTRAINT valid_classified_by CHECK (classified_by IN ('ai', 'user', 'rule'))
);

CREATE INDEX IF NOT EXISTS idx_line_items_document ON maintenance_line_items(document_id);
CREATE INDEX IF NOT EXISTS idx_line_items_dossier ON maintenance_line_items(dossier_id);
CREATE INDEX IF NOT EXISTS idx_line_items_category ON maintenance_line_items(category);
CREATE INDEX IF NOT EXISTS idx_line_items_modified ON maintenance_line_items(modified_by_customer);
ALTER TABLE maintenance_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own line items" ON maintenance_line_items;
CREATE POLICY "Customers can view own line items" ON maintenance_line_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM maintenance_documents md JOIN customers c ON c.id = md.customer_id
  WHERE md.id = maintenance_line_items.document_id AND c.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Customers can update own line items" ON maintenance_line_items;
CREATE POLICY "Customers can update own line items" ON maintenance_line_items FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM maintenance_documents md JOIN customers c ON c.id = md.customer_id
  WHERE md.id = maintenance_line_items.document_id AND c.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Managers can manage all line items" ON maintenance_line_items;
CREATE POLICY "Managers can manage all line items" ON maintenance_line_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'manager'));

-- 6. CLASSIFICATION RULES
CREATE TABLE IF NOT EXISTS customer_classification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  match_type text NOT NULL DEFAULT 'keyword',
  match_value text NOT NULL,
  match_field text NOT NULL DEFAULT 'description',
  target_category text NOT NULL,
  confidence_boost decimal(3,2) DEFAULT 0.20,
  created_from_line_item_id uuid,
  times_applied integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  last_applied_at timestamptz,
  CONSTRAINT valid_target_category CHECK (target_category IN ('preventive', 'corrective', 'tires')),
  CONSTRAINT valid_match_type CHECK (match_type IN ('keyword', 'supplier', 'description_pattern', 'exact_match')),
  CONSTRAINT valid_match_field CHECK (match_field IN ('description', 'supplier_name'))
);

CREATE INDEX IF NOT EXISTS idx_classification_rules_customer ON customer_classification_rules(customer_id);
CREATE INDEX IF NOT EXISTS idx_classification_rules_active ON customer_classification_rules(is_active);
ALTER TABLE customer_classification_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can manage own rules" ON customer_classification_rules;
CREATE POLICY "Customers can manage own rules" ON customer_classification_rules FOR ALL TO authenticated
USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Managers can manage all rules" ON customer_classification_rules;
CREATE POLICY "Managers can manage all rules" ON customer_classification_rules FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'manager'));

-- 7. FX RATES
CREATE TABLE IF NOT EXISTS fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate decimal(12,6) NOT NULL,
  provider text NOT NULL,
  provider_timestamp timestamptz,
  fetched_at timestamptz DEFAULT now(),
  is_latest boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_provider CHECK (provider IN ('exchangerate-api', 'fixer', 'currencyapi')),
  CONSTRAINT different_currencies CHECK (from_currency != to_currency)
);

CREATE INDEX IF NOT EXISTS idx_fx_rates_currencies ON fx_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_fx_rates_latest ON fx_rates(is_latest) WHERE is_latest = true;
CREATE INDEX IF NOT EXISTS idx_fx_rates_fetched ON fx_rates(fetched_at);
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read fx rates" ON fx_rates;
CREATE POLICY "Authenticated users can read fx rates" ON fx_rates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Managers can manage fx rates" ON fx_rates;
CREATE POLICY "Managers can manage fx rates" ON fx_rates FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'manager'));

-- 8. TRIGGERS
CREATE OR REPLACE FUNCTION update_maintenance_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_maintenance_updated_at();

DROP TRIGGER IF EXISTS update_maintenance_documents_updated_at ON maintenance_documents;
CREATE TRIGGER update_maintenance_documents_updated_at BEFORE UPDATE ON maintenance_documents
FOR EACH ROW EXECUTE FUNCTION update_maintenance_updated_at();

DROP TRIGGER IF EXISTS update_maintenance_line_items_updated_at ON maintenance_line_items;
CREATE TRIGGER update_maintenance_line_items_updated_at BEFORE UPDATE ON maintenance_line_items
FOR EACH ROW EXECUTE FUNCTION update_maintenance_updated_at();

-- 9. VIEWS FOR DASHBOARDS
CREATE OR REPLACE VIEW maintenance_costs_by_dossier AS
SELECT
  d.id as dossier_id, d.dossier_number, d.customer_id,
  COUNT(DISTINCT md.id) as document_count, COUNT(mli.id) as line_item_count,
  COALESCE(SUM(CASE WHEN mli.category = 'preventive' THEN mli.amount_excl_vat ELSE 0 END), 0) as preventive_cost,
  COALESCE(SUM(CASE WHEN mli.category = 'corrective' THEN mli.amount_excl_vat ELSE 0 END), 0) as corrective_cost,
  COALESCE(SUM(CASE WHEN mli.category = 'tires' THEN mli.amount_excl_vat ELSE 0 END), 0) as tires_cost,
  COALESCE(SUM(mli.amount_excl_vat), 0) as total_cost,
  CASE WHEN d.uren > 0 THEN COALESCE(SUM(mli.amount_excl_vat), 0) / d.uren ELSE NULL END as cost_per_hour,
  MAX(md.document_date) as latest_maintenance_date,
  MODE() WITHIN GROUP (ORDER BY mli.currency) as primary_currency
FROM dossiers d
LEFT JOIN maintenance_documents md ON md.dossier_id = d.id
LEFT JOIN maintenance_line_items mli ON mli.document_id = md.id
GROUP BY d.id, d.dossier_number, d.customer_id, d.uren;

CREATE OR REPLACE VIEW maintenance_costs_by_fleet AS
SELECT
  c.id as customer_id, c.company_name,
  COUNT(DISTINCT d.id) as machine_count, COUNT(DISTINCT md.id) as total_documents,
  COALESCE(SUM(CASE WHEN mli.category = 'preventive' THEN mli.amount_excl_vat ELSE 0 END), 0) as total_preventive,
  COALESCE(SUM(CASE WHEN mli.category = 'corrective' THEN mli.amount_excl_vat ELSE 0 END), 0) as total_corrective,
  COALESCE(SUM(CASE WHEN mli.category = 'tires' THEN mli.amount_excl_vat ELSE 0 END), 0) as total_tires,
  COALESCE(SUM(mli.amount_excl_vat), 0) as total_cost,
  CASE WHEN COUNT(DISTINCT d.id) > 0 THEN COALESCE(SUM(mli.amount_excl_vat), 0) / COUNT(DISTINCT d.id) ELSE 0 END as avg_cost_per_machine
FROM customers c
LEFT JOIN dossiers d ON d.customer_id = c.id
LEFT JOIN maintenance_documents md ON md.dossier_id = d.id
LEFT JOIN maintenance_line_items mli ON mli.document_id = md.id
GROUP BY c.id, c.company_name;

-- 10. STORAGE BUCKET (Note: Run this separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('maintenance-documents', 'maintenance-documents', false) ON CONFLICT DO NOTHING;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Next steps:
-- 1. Deploy Edge Functions:
--    - extract-maintenance-document
--    - fetch-fx-rates
-- 2. Create storage bucket 'maintenance-documents' in Supabase dashboard
-- 3. Set up API keys in Edge Function secrets:
--    - OPENAI_API_KEY
--    - EXCHANGERATE_API_KEY (optional)
--    - FIXER_API_KEY (optional)
--    - CURRENCYAPI_KEY (optional)
-- =====================================================
