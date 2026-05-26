/*
  Harmoniseer lastzwaartepunt en load_center data

  Uitvoeren in Supabase SQL Editor:
  1. Ga naar je Supabase Dashboard
  2. Klik op "SQL Editor"
  3. Plak deze query en klik op "Run"

  Dit synchroniseert de data zodat beide velden dezelfde waarde hebben.
*/

-- Kopieer lastzwaartepunt naar load_center waar load_center NULL is
UPDATE dossiers
SET load_center = lastzwaartepunt
WHERE lastzwaartepunt IS NOT NULL
  AND load_center IS NULL;

-- Kopieer load_center naar lastzwaartepunt waar lastzwaartepunt NULL is
UPDATE dossiers
SET lastzwaartepunt = load_center
WHERE load_center IS NOT NULL
  AND lastzwaartepunt IS NULL;

-- Verifieer het resultaat
SELECT
  equipment_type,
  COUNT(*) as total_records,
  COUNT(lastzwaartepunt) as has_lastzwaartepunt,
  COUNT(load_center) as has_load_center
FROM dossiers
WHERE is_marktdata = true
GROUP BY equipment_type
ORDER BY equipment_type;
