/*
  # Add Language Preference to User Profiles

  1. Changes
    - Add `language` column to `user_profiles` table
    - Default language is Dutch ('nl')
    - Supported languages: nl (Nederlands), en (English), de (Deutsch)

  2. Notes
    - Allows users to set their preferred language
    - Language preference is stored per user
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'language'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN language text DEFAULT 'nl' CHECK (language IN ('nl', 'en', 'de'));
  END IF;
END $$;
