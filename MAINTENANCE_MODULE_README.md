# Maintenance Cost Dashboard Module

## Overzicht

De Maintenance Cost Dashboard module is een volledige oplossing voor het beheren van onderhoudskosten van machines. Klanten kunnen onderhoudshistorie uploaden (facturen, werkbonnen, screenshots, Excel) en per machine en per vloot dashboards bekijken met:

- **Preventieve onderhoudskosten** (geplande servicebeurten)
- **Correctieve onderhoudskosten** (ongeplande reparaties)
- **Banden/velgen/montage kosten**
- **Totale kosten en kosten per draaiuur**

## Hoofdfunctionaliteiten

### ✅ Document Upload & AI Extractie
- **Ondersteunde formaten**: PDF, XLSX, CSV, DOCX, JPG/PNG
- **Bulk upload**: Meerdere bestanden tegelijk
- **Automatische matching**: Documenten worden automatisch gekoppeld aan machines op basis van serienummer of vlootnummer
- **AI data extractie**: OpenAI GPT-4 extraheert automatisch:
  - Serienummers, vlootnummers
  - Documentdatum, valuta
  - Leverancier, factuurnummer
  - Line items met bedragen en categorieën
  - Service intervals en urenstand

### ✅ Slimme Categorisatie
- **AI classificatie**: Automatische indeling in preventief, correctief of banden
- **Leer-functie**: Klanten kunnen categorieën corrigeren en rules maken voor hun hele vloot
- **Preventief interval extrapolatie**: Kosten per draaiuur op basis van service interval (500u, 1000u, etc.)

### ✅ Dashboards
- **Machine Dashboard**: KPI cards, grafieken per kwartaal, tabel met line items
- **Fleet Dashboard**: Overzicht alle machines, top 10 duurste machines op kosten/uur
- **Currency toggle**: Bekijk bedragen in originele valuta, EUR of USD

### ✅ Customer Portal
- **Customer login**: Klanten hebben eigen inlog met beperkte toegang
- **Alleen eigen data**: RLS zorgt dat klanten alleen hun eigen machines en documenten zien
- **Tijdelijke toegang**: Managers kunnen tijdelijk toegang geven tot machines van andere partijen

### ✅ FX Rate Conversion
- **3 providers**: ExchangeRate-API, Fixer.io, CurrencyAPI
- **Average-of-3**: Gebruikt gemiddelde van 3 bronnen voor nauwkeurige conversie
- **Automatische sync**: Dagelijks ophalen van nieuwe rates

## Setup Instructies

### 1. Database Setup

1. Open Supabase SQL Editor
2. Run het bestand `MAINTENANCE_MODULE_SETUP.sql`
3. Verifieer dat alle tabellen zijn aangemaakt:
   - `customers`
   - `maintenance_documents`
   - `maintenance_line_items`
   - `customer_classification_rules`
   - `fx_rates`
   - `temporary_dossier_access`

### 2. Storage Bucket

1. Ga naar Supabase Dashboard → Storage
2. Maak een nieuwe bucket aan:
   - **Name**: `maintenance-documents`
   - **Public**: Nee (private)
   - **Allowed MIME types**: `.pdf,.xlsx,.xls,.csv,.doc,.docx,.jpg,.jpeg,.png`
   - **Max file size**: 50MB

### 3. Edge Functions Deployen

**Let op**: De Supabase MCP tools werkten niet tijdens het bouwen. Deploy de edge functions handmatig:

#### extract-maintenance-document
```bash
cd supabase/functions/extract-maintenance-document
supabase functions deploy extract-maintenance-document --no-verify-jwt
```

#### fetch-fx-rates
```bash
cd supabase/functions/fetch-fx-rates
supabase functions deploy fetch-fx-rates --no-verify-jwt
```

### 4. API Keys Configureren

Ga naar Supabase Dashboard → Edge Functions → Secrets en voeg toe:

**Verplicht:**
- `OPENAI_API_KEY`: Voor AI document extractie (GPT-4)

