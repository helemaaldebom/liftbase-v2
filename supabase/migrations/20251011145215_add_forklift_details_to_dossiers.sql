/*
  # Add Heavy Duty Forklift details to dossiers

  1. New Table
    - `forklift_details` - Detailed specifications for heavy duty forklifts
      - Reference information (order_no, date)
      - Brand details (brand, type, power, capacity, etc.)
      - Physical dimensions (length, width, drive_through_height, serviceweight)
      - Mast specifications (mast, mast_type, free_lift, lift_height)
      - Drive components (engine, axles, transmission, shift_type)
      - Equipment details (serial_no, attachment, year_of_manufacture, hours_on_clock)
      - Extra features (cabin_type, heater, airco, lights, wheelbase, mirrors, seat, etc.)
      - Options and remarks

  2. Security
    - Enable RLS
    - Users who can view dossiers can view forklift details
    - Users who can update dossiers can update forklift details
*/

-- Create forklift_details table
CREATE TABLE IF NOT EXISTS forklift_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE UNIQUE,
  
  -- HClifters reference
  order_no text DEFAULT '',
  date date,
  
  -- Brand section
  brand text DEFAULT '',
  type text DEFAULT '',
  power text DEFAULT '',
  capacity_kg integer,
  load_center_mm integer,
  year_of_manufacture integer,
  hours_on_clock integer,
  
  -- Mast section
  mast text DEFAULT '',
  mast_type text DEFAULT '',
  free_lift text DEFAULT '',
  lift_height_mm integer,
  serial_no text DEFAULT '',
  attachment text DEFAULT '',
  remark text DEFAULT '',
  
  -- Dimensions
  length_total_mm integer,
  width_total_mm integer,
  drive_through_height_mm integer,
  serviceweight_kg integer,
  
  -- Extra section
  cabin_type text DEFAULT '',
  heater boolean DEFAULT false,
  airco boolean DEFAULT false,
  streetlights_front text DEFAULT '',
  streetlights_rear text DEFAULT '',
  work_light_front text DEFAULT '',
  work_light_rear text DEFAULT '',
  beacon text DEFAULT '',
  radio text DEFAULT '',
  extra_lights text DEFAULT '',
  extra_lights_2 text DEFAULT '',
  wheelbase text DEFAULT '',
  mirrors text DEFAULT '',
  mirrors_heated boolean DEFAULT false,
  
  -- Seat section
  seat_brand text DEFAULT '',
  seat_type_suspension text DEFAULT '',
  headrest text DEFAULT '',
  seat_options text DEFAULT '',
  
  -- Drive section
  engine_brand text DEFAULT '',
  engine_type text DEFAULT '',
  engine_remark text DEFAULT '',
  front_axle_brand text DEFAULT '',
  front_axle_type text DEFAULT '',
  front_axle_remark text DEFAULT '',
  rear_axle_brand text DEFAULT '',
  rear_axle_type text DEFAULT '',
  rear_axle_remark text DEFAULT '',
  trans_brand text DEFAULT '',
  trans_type text DEFAULT '',
  trans_remark text DEFAULT '',
  shift_type text DEFAULT '',
  adblue text DEFAULT '',
  particle_filter text DEFAULT '',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER trigger_update_forklift_details_updated_at
  BEFORE UPDATE ON forklift_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE forklift_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forklift_details

-- Users can view forklift details for dossiers they have access to
CREATE POLICY "Users can view forklift details for accessible dossiers"
  ON forklift_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = forklift_details.dossier_id
    )
  );

-- Verkopers and managers can create forklift details
CREATE POLICY "Verkopers and managers can create forklift details"
  ON forklift_details
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('verkoper', 'manager')
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = forklift_details.dossier_id
      AND (dossiers.created_by = auth.uid() OR dossiers.assigned_to = auth.uid()
           OR (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager')
    )
  );

-- Verkopers can update forklift details for their dossiers
CREATE POLICY "Verkopers can update forklift details for own dossiers"
  ON forklift_details
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'verkoper'
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = forklift_details.dossier_id
      AND (dossiers.created_by = auth.uid() OR dossiers.assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'verkoper'
    AND EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = forklift_details.dossier_id
      AND (dossiers.created_by = auth.uid() OR dossiers.assigned_to = auth.uid())
    )
  );

-- Managers can update all forklift details
CREATE POLICY "Managers can update all forklift details"
  ON forklift_details
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  );

-- Managers can delete forklift details
CREATE POLICY "Managers can delete forklift details"
  ON forklift_details
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_forklift_details_dossier_id ON forklift_details(dossier_id);
