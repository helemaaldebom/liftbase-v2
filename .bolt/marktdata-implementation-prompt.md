# Marktdata Systeem Implementation Prompt

## Overzicht
Implementeer een marktdata module voor het HClifters taxatie systeem waarmee gebruikers marktprijzen van heftrucks kunnen invoeren, beheren en gebruiken voor automatische waardebepalingen.

## Database Structuur

### 1. Gebruik Bestaande `dossiers` Tabel
- Voeg nieuwe kolommen toe aan de `dossiers` tabel voor marktdata specifieke velden
- Nieuwe kolommen:
  - `is_marktdata` (boolean, default false) - onderscheid tussen dossier en marktdata entry
  - `handelsprijs` (decimal) - optioneel, handelsprijs uit marktdata
  - `eindklantprijs` (decimal) - optioneel, eindklantprijs uit marktdata
  - `data_source` (text) - bron van de marktdata (naam, URL, etc.)
  - `data_source_url` (text) - optioneel, directe link naar bron
  - `data_notes` (text) - notities over de marktdata
  - `last_price_update` (timestamp) - laatst bijgewerkte prijsdatum

### 2. Nieuwe `market_bids` Tabel
Creëer een aparte tabel voor handelsprijzen uit marktdata (ter onderscheid van dealer biedingen):
```sql
CREATE TABLE market_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE,
  handelsprijs DECIMAL,
  eindklantprijs DECIMAL,
  observed_date TIMESTAMP DEFAULT now(),
  source TEXT,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP DEFAULT now()
);
```

### 3. RLS Policies
- **Verkopers**:
  - Kunnen marktdata invoeren (INSERT op dossiers met is_marktdata=true)
  - Kunnen ALLE marktdata bekijken (SELECT waar is_marktdata=true)
  - Kunnen NIET bewerken/verwijderen
- **Managers**:
  - Volledige toegang tot alle marktdata (SELECT, INSERT, UPDATE, DELETE)

## Functionaliteit

### 1. Marktdata Invoeren Pagina
**Route**: `/marktdata/invoeren`

**Features**:
- Formulier met kolommen uit Excel: Brand, Type of Machine, Model, Year of Manufacturing, Serial Number, Running Hours, Location, Handelsprijs (optioneel), Eindklantprijs (optioneel), Bron, Bron URL, Notities
- Foto upload ondersteuning (zoals dossiers, gebruik bestaande storage bucket)
- Real-time serienummer check tijdens typen:
  - Als match gevonden EN record < 1 jaar oud: toon waarschuwing modal met bestaande data, vraag of gebruiker wil updaten
  - Als match gevonden EN record > 1 jaar oud: toon info modal met bestaande data, maak automatisch nieuw record aan
  - Als geen match: gewoon opslaan als nieuw record

**Validatie**:
- Minimaal één prijs vereist (handelsprijs OF eindklantprijs)
- Brand, Type, Model, Year, Serial Number zijn verplicht

### 2. Marktdata Database Inzien Pagina
**Route**: `/marktdata/database`

**Features**:
- Tabel met alle marktdata records
- Filters:
  - Merk (dropdown met unieke merken)
  - Type (dropdown)
  - Model (text search)
  - Bouwjaar (range slider of van/tot)
  - Prijsbereik handelsprijs (van/tot)
  - Prijsbereik eindklantprijs (van/tot)
  - Invoerdatum (datum range picker)
  - Locatie (dropdown)
- Kolommen in tabel:
  - Brand, Type, Model, Year, Running Hours, Location
  - Handelsprijs (formatteren als €)
  - Eindklantprijs (formatteren als €)
  - Invoerdatum
  - Ingevoerd door (user naam)
  - Acties (bekijk details, alleen manager: bewerk/verwijder)
- Excel export knop:
  - Exporteer alle marktdata + dossier machines
  - Respecteer actieve filters
  - Alle kolommen inclusief serienummer
- Permissies:
  - Verkopers: kunnen alles zien, geen bewerken/verwijderen
  - Managers: volledig CRUD

### 3. Automatische Waardebepaling
**Integratie in DossierDetailPage**:

Wanneer een dossier wordt bekeken, toon een "Waardebepaling" sectie met:

