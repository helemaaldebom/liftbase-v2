# Truck1.eu — analyse importformaat (datasheet _TEN_truck1_import_data_format.html)

## Kernfeiten

- Veldreferentie per advertentie; formaat-agnostisch (JSON/XML/CSV-keys).
  Machine-leesbare variant: `.../_TEN_truck1_import_data_format.html?json=1`.
- **Verplicht:** `imp_id` (uniek advertentie-ID — ons dossiernummer),
  `category`, en feitelijk `make` + `model` (basis voor de titel in alle talen).
- **Categorieën voor ons materieel:**
  - `9-0-241` Port equipment : Reach stacker
  - `9-0-67`  Port equipment : Container handler (ECH)
  - `9-0-242` Port equipment : Terminal tractor
  - `9-0-239` Forklift : Diesel forklift (heavy duty forklift)
  - `9-0-238` Electric forklift / `9-0-1012` LPG forklift
- **Nuttige velden:** `f_MachineHours` (h), `f_LiftPayload` (kg),
  `f_LiftHeight` (mm), `f_FreeLift` (mm), `f_MastType` (1-4), `f_Fuel`
  (1 diesel, 4 LPG, 5 electric, 9 hybrid), `f_Condition` (1 nieuw – 5 zeer
  slecht), `price` + `price_orig_currency` (default EUR) + `price_type`
  (1 netto/2 brutto) + `VAT`, `ayear` (bouwjaar), meertalige
  `title{taal}`/`notes{taal}` (bv. titleen/notesen, titlenl/notesnl).
- **Foto's:** veld `images` = array van URL's; Truck1 haalt ze zelf op.
  Video via YouTube-URL.
- Eenheden metrisch (kg/mm), datums YYYY-MM-DD, booleans als 1.

## Nog onbekend (staat in Truck1API.pdf — kon niet automatisch gelezen worden)

- Transportmechanisme (endpoint/FTP/feed-URL), authenticatie
- Update-/verwijderflow (vermoedelijk op `imp_id`)
- Aanleverfrequentie en encoding-eisen

## Vereisten vooraf

- Dealeraccount bij Truck1 + via **Truck1-support**: `loc_id`
  (locatie-ID's van de dealer) en `contact_person_id`(s) opvragen.

## Mascus — let op

De aangedragen piloterr.com-link ("Mascus search API") is een commerciële
scraping-dienst om Mascus-zoekresultaten UIT te lezen — bruikbaar voor de
marktdata-inname (het lege `scrape-mascus`-skelet), NIET voor het plaatsen
van advertenties. Voor publiceren op Mascus blijft de officiële dealer-feed
via Mascus-support nodig.
