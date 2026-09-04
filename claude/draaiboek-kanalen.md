# Draaiboek activering advertentiekanalen

Stand: alle code gebouwd en gedeployed. Dit zijn de resterende schakelmomenten.

## 1. Forklift International — LIVE gaan (wacht op: go van Tigran)

Alle gegevens liggen klaar in credentials.local.env (commentaarregels).

1. WP All Import: schema van import #17 (xmlexport.php) uitzetten / afspreken
   dat niemand hem meer draait.
2. credentials.local.env: test-FI_*-regels vervangen door de live-waarden
   (hekjes weghalen), `./zet-secrets.sh`.
3. Eerste machine: vinkje F.I. aan op één dossier → "Nu publiceren" →
   controleren in het F.I.-portaal (specs, prijzen, foto's, zichtbaarheid).
4. Oude advertentie van diezelfde machine handmatig verwijderen in het
   F.I.-portaal. Daarna per machine migreren in eigen tempo (18 stuks,
   let op abonnementslimiet 20).
5. Nazorg: F.I.-importwachtwoord laten verversen (stond in chat/All Import),
   nieuwe waarde alleen in credentials.local.env + zet-secrets.

## 2. Truck1 — activeren (wacht op: provider-key + dealer-ID van accountmanager)

Code volledig klaar (publish-to-truck1, daily-truck1-sync, UI-vinkje).

1. credentials.local.env: TRUCK1_PROVIDER_KEY, TRUCK1_DEALER_ID (+ evt.
   TRUCK1_LOC_ID, TRUCK1_CONTACT_PERSON_ID) invullen → `./zet-secrets.sh`.
2. Testmodus-aanroep (Truck1 heeft ingebouwde testvlag — plaatst niets):
   via de chat laten draaien op HCL25-130, response-summary controleren.
3. Eerste echte machine: vinkje Truck1 aan → "Nu publiceren" → advertentie
   controleren op truck1.eu (link staat in het API-antwoord/stock-opvraag).
4. Klaar — ochtendsync (07:00) neemt het verder over.

## 3. Mascus — beslissing + evt. bouwen (wacht op: besluit Tigran + spec Maarten)

- Vandaag: Mascus loopt automatisch via F.I.-doorplaatsing (vinkje werkt al).
- Besluit Tigran: bij F.I. blijven → niets doen. Van F.I. af → directe feed
  bouwen VOORDAT het abonnement stopt.
- Zodra spec van Maarten binnen: feed-generator bouwen (categorie-mapping
  ligt klaar in mascus-koppeling-analyse.md), aanleveren via HTTP/URL/FTP
  vanaf de Hetzner-server (vast IP 178.105.82.210, al gemeld voor whitelist).
- Overstapmoment: doorplaatsing uit (FI_EXPORT_MASCUS=0 + zet-secrets),
  eigen feed aan, dubbelingen checken met Maarten.

## Cron (Hetzner, 07:00) — /root/fi-sync.sh

Draait F.I. + HCL-website. Truck1 wordt toegevoegd bij activering
(curl-regel staat klaar in dit draaiboek):

    echo "── Truck1 ──"
    curl -s -X POST "https://wcjegvxnojzirwxogesj.supabase.co/functions/v1/daily-truck1-sync" \
      -H "Authorization: Bearer $SECRET" -H "Content-Type: application/json"

## Nazorg algemeen

- Wachtwoorden die ooit door chat/mail gingen verversen: F.I.-import,
  F.I.-portaal (test123), Truck1-portaal (26082026), WP-login uit mail 2024.
- GitHub-tokens verlopen vanzelf na 7 dagen.
