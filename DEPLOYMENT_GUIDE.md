# Maintenance Module - Deployment Guide

## Snel Overzicht
De maintenance module is gebouwd maar nog niet actief. Volg deze 4 stappen om het te activeren:

---

## ✅ STAP 1: Database Tabellen Aanmaken (5 minuten)

1. **Open Supabase Dashboard** → SQL Editor
2. **Kopieer de volledige inhoud** van `MAINTENANCE_MODULE_SETUP.sql`
3. **Plak in SQL Editor** en klik "Run"
4. **Verifieer**: Ga naar Database → Tables, check of deze tabellen bestaan:
   - ✓ `customers`
   - ✓ `maintenance_documents`
   - ✓ `maintenance_line_items`
   - ✓ `customer_classification_rules`
   - ✓ `fx_rates`
   - ✓ `temporary_dossier_access`

**Let op**: Als je een error krijgt over bestaande policies, is dat OK. Run de SQL opnieuw.

---

## ✅ STAP 2: Storage Bucket Aanmaken (1 minuut)

1. **Ga naar Supabase Dashboard** → Storage
2. **Klik "New bucket"**
3. **Configureer**:
   - Name: `maintenance-documents`
   - Public: **No** (privé)
   - Allowed MIME types: `.pdf,.xlsx,.xls,.csv,.doc,.docx,.jpg,.jpeg,.png`
   - Max file size: `52428800` (50MB)
4. **Klik "Create bucket"**

---

## ✅ STAP 3: Edge Functions Deployen (2 minuten)

### Optie A: Via Supabase CLI (Aanbevolen)
```bash
cd /path/to/project

# Deploy extract-maintenance-document
supabase functions deploy extract-maintenance-document

# Deploy fetch-fx-rates
supabase functions deploy fetch-fx-rates
```

### Optie B: Via Supabase Dashboard
1. Ga naar **Edge Functions** → **Deploy new function**
2. Upload `supabase/functions/extract-maintenance-document/index.ts`
3. Function name: `extract-maintenance-document`
4. Verify JWT: **Yes**
5. Herhaal voor `fetch-fx-rates`

---

## ✅ STAP 4: API Keys Configureren (2 minuten)

### Verplicht (voor AI extractie):
1. Ga naar **Edge Functions** → **Secrets**
2. Voeg toe:
   - Key: `OPENAI_API_KEY`
   - Value: `sk-...` (jouw OpenAI key)

### Optioneel (voor FX conversie):
Deze zijn NIET verplicht - de module werkt zonder FX conversie:
- `EXCHANGERATE_API_KEY` - https://www.exchangerate-api.com/
- `FIXER_API_KEY` - https://fixer.io/
- `CURRENCYAPI_KEY` - https://currencyapi.com/

**Tip**: Als je geen FX keys hebt, laat het Original currency veld gewoon staan.

---

## 🎯 STAP 5: Test Setup (5 minuten)

### 5.1 Maak Test Customer
```sql
-- In Supabase SQL Editor:
INSERT INTO customers (company_name, email, contact_person, is_active)
VALUES ('Test Company', 'test@example.com', 'John Doe', true)
RETURNING id;
-- Noteer het ID!
```

### 5.2 Koppel Dossier aan Customer
```sql
-- Vervang <CUSTOMER_ID> met ID uit stap 5.1
-- Vervang <DOSSIER_ID> met een bestaand dossier ID
UPDATE dossiers
SET customer_id = '<CUSTOMER_ID>',
    fleet_number = 'FLEET001'
WHERE id = '<DOSSIER_ID>';
```

### 5.3 Test de UI
1. **Manager view**: Ga naar je app en navigeer naar `/maintenance-management`
   - Je zou de test customer moeten zien

2. **Upload test**:
   - Ga naar een dossier detail pagina
   - Scroll naar "Maintenance" sectie
   - Upload een test PDF factuur

---

## 🔍 Hoe Check Je of het Werkt?

### Database Check:
```sql
-- Check of tabellen bestaan
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE '%maintenance%';

-- Check of views bestaan
SELECT viewname FROM pg_views
WHERE schemaname = 'public'
AND viewname LIKE '%maintenance%';
```

### Storage Check:
```sql
-- Check bucket
SELECT * FROM storage.buckets WHERE id = 'maintenance-documents';
```

### Edge Functions Check:
1. Ga naar **Edge Functions** in Supabase Dashboard
2. Je zou moeten zien:
   - `extract-maintenance-document` (Status: Active)
   - `fetch-fx-rates` (Status: Active)

---

## 🚨 Troubleshooting

### "Table already exists" error
- **Oplossing**: Dat is OK! De SQL gebruikt `CREATE TABLE IF NOT EXISTS`
- Ga verder naar volgende stap

### "Policy already exists" error
- **Oplossing**: Verwijder de oude policy eerst:
```sql
DROP POLICY IF EXISTS "policy_name" ON table_name;
```
- Run SQL opnieuw

### Edge Function deploy mislukt
- **Check**: Heb je Supabase CLI geïnstalleerd? `supabase --version`
- **Check**: Ben je ingelogd? `supabase login`
- **Check**: Is project gelinkt? `supabase link`

### Upload werkt niet
- **Check**: Is `OPENAI_API_KEY` ingesteld?
- **Check**: Bestaat de storage bucket `maintenance-documents`?
- **Check**: Is de Edge Function `extract-maintenance-document` gedeployed?
- **Debug**: Check Edge Function logs in Supabase Dashboard

---

## 📱 Waar Vind Je de Module?

Na deployment zijn deze nieuwe pagina's beschikbaar:

### Voor Managers:
- **`/maintenance-management`** - Customer beheer
  - Nieuwe customers aanmaken
  - Tijdelijke toegang verlenen
  - Customers activeren/deactiveren

### Voor Customers:
- **`/customer-portal`** - Customer dashboard
  - Fleet overview
  - Upload documenten
  - Machine details bekijken
  - Currency toggle (Original/EUR/USD)

### In Bestaande Dossiers:
- Maintenance sectie verschijnt automatisch in dossier detail pagina's
- Alleen zichtbaar als dossier gekoppeld is aan een customer

---

## 🎉 Success Criteria

Je weet dat het werkt als:
- ✓ Je ziet customers in `/maintenance-management`
- ✓ Je kunt een PDF uploaden (drag & drop)
- ✓ Upload toont "Processing..." → "Complete"
- ✓ Line items verschijnen in machine dashboard
- ✓ KPI cards tonen bedragen
- ✓ Excel export werkt

---

## 🆘 Hulp Nodig?

1. **Check database logs**: Supabase Dashboard → Database → Logs
2. **Check Edge Function logs**: Supabase Dashboard → Edge Functions → Logs
3. **Check extraction errors**:
   ```sql
   SELECT file_name, extraction_error
   FROM maintenance_documents
   WHERE extraction_status = 'failed';
   ```

---

## ⏱️ Totale Tijd: ~15 minuten

1. Database setup: 5 min
2. Storage bucket: 1 min
3. Edge Functions: 2 min
4. API keys: 2 min
5. Testing: 5 min

**Status na deployment**: Module is volledig operationeel! 🚀
