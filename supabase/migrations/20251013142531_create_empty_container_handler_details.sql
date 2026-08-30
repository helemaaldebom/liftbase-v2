/*
  # Create Empty Container Handler Details Table

  1. New Tables
    - `empty_container_handler_details`
      - `id` (uuid, primary key)
      - `dossier_id` (uuid, foreign key to dossiers)
      - All the same fields as forklift_details table
      - Fields for order information, equipment specs, drivetrain, mast, hydraulics, attachment, forks, cabin, dimensions, and tires

  2. Security
    - Enable RLS on `empty_container_handler_details` table
    - Add policies for authenticated users to read/write their own data
    - Manager and admin can access all data

  3. Notes
    - This table is identical in structure to forklift_details but for empty container handlers
    - Uses the same field structure to maintain consistency
*/

CREATE TABLE IF NOT EXISTS empty_container_handler_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  
  -- HClifters Reference
  order_no text DEFAULT '',
  date date,
  
  -- Empty Container Handler basic info
  brand text DEFAULT '',
  type text DEFAULT '',
  power text DEFAULT '',
  capacity_kg integer,
  load_center_mm integer,
  year_of_manufacture integer,
  hours_on_clock integer,
  serial_no text DEFAULT '',
  
  -- Mast
  mast text DEFAULT '',
  mast_type text DEFAULT '',
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
  tire_type text DEFAULT '',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_dossier_ech_details UNIQUE (dossier_id)
);

ALTER TABLE empty_container_handler_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view empty container handler details they have access to"
  ON empty_container_handler_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = empty_container_handler_details.dossier_id
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

CREATE POLICY "Users can insert empty container handler details for their dossiers"
  ON empty_container_handler_details FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = empty_container_handler_details.dossier_id
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

CREATE POLICY "Users can update empty container handler details for their dossiers"
  ON empty_container_handler_details FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = empty_container_handler_details.dossier_id
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
      WHERE dossiers.id = empty_container_handler_details.dossier_id
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

CREATE POLICY "Users can delete empty container handler details for their dossiers"
  ON empty_container_handler_details FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dossiers
      WHERE dossiers.id = empty_container_handler_details.dossier_id
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

CREATE INDEX IF NOT EXISTS idx_ech_details_dossier_id ON empty_container_handler_details(dossier_id);