**Matching Logica**:
1. Zoek in marktdata records (is_marktdata=true) met filters:
   - Zelfde Type of Machine (exact match)
   - Zelfde Brand (exact match)
   - Year of Manufacturing ± 3 jaar
   - Running Hours ± 10.000 uur
2. Sorteer op:
   - Eerst: meest recente invoerdatum (created_at)
   - Dan: dichtstbijzijnde bouwjaar
   - Dan: dichtstbijzijnde urenstand
3. Selecteer top 3 matches

**Weergave**:
- Toon tabel met 3 referentie machines:
  - Brand, Model, Year, Running Hours
  - Handelsprijs (indien beschikbaar)
  - Eindklantprijs (indien beschikbaar)
  - Invoerdatum
- Bereken en toon "Gemiddelde Waarde":
  - Gemiddelde van beschikbare handelsprijzen
  - Gemiddelde van beschikbare eindklantprijzen
  - Toon beide gemiddeldes indien beschikbaar
- Als < 3 matches: toon waarschuwing "Beperkte marktdata beschikbaar"
- Als 0 matches: toon "Geen vergelijkbare machines gevonden in marktdata"

### 4. Prijs Suggestie bij Nieuw Dossier
**Integratie in NewDossierModal**:

Wanneer gebruiker Brand, Type, Model, Year en Running Hours invult:
- Voer automatisch waardebepaling uit (zelfde logica als hierboven)
- Toon suggestie onder relevante velden:
  - "Suggestie o.b.v. marktdata: € X.XXX (handelsprijs) / € X.XXX (eindklantprijs)"
  - Maak klikbaar om waarde over te nemen
- Toon aantal referenties gebruikt: "Gebaseerd op X vergelijkbare machines"

## UI/UX Requirements

### Navigatie
Voeg toe aan hoofdmenu:
- "Marktdata" submenu met:
  - "Invoeren" (alle gebruikers)
  - "Database" (alle gebruikers)

### Styling
- Gebruik bestaande Tailwind styling voor consistentie
- Marktdata records visueel onderscheidbaar van gewone dossiers (bijv. badge of kleur accent)
- Waardebepaling sectie prominent maar niet opdringerig

### Responsive Design
- Alle nieuwe paginas volledig responsive
- Tabellen mobile-friendly met horizontal scroll indien nodig

## Migratie Script

Creëer migratie bestand: `supabase/migrations/YYYYMMDDHHMMSS_add_marktdata_module.sql`

Voeg toe:
1. Nieuwe kolommen aan `dossiers` tabel
2. Nieuwe `market_bids` tabel
3. RLS policies voor marktdata
4. Indexes voor performance:
   - `dossiers.is_marktdata`
   - `dossiers.brand, type_of_machine, year_of_manufacturing`
   - `market_bids.dossier_id`

## Testing Checklist

- [ ] Verkoper kan marktdata invoeren
- [ ] Serienummer duplicaat detectie werkt (< 1 jaar = update suggestie, > 1 jaar = nieuw record)
- [ ] Manager kan marktdata bewerken/verwijderen
- [ ] Filters werken correct in database view
- [ ] Excel export bevat juiste data met filters
- [ ] Waardebepaling toont correcte top 3 matches
- [ ] Gemiddelde waarde correct berekend
- [ ] Prijs suggestie werkt bij nieuw dossier
- [ ] Foto upload werkt voor marktdata
- [ ] RLS policies correct geïmplementeerd

## Prioriteit
**HIGH** - Dit is een core feature voor betere waardebepalingen en marktinzicht.

## Acceptatie Criteria
1. Gebruikers kunnen marktdata snel invoeren met duplicaat detectie
2. Managers hebben volledig overzicht en controle over marktdata
3. Waardebepaling is accuraat en transparant (toont referenties)
4. Excel export werkt voor rapportage doeleinden
5. Systeem helpt gebruikers bij het inschatten van machine waarde

## Technische Notes
- Gebruik Supabase storage voor foto's (bestaande bucket hergebruiken of nieuwe maken)
- Zorg voor goede error handling bij API calls
- Optimaliseer queries voor waardebepaling (gebruik indexes)
- Cache waardebepaling resultaten waar mogelijk (bijv. 1 uur cache)
