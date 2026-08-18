-- Databasewijziging 2: 'hcl' (eigen website) en 'truck1' toestaan als platform
-- op advertisement_publications. (18-08-2026, samen door te nemen vóór uitvoeren)
-- Zelfde soort wijziging als vorige keer: validatieregel vervangen door
-- dezelfde lijst + twee extra waarden. Raakt geen data, terugdraaien kan.

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
    'forklift_international'::text,
    'hcl'::text,
    'truck1'::text
  ]));

COMMIT;
