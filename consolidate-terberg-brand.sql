/*
  # Consolideer Terberg merk naar één enkele entry

  1. Wijzigingen
    - Update alle varianten van "Terberg" naar één consistente schrijfwijze "Terberg"
    - Dit wordt toegepast op:
      - dossiers tabel (brand kolom) - gebruikt in Taxatie dropdown
      - dossiers tabel (merk kolom) - gebruikt in Marktdata overzicht
      - terminal_tractor_details tabel (brand kolom)

  2. Doel
    - Verwijder duplicaten van Terberg in dropdown filters
    - Zorg voor consistente data voor rapportage

  3. Oorzaak probleem
    - De dossiers tabel heeft zowel 'brand' als 'merk' kolommen
    - Verschillende delen van de app gebruiken verschillende kolommen
    - Daardoor kunnen duplicaten ontstaan als ze niet synchroon blijven
*/

-- =================================================================
-- STAP 1: Check welke Terberg varianten er zijn
-- =================================================================

-- Check Terberg varianten in dossiers.brand kolom
SELECT '=== TERBERG VARIANTEN IN DOSSIERS.BRAND ===' as info;
SELECT DISTINCT brand, COUNT(*) as aantal,
       LENGTH(brand) as lengte,
       ASCII(SUBSTRING(brand FROM 1 FOR 1)) as eerste_char_ascii
FROM dossiers
WHERE brand ILIKE '%terberg%'
GROUP BY brand
ORDER BY brand;

-- Check Terberg varianten in dossiers.merk kolom
SELECT '=== TERBERG VARIANTEN IN DOSSIERS.MERK ===' as info;
SELECT DISTINCT merk, COUNT(*) as aantal,
       LENGTH(merk) as lengte,
       ASCII(SUBSTRING(merk FROM 1 FOR 1)) as eerste_char_ascii
FROM dossiers
WHERE merk ILIKE '%terberg%'
GROUP BY merk
ORDER BY merk;

-- Check Terberg varianten in terminal_tractor_details
SELECT '=== TERBERG VARIANTEN IN TERMINAL_TRACTOR_DETAILS ===' as info;
SELECT DISTINCT brand, COUNT(*) as aantal,
       LENGTH(brand) as lengte,
       ASCII(SUBSTRING(brand FROM 1 FOR 1)) as eerste_char_ascii
FROM terminal_tractor_details
WHERE brand ILIKE '%terberg%'
GROUP BY brand
ORDER BY brand;

-- =================================================================
-- STAP 2: Update alle varianten naar één standaard schrijfwijze
-- =================================================================

-- Update dossiers.brand: alle Terberg varianten naar "Terberg"
UPDATE dossiers
SET brand = 'Terberg'
WHERE brand ILIKE '%terberg%'
  AND brand != 'Terberg';

-- Update dossiers.merk: alle Terberg varianten naar "Terberg"
UPDATE dossiers
SET merk = 'Terberg'
WHERE merk ILIKE '%terberg%'
  AND merk != 'Terberg';

-- Get aantal geupdate dossiers
SELECT '=== AANTAL DOSSIERS MET TERBERG IN BRAND ===' as info;
SELECT COUNT(*) as aantal
FROM dossiers
WHERE brand = 'Terberg';

SELECT '=== AANTAL DOSSIERS MET TERBERG IN MERK ===' as info;
SELECT COUNT(*) as aantal
FROM dossiers
WHERE merk = 'Terberg';

-- Update terminal_tractor_details: alle Terberg varianten naar "Terberg"
UPDATE terminal_tractor_details
SET brand = 'Terberg'
WHERE brand ILIKE '%terberg%'
  AND brand != 'Terberg';

-- Get aantal geupdate terminal tractors
SELECT '=== AANTAL GEUPDATE TERMINAL TRACTORS ===' as info;
SELECT COUNT(*) as aantal_geupdate_terminal_tractors
FROM terminal_tractor_details
WHERE brand = 'Terberg';

-- Verwijder whitespace inconsistenties in alle merken
UPDATE dossiers
SET brand = TRIM(brand)
WHERE brand IS NOT NULL AND brand != TRIM(brand);

UPDATE dossiers
SET merk = TRIM(merk)
WHERE merk IS NOT NULL AND merk != TRIM(merk);

UPDATE terminal_tractor_details
SET brand = TRIM(brand)
WHERE brand IS NOT NULL AND brand != TRIM(brand);

-- =================================================================
-- STAP 3: Verificatie - check of het gelukt is
-- =================================================================

SELECT '=== VERIFICATIE: TERBERG IN DOSSIERS.BRAND ===' as info;
SELECT DISTINCT brand, COUNT(*) as aantal
FROM dossiers
WHERE brand ILIKE '%terberg%'
GROUP BY brand
ORDER BY brand;

SELECT '=== VERIFICATIE: TERBERG IN DOSSIERS.MERK ===' as info;
SELECT DISTINCT merk, COUNT(*) as aantal
FROM dossiers
WHERE merk ILIKE '%terberg%'
GROUP BY merk
ORDER BY merk;

SELECT '=== VERIFICATIE: TERBERG IN TERMINAL_TRACTOR_DETAILS ===' as info;
SELECT DISTINCT brand, COUNT(*) as aantal
FROM terminal_tractor_details
WHERE brand ILIKE '%terberg%'
GROUP BY brand
ORDER BY brand;

SELECT '=== KLAAR! ===' as info;
