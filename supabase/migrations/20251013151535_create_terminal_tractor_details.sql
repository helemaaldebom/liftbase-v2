/*
  # Create Terminal Tractor Details Table

  1. New Tables
    - `terminal_tractor_details`
      - `id` (uuid, primary key)
      - `dossier_id` (uuid, foreign key to dossiers)
      - All the same fields as reachstacker_details table
      - Fields for order information, equipment specs, drivetrain, mast, cabin, dimensions, and tires

  2. Security
    - Enable RLS on `terminal_tractor_details` table
    - Add policies for authenticated users to read/write their own data
    - Manager and admin can access all data

  3. Notes
    - This table is identical in structure to reachstacker_details
    - Used specifically for terminal tractor equipment type
*/

CREATE TABLE IF NOT EXISTS terminal_tractor_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  
  -- HClifters Reference
  order_no text DEFAULT '',
  date date,
  
  -- Terminal tractor basic info
  brand text DEFAULT '',
  type text DEFAULT '',
  power text DEFAULT '',
  capacity_1st_row integer,
  capacity_2nd_row integer,
  capacity_3rd_row integer,
  year_of_manufacture integer,
  hours_on_clock integer,
  serial_no text DEFAULT '',
  
  -- Mast
  mast text DEFAULT '',
  free_lift text DEFAULT '',
  lift_height_mm integer,
  remark text DEFAULT '',
  
  -- Drivetrain
  engine_brand text DEFAULT '',
  engine_type text DEFAULT '',
  engine_remark text DEFAULT '',
  front_axle_brand text DEFAULT '',
  front_axle_type text DEFAULT '',
  front_axle_remark text DEFAULT '',
  rear_axle_remark text DEFAULT '',
  trans_brand text DEFAULT '',
  trans_type text DEFAULT '',
  trans_remark text DEFAULT '',
  adblue boolean DEFAULT false,
  
  -- Hydraulics
  hydraulic_lines integer,
  
  -- Attachment
  attachment text DEFAULT 'No attachment',
  attachment_other text DEFAULT '',
  
  -- Forks
  fork_length_mm integer,
  fork_width_mm integer,
  fork_height_mm integer,
  no_forks boolean DEFAULT false,
  
  -- Cabin
  cabin_type text DEFAULT '',
  heater boolean DEFAULT false,
  airco boolean DEFAULT false,
  radio boolean DEFAULT false,
  seat_brand text DEFAULT '',
  seat_type_suspension text DEFAULT '',
  headrest text DEFAULT '',
  seat_options text DEFAULT '',
  
  -- Dimensions and weight
  length_total_mm integer,
  width_total_mm integer,
  drive_through_height_mm integer,
  serviceweight_kg integer,
  
  -- Tires
  tire_size_front text DEFAULT '',
  tire_size_back text DEFAULT '',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_dossier_terminal_tractor_details UNIQUE (dossier_id)
);

ALTER TABLE terminal_tractor_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view terminal tractor details they have access to"
  ON terminal_tractor_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = terminal_tractor_details.dossier_id
      AND (
        dossiers.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('manager', 'admin')
        )
      )
    )
  );

CREATE POLICY "Users can insert terminal tractor details for their dossiers"
  ON terminal_tractor_details FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = terminal_tractor_details.dossier_id
      AND (
        dossiers.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('manager', 'admin')
        )
      )
    )
  );

CREATE POLICY "Users can update terminal tractor details for their dossiers"
  ON terminal_tractor_details FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = terminal_tractor_details.dossier_id
      AND (
        dossiers.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('manager', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = terminal_tractor_details.dossier_id
      AND (
        dossiers.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('manager', 'admin')
        )
      )
    )
  );

CREATE POLICY "Users can delete terminal tractor details for their dossiers"
  ON terminal_tractor_details FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = terminal_tractor_details.dossier_id
      AND (
        dossiers.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('manager', 'admin')
        )
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_terminal_tractor_details_dossier_id ON terminal_tractor_details(dossier_id);