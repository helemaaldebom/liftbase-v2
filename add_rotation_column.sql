-- Add rotation column to photos table
ALTER TABLE photos
ADD COLUMN IF NOT EXISTS rotation_degrees integer DEFAULT 0 CHECK (rotation_degrees IN (0, 90, 180, 270));

-- Add comment for documentation
COMMENT ON COLUMN photos.rotation_degrees IS 'Rotation in degrees clockwise (0, 90, 180, or 270)';
