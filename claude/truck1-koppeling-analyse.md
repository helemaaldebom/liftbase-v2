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

## Transportmechanisme (uit Truck1API.pdf)

- **Endpoint:** `POST http://www.truck1.eu/-service/API`
  Content-type `application/x-www-form-urlencoded` met twee velden:
  `provider` (provider-key, door Truck1 verstrekt) en `data` (JSON).
- **JSON-structuur:** `{"test":"1"?, "dealers": {"<dealer_id>": {"<ad_id>":
  {"action":"add|update|delete", ...velden...}}}}` — ad_id = ons
  dossiernummer. `add` = volledige data; `update` = alleen gewijzigde velden;
  `delete` = alleen de action.
- **Ingebouwde testmodus:** `"test":"1"` → niets wordt echt geplaatst.
- **Antwoord:** JSON met per dealer `summary` ("add":"10/11" = 10 van 11
  gelukt) + error/warning-arrays. Bij drukte: "API is busy. Try again later"
  → retry inbouwen.
- **Voorraad opvragen:** lege dealer-object sturen → antwoord bevat `stock`
  met alle online advertenties (imp_id, Truck1-id, link). Perfect voor
  reconciliatie (welke advertenties staan er echt online).

## Vereisten vooraf

- **Provider-key** aanvragen bij Truck1 (wij worden "provider").
- Dealeraccount van HCL bij Truck1, gekoppeld aan die provider
  ("Only stocks of the dealers that are bound to the provider are allowed").
- Dealer-ID + via Truck1-support: `loc_id` en `contact_person_id`.

## Mascus — let op

De aangedragen piloterr.com-link ("Mascus search API") is een commerciële
scraping-dienst om Mascus-zoekresultaten UIT te lezen — bruikbaar voor de
marktdata-inname (het lege `scrape-mascus`-skelet), NIET voor het plaatsen
van advertenties. Voor publiceren op Mascus blijft de officiële dealer-feed
via Mascus-support nodig.
