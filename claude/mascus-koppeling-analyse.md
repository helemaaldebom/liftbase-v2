# Mascus — analyse (dealerportaal + IMS-uploadsjabloon, sept 2026)

## Situatie

- HCL heeft een werkend Mascus-dealeraccount (login via Tigran; Mascus
  verifieert op IP). Er staan 20 advertenties live, afkomstig van de
  F.I.-doorplaatsing, met eigen Mascus-ID's (bv. 17E4CC3C).
- Contactpersoon: Maarten Verlaan, Customer Success Manager Mascus Benelux
  (maarten.verlaan@mascus.com, +31 6 89 93 58 22).
- Portaal heeft "Upload via spreadsheet" (Ritchie Bros IMS-route): Excel-
  sjabloon, verwerking binnen ±1 uur met mailbevestiging.

## Categorie-codes (mappable ID's, uit het sjabloon-tabblad Categoriecodes)

- reachstacker → `ReachStackers` (Laden en lossen > Haven en container materieel)
- terminal_tractor → `TerminalTractors`
- empty_container_handler → `ContainerHandlers`
- heavy_duty_forklift/forklift diesel → `DieselTrucks` (Heftrucks > Diesel)
- elektrisch → `ElectricForkliftTrucks`; overig → `ForkliftTruckOthers`

## Sjabloon-velden (IMS)

Verplicht: AANGEP. ASSET # (= dossiernummer), Maak, Model, Categorie
(mappable ID), Straat adres, Stad, Land (2 letters). Aanbevolen: Jaar,
Serienummer/VIN, Prijs (excl. btw), Valuta (EUR), Postcode.
Verder alleen logistieke/contactvelden.

**Beperking:** geen foto's, geen uren/capaciteit/hefhoogte in het sjabloon.
De spreadsheet-route is dus een inventaris-intake, geen volwaardige
advertentie-feed. De bestaande 20 advertenties hebben wél volledige specs
(via F.I.) — voor pariteit is de echte feed nodig.

## Route

1. **Hoofdroute:** automatische feed via Maarten aanvragen (spec, methode
   FTP/URL, IP-whitelist 178.105.82.210 indien nodig, testoptie,
   overstap-coördinatie i.v.m. de 20 bestaande advertenties).
2. **Vangnet:** automatisch gegenereerd IMS-spreadsheet (kolommen bekend),
   handmatig uploaden — beperkt maar werkend.
3. Piloterr (scraping) is een aparte route voor marktdata-INNAME, niet voor
   publicatie.
