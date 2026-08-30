# Database Update Instructies

## Rotatie Kolom Toevoegen aan Photos Tabel

Om de foto rotatie functionaliteit te activeren, moet je de volgende SQL query uitvoeren in je Supabase database:

### SQL Query

```sql
-- Add rotation column to photos table
ALTER TABLE photos
ADD COLUMN IF NOT EXISTS rotation_degrees integer DEFAULT 0 CHECK (rotation_degrees IN (0, 90, 180, 270));

-- Add comment for documentation
COMMENT ON COLUMN photos.rotation_degrees IS 'Rotation in degrees clockwise (0, 90, 180, or 270)';
```

### Hoe uit te voeren

1. Ga naar je Supabase dashboard
2. Klik op "SQL Editor" in het linker menu
3. Plak de bovenstaande SQL query
4. Klik op "Run" om de query uit te voeren

### Alternatief: Via SQL bestand

Je kunt ook het bestand `add_rotation_column.sql` gebruiken dat in de root directory staat.

### Wat doet deze update?

Deze update voegt een nieuwe kolom `rotation_degrees` toe aan de `photos` tabel:
- **Type**: Integer
- **Default waarde**: 0 (geen rotatie)
- **Toegestane waardes**: 0, 90, 180, 270 (graden rechtsom)
- **Effect**: Foto's kunnen nu gedraaid worden in stappen van 90 graden

De rotatie wordt toegepast via CSS transforms en de waarde wordt opgeslagen in de database zodat de rotatie persistent is.
