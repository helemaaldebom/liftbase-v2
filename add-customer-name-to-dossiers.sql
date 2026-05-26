/*
  Add customer name field to dossiers

  This migration adds a customer_name column to the dossiers table.
  This field is required when setting a dossier status to 'sold'.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE dossiers ADD COLUMN customer_name text;
  END IF;
END $$;
