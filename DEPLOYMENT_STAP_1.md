# Stap 1: Database Setup

## Het Probleem
Je had alleen de **bestandsnaam** "MAINTENANCE_MODULE_SETUP.sql" geplakt.
Je moet de **inhoud** van het bestand plakken!

## De Oplossing

### Open twee vensters naast elkaar:
1. **Links**: Open het bestand `MAINTENANCE_MODULE_SETUP.sql` in je code editor
2. **Rechts**: Open Supabase Dashboard → SQL Editor

### Kopieer en plak:
1. **Selecteer ALLE regels** in `MAINTENANCE_MODULE_SETUP.sql` (van regel 1 t/m 315)
2. **Kopieer** (Ctrl+A, dan Ctrl+C)
3. **Plak** in de Supabase SQL Editor
4. Klik op **"Run"**

### Wat je zou moeten zien:
- ✅ "Success. No rows returned" of
- ✅ Een lijst van succesvolle operaties

### Let op:
- De SQL duurt ~2-3 seconden om te runnen
- Als je een error ziet over "policy already exists", is dat OK - run het gewoon opnieuw
- Er worden 6 nieuwe tabellen aangemaakt:
  - customers
  - maintenance_documents
  - maintenance_line_items
  - customer_classification_rules
  - fx_rates
  - temporary_dossier_access

## Verificatie

Check of het werkt:

```sql
-- Run dit in SQL Editor om te checken:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%maintenance%'
OR table_name = 'customers'
OR table_name = 'temporary_dossier_access';
```

Je zou dit moeten zien:
- customers
- maintenance_documents
- maintenance_line_items
- customer_classification_rules

## Als het niet werkt

**Foutmelding: "syntax error"**
- Je hebt waarschijnlijk niet alles gekopieerd
- Check: Begint je SQL met `-- =====` en eindigt met `===== ` ?

**Foutmelding: "table already exists"**
- Dat is GOED nieuws! De tabellen zijn al aangemaakt
- Ga door naar Stap 2

**Foutmelding: "policy already exists"**
- Ook goed! Het is al (deels) aangemaakt
- Run de SQL opnieuw, het zal de missende delen toevoegen

---

## Volgende Stap

Zodra je "Success" ziet → Ga naar Stap 2: Storage Bucket aanmaken
