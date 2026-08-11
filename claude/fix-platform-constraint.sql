-- Databasewijziging: 'forklift_international' toestaan als platform
-- op advertisement_publications. (11-08-2026, samen door te nemen vóór uitvoeren)
--
-- Wat het doet: de bestaande CHECK-constraint vervangen door dezelfde lijst
-- + 'forklift_international'. Raakt geen data; bestaande rijen (mascus,
-- trucksnl, machineseeker, truckscout24) blijven allemaal geldig.
-- Terugdraaien kan door dezelfde ALTER met de oude lijst.

BEGIN;

ALTER TABLE advertisement_publications
  DROP CONSTRAINT advertisement_publications_platform_check;

ALTER TABLE advertisement_publications
  ADD CONSTRAINT advertisement_publications_platform_check
  CHECK (platform = ANY (ARRAY[
    'mascus'::text,
    'trucksnl'::text,
    'machineseeker'::text,
    'truckscout24'::text,
    'forklift_international'::text
  ]));

COMMIT;

-- Controle achteraf (verwacht: de nieuwe lijst incl. forklift_international):
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conname = 'advertisement_publications_platform_check';
