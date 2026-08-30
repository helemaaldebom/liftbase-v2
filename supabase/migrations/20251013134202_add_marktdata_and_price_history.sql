/*
  # Add Marktdata and Price History System

  1. Changes to dossiers table
    - Add `handelsprijs` (decimal) - Trade/dealer price
    - Add `eindklantprijs` (decimal) - End customer price
    - Add `marktdata_bron` (text) - Source of market data
    - Add `marktdata_bron_url` (text) - URL of source
    - Add `marktdata_notities` (text) - Notes about source
    - Add `marktdata_ingevoerd_door` (uuid) - User who entered data
    - Add `marktdata_invoerdatum` (timestamp) - When data was entered
    - Add `laatste_prijs_update` (timestamp) - Last price update date

  2. New Tables
    - `price_history` - Full price history tracking
      - `id` (uuid, primary key)
      - `dossier_id` (uuid, foreign key to dossiers)
      - `handelsprijs` (decimal)
      - `eindklantprijs` (decimal)
      - `observatie_datum` (date)
      - `bron` (text)
      - `bron_url` (text)
      - `notities` (text)
      - `ingevoerd_door` (uuid, foreign key to user_profiles)
      - `created_at` (timestamp)

  3. Security
    - Enable RLS on price_history
    - Verkopers can view all price history
    - Only managers can insert/update/delete price history
*/

-- Add marktdata fields to dossiers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'handelsprijs'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN handelsprijs DECIMAL(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'eindklantprijs'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN eindklantprijs DECIMAL(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'marktdata_bron'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN marktdata_bron TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'marktdata_bron_url'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN marktdata_bron_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'marktdata_notities'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN marktdata_notities TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'marktdata_ingevoerd_door'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN marktdata_ingevoerd_door UUID REFERENCES user_profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'marktdata_invoerdatum'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN marktdata_invoerdatum TIMESTAMPTZ DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'laatste_prijs_update'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN laatste_prijs_update TIMESTAMPTZ;
  END IF;
END $$;

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  handelsprijs DECIMAL(10,2),
  eindklantprijs DECIMAL(10,2),
  observatie_datum DATE DEFAULT CURRENT_DATE,
  bron TEXT,
  bron_url TEXT,
  notities TEXT,
  ingevoerd_door UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on price_history
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Verkopers and managers can view all price history
CREATE POLICY "Authenticated users can view all price history"
  ON price_history FOR SELECT
  TO authenticated
  USING (true);

-- Only managers can insert price history
CREATE POLICY "Only managers can insert price history"
  ON price_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'directeur')
    )
  );

-- Only managers can update price history
CREATE POLICY "Only managers can update price history"
  ON price_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'directeur')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'directeur')
    )
  );

-- Only managers can delete price history
CREATE POLICY "Only managers can delete price history"
  ON price_history FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'directeur')
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_price_history_dossier ON price_history(dossier_id);
CREATE INDEX IF NOT EXISTS idx_price_history_datum ON price_history(observatie_datum DESC);

-- Create trigger to automatically create price_history entry when dossier prices are updated
CREATE OR REPLACE FUNCTION create_price_history_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create history entry if handelsprijs or eindklantprijs changed
  IF (NEW.handelsprijs IS DISTINCT FROM OLD.handelsprijs) OR 
     (NEW.eindklantprijs IS DISTINCT FROM OLD.eindklantprijs) THEN
    
    INSERT INTO price_history (
      dossier_id,
      handelsprijs,
      eindklantprijs,
      observatie_datum,
      bron,
      bron_url,
      notities,
      ingevoerd_door
    ) VALUES (
      NEW.id,
      NEW.handelsprijs,
      NEW.eindklantprijs,
      CURRENT_DATE,
      NEW.marktdata_bron,
      NEW.marktdata_bron_url,
      NEW.marktdata_notities,
      NEW.marktdata_ingevoerd_door
    );
    
    -- Update laatste_prijs_update
    NEW.laatste_prijs_update = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS dossier_price_update_trigger ON dossiers;
CREATE TRIGGER dossier_price_update_trigger
  BEFORE UPDATE ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION create_price_history_on_update();
