/*
  # Create dossiers module

  1. New Tables
    - `dossiers`
      - `id` (uuid, primary key)
      - `dossier_number` (text, unique, auto-generated)
      - `title` (text, required)
      - `description` (text)
      - `equipment_type` (text, e.g., 'container', 'trailer', 'chassis')
      - `brand` (text)
      - `model` (text)
      - `year` (integer)
      - `condition` (text, e.g., 'excellent', 'good', 'fair', 'poor')
      - `location` (text)
      - `estimated_value` (decimal)
      - `status` (text, e.g., 'draft', 'open', 'bidding', 'sold', 'archived')
      - `created_by` (uuid, foreign key to user_profiles)
      - `assigned_to` (uuid, foreign key to user_profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `dossier_documents`
      - `id` (uuid, primary key)
      - `dossier_id` (uuid, foreign key to dossiers)
      - `file_name` (text)
      - `file_url` (text)
      - `file_type` (text)
      - `uploaded_by` (uuid, foreign key to user_profiles)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Verkopers can create and manage dossiers
    - Managers can view and manage all dossiers
    - Handelaars can view open dossiers (for bidding)
    - Eindklanten cannot access dossiers
*/

-- Create dossiers table
CREATE TABLE IF NOT EXISTS dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  equipment_type text NOT NULL,
  brand text DEFAULT '',
  model text DEFAULT '',
  year integer,
  condition text DEFAULT 'good',
  location text DEFAULT '',
  estimated_value decimal(12, 2),
  status text DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  assigned_to uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to auto-generate dossier number
CREATE OR REPLACE FUNCTION generate_dossier_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  year_prefix text;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(dossier_number FROM 4) AS integer)), 0) + 1
  INTO next_number
  FROM dossiers
  WHERE dossier_number LIKE year_prefix || '%';
  
  RETURN year_prefix || LPAD(next_number::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate dossier number on insert
CREATE OR REPLACE FUNCTION set_dossier_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.dossier_number IS NULL OR NEW.dossier_number = '' THEN
    NEW.dossier_number := generate_dossier_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_dossier_number
  BEFORE INSERT ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION set_dossier_number();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dossiers_updated_at
  BEFORE UPDATE ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create dossier_documents table
CREATE TABLE IF NOT EXISTS dossier_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text DEFAULT '',
  uploaded_by uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dossiers

-- Verkopers can view dossiers they created or are assigned to
CREATE POLICY "Verkopers can view own dossiers"
  ON dossiers
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'verkoper'
    AND (created_by = auth.uid() OR assigned_to = auth.uid())
  );

-- Managers can view all dossiers
CREATE POLICY "Managers can view all dossiers"
  ON dossiers
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  );

-- Handelaars can view open dossiers for bidding
CREATE POLICY "Handelaars can view open dossiers"
  ON dossiers
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'handelaar'
    AND status IN ('open', 'bidding')
  );

-- Verkopers can create dossiers
CREATE POLICY "Verkopers can create dossiers"
  ON dossiers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('verkoper', 'manager')
    AND created_by = auth.uid()
  );

-- Verkopers can update own dossiers
CREATE POLICY "Verkopers can update own dossiers"
  ON dossiers
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'verkoper'
    AND (created_by = auth.uid() OR assigned_to = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'verkoper'
    AND (created_by = auth.uid() OR assigned_to = auth.uid())
  );

-- Managers can update all dossiers
CREATE POLICY "Managers can update all dossiers"
  ON dossiers
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  );

-- Managers can delete dossiers
CREATE POLICY "Managers can delete dossiers"
  ON dossiers
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  );

-- RLS Policies for dossier_documents

-- Users can view documents for dossiers they have access to
CREATE POLICY "Users can view documents for accessible dossiers"
  ON dossier_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = dossier_documents.dossier_id
    )
  );

-- Verkopers and managers can upload documents
CREATE POLICY "Verkopers and managers can upload documents"
  ON dossier_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('verkoper', 'manager')
    AND uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = dossier_documents.dossier_id
    )
  );

-- Managers can delete documents
CREATE POLICY "Managers can delete documents"
  ON dossier_documents
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dossiers_created_by ON dossiers(created_by);
CREATE INDEX IF NOT EXISTS idx_dossiers_assigned_to ON dossiers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_dossiers_status ON dossiers(status);
CREATE INDEX IF NOT EXISTS idx_dossiers_created_at ON dossiers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dossier_documents_dossier_id ON dossier_documents(dossier_id);
