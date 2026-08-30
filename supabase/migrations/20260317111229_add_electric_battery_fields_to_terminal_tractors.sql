/*
  # Add Electric Battery Fields to Terminal Tractors

  1. New Columns
    - `battery_capacity_kwh` (numeric) - Battery capacity in kWh for electric terminal tractors
    - `has_charger` (boolean) - Whether the terminal tractor comes with a charger
    - `charger_capacity_kw` (numeric) - Charging capacity in kW per hour

  2. Changes
    - Add three new columns to terminal_tractor_details table
    - These fields are only relevant when power = 'Electric'
    - All fields are nullable since they only apply to electric models
*/

-- Add battery capacity field
ALTER TABLE terminal_tractor_details 
ADD COLUMN IF NOT EXISTS battery_capacity_kwh numeric(10,2);

-- Add charger availability field
ALTER TABLE terminal_tractor_details 
ADD COLUMN IF NOT EXISTS has_charger boolean DEFAULT false;

-- Add charger capacity field
ALTER TABLE terminal_tractor_details 
ADD COLUMN IF NOT EXISTS charger_capacity_kw numeric(10,2);

-- Add comments for documentation
COMMENT ON COLUMN terminal_tractor_details.battery_capacity_kwh IS 'Battery capacity in kWh (only for electric models)';
COMMENT ON COLUMN terminal_tractor_details.has_charger IS 'Whether the terminal tractor comes with a charger';
COMMENT ON COLUMN terminal_tractor_details.charger_capacity_kw IS 'Charging capacity in kW per hour';