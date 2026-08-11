# Verificatie productie — 11 augustus 2026

Vergelijking van de 41 losse root-SQL-scripts met de daadwerkelijke staat van de
productie-database (Supabase, project wcjegvxnojzirwxogesj), plus onderzoek naar
de HCL-website-koppeling. Bronnen: introspectie-query via SQL Editor (CSV van Bas)
+ vervolgquery met volledige definities.

## A. HCL-website (heavycargolifters.com)

**De website leest NIET uit Liftbase/Supabase.** De voorraadpagina is een losse
WordPress/WooCommerce-catalogus: 22 producten (Liftbase: 30 op stock), foto's in de
WP-mediabibliotheek, geen dossiernummers/serienummers, geen Supabase-verkeer.
Wordt dus handmatig bijgehouden. De aanname "advertenties naar website: reeds
gedaan" berust niet op een automatische koppeling. `sync-advertisements` (edge
function) verstuurde ook aantoonbaar nooit iets. → Keuze voor Tigran: site
handmatig blijven bijhouden of echte koppeling bouwen (nieuw werk).

## B. Scripts vs. productie

**Gedraaid (bevestigd):** alle kolom-scripts. Alle 23 controle-kolommen bestaan:
photos.visible_online / rotation_degrees / display_order, dossiers.sale_price /
sold_at / sold_via_platform / latitude / longitude / customer_name / customer_id /
fleet_number / serienummer / merk / is_marktdata / eindklantprijs / handelsprijs /
fifth_wheel_height_mm, reachstacker stacking heights, terminal tractor wheelbase,
customer_fleet_number op alle vier de details-tabellen. Ook aanwezig: tabellen
dossier_attachments, api_credentials, documents + bijbehorende storage-policies
(dossier_documents_*, maintenance documents).

**NIET op productie: de zes details-triggers** uit create-ech-triggers.sql,
create-reachstacker-triggers.sql, create-terminal-tractor-triggers.sql
(trigger_auto_create_* en trigger_sync_dossier_to_* voor ECH, reachstacker,
terminal tractor). Mogelijk bewust verwijderd bij commit 4b307bb (fix dubbele
detailrijen). Consequentie: aanmaken/syncen van detailrijen moet volledig via de
frontend lopen. Bij "missing specs"-klachten hier eerst kijken.
Wel aanwezig: trigger_update_forklift_details_updated_at, trigger_set_dossier_number,
set_dossier_creator_role_trigger, on_bid_rejected, update_*_updated_at-triggers.

**Foto-UPDATE-policy bestaat wél**, i.t.t. de aanname uit de inventarisatie.
"Verkopers and managers can update photos" (UPDATE op photos):
- verkoper: alleen als created_by of assigned_to = auth.uid()
- manager: altijd
De kapotte fix-ai-photo-sorting.sql (CREATE POLICY IF NOT EXISTS) was dus niet
(alleen) het probleem. Voor de AI-sorteerbug eerst checken: draait de edge function
sort-photos-with-ai met de user-JWT (dan geldt bovenstaande policy — een verkoper
die niet creator/assignee is mag niets updaten) of met service role (bypasst RLS)?
Plus de bekende fragiele AI-response-parsing.

**Platform-constraint (F.I.-blokkade bevestigd):**
advertisement_publications.platform CHECK staat alleen toe:
`mascus, trucksnl, machineseeker, truckscout24`.
`forklift_international` ontbreekt → elke statusregistratie voor F.I. faalt.
Status-check: draft/pending/published/updated/failed/deleted (prima).

**equipment_type-waarden (let op bij F.I.-sync):** toegestaan zijn
`heavy_duty_forklift, empty_container_handler, reachstacker, terminal_tractor,
general_equipment, forklift, other`. De dagelijkse F.I.-sync filtert op
`equipment_type='forklift'`, maar de grote heftrucks staan (blijkens de UI) als
`heavy_duty_forklift` → sync matcht vrijwel niets. Meenemen in de F.I.-fix.

**Verder aanwezig op productie (niet uit de scripts te herleiden, deels dode v1-
of maintenance-resten):** machines + machine_*-tabellen, historical_data,
leads, qa_threads, digital_signatures, industry_profiles, styling_config,
bid_invitations.

## Consequenties voor de werklijst

1. Foto-sortering: eerst edge function onderzoeken; databasewijziging mogelijk
   niet nodig (of alleen een policy-aanpassing i.p.v. nieuwe policy).
2. F.I.-fix vereist: constraint verruimen met 'forklift_international' (+ evt.
   'website'), typecode-mapping, en het equipment_type-filter corrigeren.
3. Details-triggers: beslissen of trigger-loos de gewenste situatie is;
   zo ja, de drie create-*-triggers.sql-scripts archiveren zodat niemand ze
   alsnog draait.
4. Website-koppeling: apart gesprek met Tigran (handmatig vs. bouwen).