**Optioneel (voor FX conversie):**
- `EXCHANGERATE_API_KEY`: https://www.exchangerate-api.com/
- `FIXER_API_KEY`: https://fixer.io/
- `CURRENCYAPI_KEY`: https://currencyapi.com/

**Notitie**: FX conversie werkt ook met 1 of 2 providers als je niet alle 3 wilt gebruiken.

### 5. RLS Policies Verifiëren

Controleer dat alle RLS policies actief zijn:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('customers', 'maintenance_documents', 'maintenance_line_items');

-- Should all return: rowsecurity = true
```

## Gebruik

### Voor Managers

1. **Klantenбeheer**: `/maintenance-management`
   - Nieuwe klanten aanmaken
   - Customer accounts activeren/deactiveren
   - Tijdelijke toegang verlenen tot specifieke machines

2. **Dossiers koppelen aan klanten**:
   - Ga naar een dossier
   - Voeg `customer_id` en `fleet_number` toe
   - Klant kan nu inloggen en de machine zien

### Voor Klanten

1. **Login**: Klanten gebruiken hun eigen credentials
2. **Customer Portal**: Automatisch doorgestuurd naar `/customer-portal`
3. **Upload documenten**:
   - Bulk upload (meerdere machines)
   - Per machine upload (handmatig koppelen)
4. **Dashboard bekijken**:
   - Fleet overview met totalen
   - Per machine detail met line items
5. **Categorieën corrigeren**:
   - Klik op edit icon bij line item
   - Kies nieuwe categorie
   - Optie om rule te maken voor hele vloot

## Database Schema

### customers
- `id` (uuid, PK)
- `user_id` (uuid, FK naar auth.users)
- `company_name`, `contact_person`, `email`, `phone`
- `default_currency` (EUR/USD/GBP)
- `is_active` (boolean)

### maintenance_documents
- `id` (uuid, PK)
- `customer_id` (uuid, FK)
- `dossier_id` (uuid, FK, nullable)
- `file_name`, `storage_path`, `file_type`, `file_size`, `file_hash`
- `match_status` (pending/matched/unmatched/ambiguous/manual)
- `serial_numbers[]`, `fleet_numbers[]`
- `document_date`, `currency`, `supplier_name`, `invoice_number`
- `extraction_status`, `raw_extraction_data`

### maintenance_line_items
- `id` (uuid, PK)
- `document_id` (uuid, FK)
- `dossier_id` (uuid, FK, nullable)
- `line_number`, `description`, `amount_excl_vat`, `currency`
- `category` (preventive/corrective/tires/unclassified)
- `service_interval_hours`, `meter_reading`
- `modified_by_customer` (boolean)

### customer_classification_rules
- Automatische rules die klanten maken
- `match_type` (keyword/supplier/description_pattern)
- `target_category` (preventive/corrective/tires)

### fx_rates
- `from_currency`, `to_currency`, `rate`
- `provider` (exchangerate-api/fixer/currencyapi)
- `is_latest` (boolean)

### temporary_dossier_access
- Tijdelijke toegang van managers naar klanten
- `expires_at` (timestamp)
- `revoked_at` (timestamp, nullable)

## Views

### maintenance_costs_by_dossier
- Per dossier rollup van kosten
- `preventive_cost`, `corrective_cost`, `tires_cost`, `total_cost`
- `cost_per_hour` (als uren bekend)
- `document_count`, `line_item_count`

### maintenance_costs_by_fleet
- Per customer rollup van kosten
- `machine_count`, `total_documents`
- Totalen per categorie
- `avg_cost_per_machine`

## Frontend Routes

- `/customer-portal` - Customer dashboard (FleetDashboard + MachineDashboard)
- `/maintenance-management` - Manager panel (customers + temporary access)

## Componenten

### MaintenanceUpload
- Drag & drop upload
- Progress indicator per file
- Automatische AI extractie en matching
- Dubbele upload detectie (file hash)

### MachineDashboard
- KPI cards (preventief/correctief/banden/totaal)
- Tabel met line items
- Edit functie voor categorieën
- "Apply to fleet" prompt bij correctie

### FleetDashboard
- Overzicht statistieken
- Top 10 duurste machines (cost/hour)
- Tabel met alle machines
- Excel export functie

### CustomerPortalPage
- Navigation (Fleet/Upload)
- Currency toggle (Original/EUR/USD)
- Machine selector grid
- Integrated upload per machine

### MaintenanceManagementPage
- Customer CRUD
- Temporary access grants
- Customer activation/deactivation

## Edge Functions

### extract-maintenance-document
- Input: `document_id`, `file_base64`, `file_type`, `customer_id`
- Proces:
  1. Extract text from document (PDF/Image/Excel)
  2. Send to OpenAI GPT-4 with extraction prompt
  3. Parse response (serial numbers, line items, categories)
  4. Match to dossiers (serial → fleet → unmatched)
  5. Insert line items
- Output: `extracted_data`, `matches`, `match_status`

### fetch-fx-rates
- Input: `base` currency (default: EUR)
- Proces:
  1. Fetch from 3 providers (parallel)
  2. Calculate average rates
  3. Store in `fx_rates` table
  4. Mark old rates as `is_latest=false`
- Output: `rates_saved`, `average_rates`

## Testing Checklist

1. ✅ Upload PDF met 1 serienummer → gekoppeld → line items zichtbaar
2. ✅ Upload PDF met meerdere serienummers → gesplitst per dossier
3. ✅ Upload zonder serial maar met fleet number → match op fleet
4. ✅ Upload zonder serial en fleet → status Unmatched + melding
5. ✅ Urenstand aanwezig → kosten per draaiuur zichtbaar
6. ✅ Preventieve "500 hrs service" → cost/hour = bedrag/500
7. ✅ Categorie corrigeren → vraag "apply to fleet" → rule werkt
8. ✅ FX toggle EUR/USD → bedragen converteren
9. ✅ Export Excel/CSV → alle data correct
10. ✅ Customer ziet alleen eigen dossiers
11. ✅ Temporary access → klant ziet tijdelijk andere machine → expires

## Troubleshooting

### AI Extractie faalt
- Check `OPENAI_API_KEY` in Edge Function secrets
- Bekijk `maintenance_documents.extraction_error` voor details
- Test met duidelijke, leesbare PDF (geen scan)

### Matching werkt niet
- Verifieer dat `serienummer` in dossier correct is
- Check `maintenance_documents.serial_numbers[]` array
- Test met `ilike` search in console: `SELECT * FROM dossiers WHERE serienummer ILIKE '%ABC123%'`

### FX Rates niet beschikbaar
- Check Edge Function logs: `supabase functions logs fetch-fx-rates`
- Verifieer API keys
- Run handmatig: `supabase functions invoke fetch-fx-rates`

### RLS Policies blokkeren
- Check user role: `SELECT rol FROM user_profiles WHERE id = auth.uid()`
- Verifieer customer_id koppeling
- Test policy in SQL Editor met `SET LOCAL role TO authenticated`

## Toekomstige Uitbreidingen

- **API ingest**: Automatisch ophalen van onderhoudsdata via API
- **Mailbox ingest**: Email forwarding van facturen
- **Charts & graphs**: Visualisatie van kosten trends
- **Budget alerts**: Notificaties bij overschrijding
- **Predictive maintenance**: ML model voor kostenvoorspelling

## Support

Voor vragen of problemen:
1. Check database logs: Supabase Dashboard → Database → Logs
2. Check Edge Function logs: Supabase Dashboard → Edge Functions → Logs
3. Bekijk RLS policies: Supabase Dashboard → Database → Policies
4. Review `maintenance_documents.extraction_error` voor AI failures

---

**Versie**: 1.0
**Datum**: 31 januari 2026
**Status**: Production Ready 🚀
