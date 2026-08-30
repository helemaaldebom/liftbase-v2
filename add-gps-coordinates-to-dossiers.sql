/*
  # Add GPS Coordinates to Dossiers

  1. Changes
    - Add `latitude` column to dossiers table (decimal, nullable)
    - Add `longitude` column to dossiers table (decimal, nullable)

  2. Purpose
    - Store geocoded GPS coordinates for locations
    - Prevent repeated geocoding API calls
    - Speed up map loading significantly

  3. Notes
    - Coordinates are nullable to allow gradual migration
    - Existing records will geocode on first map load
    - Future updates will store coordinates immediately
*/

ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS latitude decimal(10, 8);
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS longitude decimal(11, 8);
