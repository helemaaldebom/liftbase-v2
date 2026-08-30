/*
  # Maak dealer email optioneel

  BELANGRIJKE OPMERKING:
  Dit SQL script moet handmatig worden uitgevoerd in de Supabase SQL Editor
  omdat de automatische migratie tool momenteel niet beschikbaar is.

  Stappen:
  1. Ga naar je Supabase dashboard
  2. Open de SQL Editor
  3. Kopieer en plak dit script
  4. Voer het uit

  Dit script maakt het email veld optioneel in de dealers tabel,
  zodat dealers zonder email adres kunnen worden aangemaakt.
*/

-- Maak email kolom optioneel
ALTER TABLE dealers ALTER COLUMN email DROP NOT NULL;
