# Forklift International XML-interface — analyse (API v4.82)

Bron: officiële xmlinterface.zip (FORKLIFT-API.pdf, demo-XML's, uploadscripts).

## Kernfeiten

1. **Doorplaatsing Mascus + SupraLift bestaat**: per machine de velden
   `expmascus` (1/0) en `expsupralift` (1/0). Eén F.I.-feed dekt dus drie
   kanalen. Vermoedelijk moet de doorplaatsing wel op accountniveau
   geactiveerd zijn — navragen bij de accountmanager.
2. **Authenticatie**: HTTP Basic (username + upload-wachtwoord) en een
   persoonlijke `machinelist code` in de XML-root:
   `<machinelist code="XXXXXXXX">`. Alle drie te verkrijgen via de
   F.I.-vertegenwoordiger.
3. **Endpoints (uit de officiële uploadscripts)**:
   - Data: `POST https://importapi.forklift-international.com/xmlstapler.php`
     (multipart, veld `xmlfile`)
   - Afbeeldingen via URL-XML: `POST .../xmlimgstapler.php`
   - Status beeldverwerking: `GET /getimagestats.php?id={queueid}` (JSON, max 6 req/min)
   - Lockstatus: `GET /lockstatus.php`
   - Export eigen voorraad: `GET /xmlexport.php`
   ⚠ De bestaande repo-code post naar `import.php` — dat staat nérgens in de
   officiële docs; waarschijnlijk verouderd/fout.
4. **Machinetypes**: type 1 = Forklift dekt ál onze machines; onderscheid via
   `toc` (type of construction): 2 = Container-Stacker (ECH), 4 = Reach-stacker,
   6 = Terminal tractor, 13 = Diesel Forklift, 1 = Rough-terrain, 0 = Other.
   De oude `getMachineType()` (alles type 1) was dus niet fout, maar de `toc`
   werd nooit gezet — dáár zit het onderscheid.
5. **Identificatie**: `internalno` per machine (geen spaties/speciale tekens) —
   ons dossiernummer (HCL26-140) is hiervoor perfect. Updates en verwijderen
   lopen via hetzelfde nummer; afbeeldingen worden er ook aan gekoppeld.
   Handmatig gelockte machines kunnen niet via de interface gewijzigd worden
   (lockstatus.php checken).
6. **Formaat**: UTF-8 verplicht; eenheden en valuta volgens accountinstelling
   ("import-currency") — bij bouwen verifiëren wat het account gebruikt.
   Afbeeldingen: aangeraden max 1920×1080.

## Benodigde gegevens (extern)

- machinelist code + API-username + upload-wachtwoord (F.I.-vertegenwoordiger)
- bevestiging dat expmascus/expsupralift voor het account actief (te maken) zijn
- vraag of er een test-/staging-mogelijkheid is (anders testen met 1 echt
  dossier dat direct weer offline gehaald wordt)
- accountinstelling import-currency + eenheden

## Bouwplan (herziening publish-to-forklift-international + daily sync)

1. DB: constraint `advertisement_publications_platform_check` verruimen met
   `forklift_international` (+ `platform_ad_id`/queue-registratie gebruiken).
2. XML-generator naar spec v4.82: juiste endpoint (xmlstapler.php),
   machinelist-code, `internalno` = dossiernummer, `toc`-mapping, volledige
   veldmapping (serienummer, capaciteit, hefhoogte, bouwjaar, uren, mast,
   banden, prijsvelden), `expmascus`/`expsupralift` op basis van de
   publish_to_*-vinkjes.
3. Foto's: aparte beeld-XML met publieke/signed URLs (xmlimgstapler.php),
   gefilterd op `visible_online`, gesorteerd op `display_order`; queue-status
   terugschrijven.
4. Sync-fix: filter niet op `equipment_type='forklift'` maar op alle vier de
   typen + `publish_to_forklift_international`-vlag; verkochte/gearchiveerde
   dossiers → verwijderen uit de feed (unpublish).
5. Eerlijke status: pas `published` na succesvolle HTTP-response; fouten →
   `failed` met foutdetail in metadata.
6. Credentials uitsluitend server-side als Supabase-secrets (niet meer via
   browser/api_credentials-tabel).
