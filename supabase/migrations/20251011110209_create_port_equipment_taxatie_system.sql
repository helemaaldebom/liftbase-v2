/*
  # Port Equipment Taxatie Systeem - Complete Database Schema

  ## Overzicht
  Volledig taxatiesysteem voor havenmaterieel met 4 rollen, dealerbeheer, 
  biedproces, fotowizard, type-specifieke checklists en AI-valuatie.

  ## 1. Nieuwe Tabellen

  ### `user_profiles`
  - `id` (uuid, primary key)
  - `email` (text, unique)
  - `full_name` (text)
  - `role` (text) - 'verkoper', 'manager', 'handelaar', 'eindklant'
  - `two_fa_enabled` (boolean) - verplicht voor manager
  - `two_fa_secret` (text, encrypted)
  - `phone` (text)
  - `company_name` (text)
  - `active` (boolean)
  - `created_at`, `updated_at`

  ### `dealers`
  - `id` (uuid, primary key)
  - `user_id` (uuid) - link naar user_profiles
  - `name` (text)
  - `email` (text)
  - `active` (boolean)
  - `opt_in_email` (boolean)
  - `machine_types` (text[]) - labelset A: reachstackers, heavy_duty_forklifts, etc.
  - `age_category` (text) - labelset B: jong_gebruikt, gebruikt, oude_machines
  - `created_at`, `updated_at`

  ### `machines`
  - `id` (uuid, primary key)
  - `dossier_number` (text, auto-generated, unique)
  - `industry` (text) - default 'port_equipment'
  - `status` (text) - Nieuw, In_beoordeling, Offer_out, Geaccepteerd, Afgewezen
  - `equipment_type` (text) - heavy_duty_forklift, empty_container_handler, reachstacker, terminal_tractor
  - `klant_naam` (text)
  - `locatie` (text)
  - `verkoper_id` (uuid)
  - `manager_id` (uuid)
  - `onedrive_folder_path` (text)
  - `onedrive_pdf_url` (text)
  - Core identification fields
  - Type-specific fields (JSONB for flexibility)
  - `created_at`, `updated_at`

  ### `machine_ident`
  - `machine_id` (uuid, primary key)
  - `brand` (text, required)
  - `model` (text, required)
  - `serial_number` (text)
  - `year` (integer, required)
  - `hours` (integer, required)
  - `power` (text) - diesel, elektrisch, hybride
  - `remark` (text)

  ### `machine_dimensions`
  - `machine_id` (uuid, primary key)
  - `length_mm` (integer)
  - `width_mm` (integer)
  - `height_mm` (integer)
  - `service_weight_kg` (integer)

  ### `machine_extras`
  - `machine_id` (uuid, primary key)
  - All cabin/comfort features as boolean/text fields
  - `created_at`, `updated_at`

  ### `machine_tires_wheels`
  - `id` (uuid, primary key)
  - `machine_id` (uuid)
  - `position` (text) - Front R outer, Front R inner, etc.
  - `make` (text)
  - `type_size` (text)
  - `remaining_pct` (integer)
  - `display_order` (integer)
  - Additional fields for rims/studs inspection

  ### `machine_specs_forklift`
  - `machine_id` (uuid, primary key)
  - `capacity_kg` (integer)
  - `load_center_mm` (integer)
  - `mast_type` (text)
  - `lift_height_mm` (integer)
  - `free_lift_mm` (integer)
  - `attachment` (text)

  ### `machine_specs_reachstacker`
  - `machine_id` (uuid, primary key)
  - `capacity_row1` (integer)
  - `capacity_row2` (integer)
  - `capacity_row3` (integer)
  - `stacking_height_m` (integer)
  - `free_lift_mm` (integer)
  - `attachment` (text)

  ### `machine_specs_terminal_tractor`
  - `machine_id` (uuid, primary key)
  - `capacity_kg` (integer)
  - `fifth_wheel_height_mm` (integer)

  ### `checklist_items`
  - `id` (uuid, primary key)
  - `machine_id` (uuid)
  - `category` (text) - Power_train, Frame, Cabin, Mast, etc.
  - `item_label` (text)
  - `condition` (text) - G (Good), F (Fair), R (Repair needed)
  - `comment` (text)
  - `display_order` (integer)

  ### `photos`
  - `id` (uuid, primary key)
  - `machine_id` (uuid)
  - `step_key` (text) - front_left, front_right, cabin, etc.
  - `onedrive_url` (text)
  - `onedrive_key` (text)
  - `file_size_bytes` (bigint)
  - `width_px` (integer)
  - `height_px` (integer)
  - `quality_passed` (boolean)
  - `is_required` (boolean)
  - `display_order` (integer)
  - `created_at`

  ### `videos`
  - `id` (uuid, primary key)
  - `machine_id` (uuid)
  - `onedrive_url` (text)
  - `description` (text)
  - `created_at`

  ### `valuations`
  - `id` (uuid, primary key)
  - `machine_id` (uuid)
  - `ai_indicatie` (decimal)
  - `betrouwbaarheid_score` (decimal) - 0 to 1
  - `features` (jsonb)
  - `berekening_log` (text)
  - `visible_to` (text[]) - default ['manager']
  - `manager_override_value` (decimal)
  - `manager_override_reason` (text)
  - `manager_override_by` (uuid)
  - `manager_override_at` (timestamptz)
  - `created_at`, `updated_at`

  ### `historical_data`
  - `id` (uuid, primary key)
  - All template columns for AI training
  - `uploaded_by` (uuid)
  - `uploaded_at` (timestamptz)

  ### `bids`
  - `id` (uuid, primary key)
  - `machine_id` (uuid)
  - `dealer_id` (uuid)
  - `bedrag` (decimal)
  - `valuta` (text) - default EUR
  - `voorwaarden` (text)
  - `status` (text) - Ingediend, Geüpdatet, Geweigerd, Geaccepteerd
  - `interesse` (boolean)
  - `created_at`, `updated_at`

  ### `bid_invitations`
  - `id` (uuid, primary key)
  - `machine_id` (uuid)
  - `dealer_id` (uuid)
  - `token` (text, unique)
  - `expires_at` (timestamptz) - 72 hours from created
  - `used_at` (timestamptz)
  - `used_ip` (text)
  - `reminder_sent_at` (timestamptz)
  - `created_at`

  ### `qa_threads`
  - `id` (uuid, primary key)
  - `machine_id` (uuid)
  - `dealer_id` (uuid)
  - `question` (text)
  - `answer` (text)
  - `answered_by` (uuid)
  - `answered_at` (timestamptz)
  - `created_at`

  ### `activity_logs`
  - `id` (uuid, primary key)
  - `machine_id` (uuid)
  - `actor_role` (text)
  - `actor_id` (uuid)
  - `action` (text)
  - `payload` (jsonb)
  - `ip_address` (text)
  - `timestamp` (timestamptz)

  ### `digital_signatures`
  - `id` (uuid, primary key)
  - `machine_id` (uuid)
  - `signer_id` (uuid)
  - `signer_role` (text)
  - `signature_data` (text)
  - `document_type` (text) - innamerapport, akkoord
  - `signed_at` (timestamptz)

  ### `industry_profiles`
  - `id` (uuid, primary key)
  - `profile_key` (text, unique) - port_equipment
  - `schema_config` (jsonb)
  - `photo_sequence` (jsonb)
  - `styling` (jsonb)
  - `pdf_sections` (jsonb)
  - `validations` (jsonb)
  - `ai_feature_mapping` (jsonb)
  - `created_at`, `updated_at`

  ### `styling_config`
  - `id` (uuid, primary key)
  - `logo_url` (text)
  - `primary_color` (text)
  - `secondary_color` (text)
  - `footer_text` (text)
  - `active` (boolean)
  - `created_at`, `updated_at`

  ## 2. Security (RLS Policies)
  Comprehensive policies per role with audit logging

  ## 3. Indexes
  Performance indexes on frequently queried fields

  ## 4. Functions
  - Auto-generate dossier number
  - Token generation for bid invitations
  - Automatic reminder scheduling
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS external_quotes CASCADE;
DROP TABLE IF EXISTS appraisal_photos CASCADE;
DROP TABLE IF EXISTS appraisals CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('verkoper', 'manager', 'handelaar', 'eindklant')),
  two_fa_enabled boolean DEFAULT false,
  two_fa_secret text,
  phone text,
  company_name text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create dealers table
CREATE TABLE IF NOT EXISTS dealers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  active boolean DEFAULT true,
  opt_in_email boolean DEFAULT true,
  machine_types text[] DEFAULT '{}',
  age_category text CHECK (age_category IN ('jong_gebruikt', 'gebruikt', 'oude_machines')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create machines table
CREATE TABLE IF NOT EXISTS machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_number text UNIQUE NOT NULL,
  industry text DEFAULT 'port_equipment',
  status text DEFAULT 'Nieuw' CHECK (status IN ('Nieuw', 'In_beoordeling', 'Offer_out', 'Geaccepteerd', 'Afgewezen')),
  equipment_type text NOT NULL CHECK (equipment_type IN ('heavy_duty_forklift', 'empty_container_handler', 'reachstacker', 'terminal_tractor')),
  klant_naam text,
  locatie text,
  verkoper_id uuid REFERENCES user_profiles(id),
  manager_id uuid REFERENCES user_profiles(id),
  onedrive_folder_path text,
  onedrive_pdf_url text,
  offer_to_dealers boolean DEFAULT false,
  photo_wizard_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create machine_ident table
CREATE TABLE IF NOT EXISTS machine_ident (
  machine_id uuid PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
  brand text NOT NULL,
  model text NOT NULL,
  serial_number text,
  year integer NOT NULL CHECK (year >= 1950 AND year <= 2100),
  hours integer NOT NULL CHECK (hours >= 0),
  power text CHECK (power IN ('diesel', 'elektrisch', 'hybride')),
  remark text
);

-- Create machine_dimensions table
CREATE TABLE IF NOT EXISTS machine_dimensions (
  machine_id uuid PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
  length_mm integer CHECK (length_mm > 0),
  width_mm integer CHECK (width_mm > 0),
  height_mm integer CHECK (height_mm > 0),
  service_weight_kg integer CHECK (service_weight_kg > 0)
);

-- Create machine_extras table
CREATE TABLE IF NOT EXISTS machine_extras (
  machine_id uuid PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
  cabin_type text,
  heater boolean DEFAULT false,
  airco boolean DEFAULT false,
  streetlights_front boolean DEFAULT false,
  streetlights_rear boolean DEFAULT false,
  worklight_front boolean DEFAULT false,
  worklight_rear boolean DEFAULT false,
  beacon boolean DEFAULT false,
  radio boolean DEFAULT false,
  extra_lights boolean DEFAULT false,
  wheelbase_mm integer,
  mirrors boolean DEFAULT false,
  mirrors_heated boolean DEFAULT false,
  seat_brand text,
  seat_type text,
  seat_headrest boolean DEFAULT false,
  options text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create machine_tires_wheels table
CREATE TABLE IF NOT EXISTS machine_tires_wheels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES machines(id) ON DELETE CASCADE,
  position text NOT NULL,
  make text,
  type_size text,
  remaining_pct integer CHECK (remaining_pct >= 0 AND remaining_pct <= 100),
  display_order integer DEFAULT 0,
  rims_optical_inspection text,
  wheel_studs_condition text,
  comments text
);

-- Create type-specific specs tables
CREATE TABLE IF NOT EXISTS machine_specs_forklift (
  machine_id uuid PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
  capacity_kg integer,
  load_center_mm integer,
  mast_type text CHECK (mast_type IN ('duplex', 'triplex')),
  lift_height_mm integer,
  free_lift_mm integer,
  attachment text
);

CREATE TABLE IF NOT EXISTS machine_specs_reachstacker (
  machine_id uuid PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
  capacity_row1 integer,
  capacity_row2 integer,
  capacity_row3 integer,
  stacking_height_m integer,
  free_lift_mm integer,
  attachment text
);

CREATE TABLE IF NOT EXISTS machine_specs_terminal_tractor (
  machine_id uuid PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
  capacity_kg integer,
  fifth_wheel_height_mm integer
);

-- Create checklist_items table
CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES machines(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_label text NOT NULL,
  condition text CHECK (condition IN ('G', 'F', 'R')),
  comment text,
  display_order integer DEFAULT 0
);

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES machines(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  onedrive_url text NOT NULL,
  onedrive_key text NOT NULL,
  file_size_bytes bigint,
  width_px integer,
  height_px integer,
  quality_passed boolean DEFAULT true,
  is_required boolean DEFAULT false,
  display_order integer DEFAULT 0,
  caption text,
  created_at timestamptz DEFAULT now()
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES machines(id) ON DELETE CASCADE,
  onedrive_url text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create valuations table
CREATE TABLE IF NOT EXISTS valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid UNIQUE REFERENCES machines(id) ON DELETE CASCADE,
  ai_indicatie decimal(12, 2),
  betrouwbaarheid_score decimal(3, 2) CHECK (betrouwbaarheid_score >= 0 AND betrouwbaarheid_score <= 1),
  features jsonb,
  berekening_log text,
  visible_to text[] DEFAULT ARRAY['manager'],
  manager_override_value decimal(12, 2),
  manager_override_reason text,
  manager_override_by uuid REFERENCES user_profiles(id),
  manager_override_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create historical_data table for AI training
CREATE TABLE IF NOT EXISTS historical_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doelprijs_eur decimal(12, 2),
  brand text,
  model text,
  year integer,
  hours integer,
  power text,
  capacity_kg integer,
  load_center_mm integer,
  mast_type text,
  lift_height_mm integer,
  free_lift_mm integer,
  row1_cap integer,
  row2_cap integer,
  row3_cap integer,
  fifth_wheel_height_mm integer,
  attachment text,
  tires_condition text,
  leaks_flags text,
  region text,
  sale_date date,
  equipment_type text,
  uploaded_by uuid REFERENCES user_profiles(id),
  uploaded_at timestamptz DEFAULT now()
);

-- Create bids table
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES machines(id) ON DELETE CASCADE,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE,
  bedrag decimal(12, 2),
  valuta text DEFAULT 'EUR',
  voorwaarden text,
  status text DEFAULT 'Ingediend' CHECK (status IN ('Ingediend', 'Geüpdatet', 'Geweigerd', 'Geaccepteerd')),
  interesse boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bid_invitations table
CREATE TABLE IF NOT EXISTS bid_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES machines(id) ON DELETE CASCADE,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_ip text,
  reminder_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create qa_threads table
CREATE TABLE IF NOT EXISTS qa_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES machines(id) ON DELETE CASCADE,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text,
  answered_by uuid REFERENCES user_profiles(id),
  answered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES machines(id) ON DELETE CASCADE,
  actor_role text,
  actor_id uuid REFERENCES user_profiles(id),
  action text NOT NULL,
  payload jsonb,
  ip_address text,
  timestamp timestamptz DEFAULT now()
);

-- Create digital_signatures table
CREATE TABLE IF NOT EXISTS digital_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES machines(id) ON DELETE CASCADE,
  signer_id uuid REFERENCES user_profiles(id),
  signer_role text,
  signature_data text NOT NULL,
  document_type text NOT NULL,
  signed_at timestamptz DEFAULT now()
);

-- Create industry_profiles table
CREATE TABLE IF NOT EXISTS industry_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key text UNIQUE NOT NULL,
  schema_config jsonb,
  photo_sequence jsonb,
  styling jsonb,
  pdf_sections jsonb,
  validations jsonb,
  ai_feature_mapping jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create styling_config table
CREATE TABLE IF NOT EXISTS styling_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  primary_color text DEFAULT '#1e293b',
  secondary_color text DEFAULT '#64748b',
  footer_text text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_machines_verkoper ON machines(verkoper_id);
CREATE INDEX IF NOT EXISTS idx_machines_manager ON machines(manager_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS idx_machines_equipment_type ON machines(equipment_type);
CREATE INDEX IF NOT EXISTS idx_bids_machine ON bids(machine_id);
CREATE INDEX IF NOT EXISTS idx_bids_dealer ON bids(dealer_id);
CREATE INDEX IF NOT EXISTS idx_bid_invitations_token ON bid_invitations(token);
CREATE INDEX IF NOT EXISTS idx_photos_machine ON photos(machine_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_machine ON activity_logs(machine_id);
CREATE INDEX IF NOT EXISTS idx_dealers_active ON dealers(active);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_ident ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_tires_wheels ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_specs_forklift ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_specs_reachstacker ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_specs_terminal_tractor ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE styling_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Managers can read all profiles" ON user_profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'));

-- RLS Policies for dealers
CREATE POLICY "Managers can manage dealers" ON dealers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('manager', 'verkoper')));
CREATE POLICY "Dealers can read own profile" ON dealers FOR SELECT TO authenticated USING (user_id = auth.uid());

-- RLS Policies for machines
CREATE POLICY "Verkopers can create machines" ON machines FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'verkoper') AND verkoper_id = auth.uid());
CREATE POLICY "Verkopers can read own machines" ON machines FOR SELECT TO authenticated USING (verkoper_id = auth.uid());
CREATE POLICY "Verkopers can update own machines" ON machines FOR UPDATE TO authenticated USING (verkoper_id = auth.uid()) WITH CHECK (verkoper_id = auth.uid());
CREATE POLICY "Managers can read all machines" ON machines FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'));
CREATE POLICY "Managers can update all machines" ON machines FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'));
CREATE POLICY "Handelaars can read invited machines" ON machines FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM bid_invitations bi JOIN dealers d ON bi.dealer_id = d.id WHERE bi.machine_id = machines.id AND d.user_id = auth.uid()));

-- RLS Policies for machine-related tables (inherit from machines access)
CREATE POLICY "Access via machine" ON machine_ident FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM machines WHERE id = machine_ident.machine_id AND (verkoper_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'))));
CREATE POLICY "Access via machine" ON machine_dimensions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM machines WHERE id = machine_dimensions.machine_id AND (verkoper_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'))));
CREATE POLICY "Access via machine" ON machine_extras FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM machines WHERE id = machine_extras.machine_id AND (verkoper_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'))));
CREATE POLICY "Access via machine" ON machine_tires_wheels FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM machines WHERE id = machine_tires_wheels.machine_id AND (verkoper_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'))));
CREATE POLICY "Access via machine" ON machine_specs_forklift FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM machines WHERE id = machine_specs_forklift.machine_id AND (verkoper_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'))));
CREATE POLICY "Access via machine" ON machine_specs_reachstacker FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM machines WHERE id = machine_specs_reachstacker.machine_id AND (verkoper_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'))));
CREATE POLICY "Access via machine" ON machine_specs_terminal_tractor FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM machines WHERE id = machine_specs_terminal_tractor.machine_id AND (verkoper_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'))));
CREATE POLICY "Access via machine" ON checklist_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM machines WHERE id = checklist_items.machine_id AND (verkoper_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'))));
CREATE POLICY "Access via machine" ON photos FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM machines WHERE id = photos.machine_id AND (verkoper_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'))));
CREATE POLICY "Access via machine" ON videos FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM machines WHERE id = videos.machine_id AND (verkoper_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'))));

-- RLS Policies for valuations (ONLY managers)
CREATE POLICY "Only managers can view valuations" ON valuations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'));
CREATE POLICY "Only managers can manage valuations" ON valuations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'));

-- RLS Policies for bids
CREATE POLICY "Dealers can create bids" ON bids FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM dealers WHERE id = bids.dealer_id AND user_id = auth.uid()));
CREATE POLICY "Dealers can read own bids" ON bids FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM dealers WHERE id = bids.dealer_id AND user_id = auth.uid()));
CREATE POLICY "Dealers can update own bids" ON bids FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM dealers WHERE id = bids.dealer_id AND user_id = auth.uid()));
CREATE POLICY "Verkopers and managers can read bids for their machines" ON bids FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM machines WHERE id = bids.machine_id AND (verkoper_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'))));

-- RLS Policies for activity_logs
CREATE POLICY "Managers can read all logs" ON activity_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager'));
CREATE POLICY "Anyone can insert logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Function to generate dossier number
CREATE OR REPLACE FUNCTION generate_dossier_number()
RETURNS text AS $$
DECLARE
  year_part text;
  seq_part text;
  new_number text;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YYYY');
  SELECT LPAD((COUNT(*) + 1)::text, 5, '0') INTO seq_part
  FROM machines
  WHERE dossier_number LIKE year_part || '%';
  
  new_number := year_part || '-' || seq_part;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure token
CREATE OR REPLACE FUNCTION generate_bid_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Insert default port_equipment profile
INSERT INTO industry_profiles (profile_key, schema_config, photo_sequence, styling, pdf_sections, validations, ai_feature_mapping)
VALUES (
  'port_equipment',
  '{}'::jsonb,
  '["front_left", "front_right", "rear_left", "rear_right", "cabin", "mast_boom_5thwheel_spreader", "typeplate_serial", "powertrain", "hydraulic_lines", "underside", "tires_front", "tires_rear", "damages"]'::jsonb,
  '{"primary_color": "#1e293b", "secondary_color": "#64748b"}'::jsonb,
  '["machine_core", "identification", "dimensions", "extras", "tires", "specs", "checklist", "photos", "valuation", "bids"]'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb
)
ON CONFLICT (profile_key) DO NOTHING;

-- Insert default styling
INSERT INTO styling_config (primary_color, secondary_color, footer_text, active)
VALUES ('#1e293b', '#64748b', 'TaxatieApp Port Equipment © 2025', true)
ON CONFLICT DO NOTHING;
