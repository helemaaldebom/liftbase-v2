# HC-Lifters Taxatie & Voorraad Management Systeem

**Versie:** 1.0
**Laatste update:** Januari 2026
**Type:** React + TypeScript + Supabase Web Applicatie

---

## 📋 OVERZICHT

HC-Lifters is een uitgebreid taxatie- en voorraadbeheersysteem voor de handel in havenequipment (heftrucks, reachstackers, empty container handlers en terminal tractors). Het systeem ondersteunt het volledige proces van inkoop tot verkoop, inclusief taxatie, biedingen, dealerbeheer en publicatie naar externe marktplaatsen.

---

## 👥 GEBRUIKERSROLLEN

### 1. **Manager** (Hoogste rechten)
- Volledige toegang tot alle modules
- Gebruikersbeheer (CRUD op users)
- Dealerbeheer (CRUD op dealers)
- Alle dossiers beheren en verwijderen
- Biedingen beheren en accepteren
- Marktdata invoeren en beheren
- Publicatie naar externe platforms
- Toegang tot alle statistieken

### 2. **Verkoper**
- Dossiers aanmaken en bewerken
- Biedingen aanmaken en bekijken
- Foto's en documenten uploaden
- Marktdata invoeren
- Taxatietool gebruiken
- GEEN gebruikers- of dealerbeheer
- GEEN dossiers verwijderen

### 3. **Dealer** (Externe partij)
- Inloggen met unieke credentials (email + wachtwoord)
- Alleen dossiers bekijken die aan hen zijn toegewezen
- Biedingen plaatsen op toegewezen dossiers
- Foto's en specificaties bekijken
- GEEN toegang tot andere dealers' informatie
- GEEN toegang tot interne systemen

### 4. **Eindgebruiker** (Klant/Taxatie)
- Alleen toegang tot taxatietool
- Eigen dossiers aanmaken voor taxatie
- Marktdata bekijken (beperkt)
- GEEN toegang tot voorraadsysteem
- GEEN biedingen plaatsen

---

## 🗄️ DATABASE STRUCTUUR

### **1. Users & Authentication**

#### `auth.users` (Supabase Auth)
- Authenticatie en autorisatie
- Email/password login
- Managed door Supabase Auth

#### `user_profiles`
Kolommen:
- `id` (uuid, FK naar auth.users)
- `email` (text)
- `display_name` (text)
- `rol` (enum: 'manager', 'verkoper', 'eindgebruiker')
- `language_preference` (text: 'nl', 'en', 'de')
- `created_at`, `updated_at`

Relaties:
- One-to-one met auth.users
- Auto-created via trigger bij nieuwe user

---

### **2. Dossiers (Kern van het systeem)**

#### `dossiers`
**Doel:** Centrale voorraadadministratie per machine

Kolommen:
- `id` (uuid, PK)
- `dossiernummer` (text, unique, auto-increment format: "2026-001")
- `dossier_date` (date, default: current date)
- `created_by` (uuid, FK naar user_profiles)
- `customer_name` (text) - Naam van verkoper/inkoopbron
- `status` (enum: 'stock', 'sold', 'reserved')
- `equipment_type` (enum: 'forklift', 'reachstacker', 'ech', 'terminal_tractor')
- `created_at`, `updated_at`

**Basisinformatie:**
- `merk`, `model`, `type`
- `bouwjaar` (integer)
- `serienummer` (text)
- `uren` (integer) - Draaiuren/gebruiksuren
- `locatie` (text)
- `lat`, `lng` (float) - GPS coördinaten

**Specificaties:**
- `mast_type` (enum voor forklifts)
- `mast_hoogte` (integer, mm)
- `vrije_hefhoogte` (integer, mm)
- `capaciteit` (integer, kg)
- `load_center` (integer, mm) - Lastzwaartepunt
- `aandrijving` (enum: 'diesel', 'electric', 'lpg', 'hybrid')
- `transmissie` (enum: 'manual', 'automatic', 'powershift')

**Prijzen:**
- `purchase_price` (decimal) - Inkoopprijs
- `asking_price` (decimal) - Vraagprijs
- `sale_price` (decimal) - Werkelijke verkoopprijs

**Marktdata velden:**
- `similar_machines_count` (integer)
- `market_price_avg` (decimal)
- `market_price_min` (decimal)
- `market_price_max` (decimal)
- `price_suggestion` (decimal)
- `is_from_marktdata` (boolean) - Of dit van marktdata import komt

**Publicatie:**
- `forklift_international_ad_id` (text) - ID bij externe marktplaats

Relaties:
- One-to-many met `bids`
- One-to-many met `photos`
- One-to-one met detail tabellen (forklift_details, etc.)
- Many-to-one met `user_profiles` (creator)

---

### **3. Detail Tabellen (Equipment-specifiek)**

#### `forklift_details`
**Doel:** Extra specificaties voor heftrucks

Kolommen:
- `id` (uuid, PK)
- `dossier_id` (uuid, FK naar dossiers)
- Kopie van alle basis dossier velden (gesynchroniseerd via triggers)

**Mast & Hefvermogen:**
- `mast_type`, `mast_hoogte`, `vrije_hefhoogte`
- `side_shift` (boolean + mm)
- `fork_positioner` (boolean)

**Vorken:**
- `forks_present` (boolean)
- `forks_length` (integer, mm)
- `forks_width` (integer, mm)
- `forks_thickness` (integer, mm)

**Hydrauliek:**
- `hydraulic_lines` (integer, 2-5)
- `hydraulic_quick_couplers` (boolean)

**Attachments:**
- `attachment_type` (enum: 'bale_clamp', 'sideshifter', 'rotator', 'paper_roll_clamp', 'carton_clamp', 'container_spreader', 'other', 'none')
- `attachment_other` (text)

**Banden:**
- `tire_type` (enum: 'pneumatic', 'solid', 'cushion', 'super_elastic')
- `tire_condition_front` (enum: 'excellent', 'good', 'average', 'poor')
- `tire_condition_rear` (enum: 'excellent', 'good', 'average', 'poor')

**Overig:**
- `cabin_type` (enum: 'open', 'enclosed')
- `adblue` (boolean) - Voor dieselmotoren
- `central_greasing` (boolean)
- `opmerkingen` (text)

Triggers:
- Auto-create bij nieuw dossier met type 'forklift'
- Sync updates tussen dossiers en forklift_details

---

#### `reachstacker_details`
**Doel:** Extra specificaties voor reachstackers

Kolommen:
- `id`, `dossier_id`
- Alle basis dossier velden

**Reachstacker-specifiek:**
- `stacking_height_rows` (integer, 1-6) - Aantal rijen stapelhoogte
- `stacking_height_over_one` (integer, 1-5) - Rijen over 1 heen
- `cabin_type` (enum: 'low_cabin', 'high_cabin')
- `spreader_type` (enum: 'manual', 'semi_automatic', 'automatic')
- `container_sizes` (text[]) - Array: ['20ft', '40ft', '45ft']
- `weighing_system` (boolean)
- `camera_system` (boolean)

**Capaciteit matrix:**
- `capacity_row_1` tot `capacity_row_6` (integer, kg) - Per stapelhoogte
- `central_greasing` (boolean)
- `opmerkingen` (text)

---

#### `empty_container_handler_details`
**Doel:** Extra specificaties voor empty container handlers

Kolommen:
- `id`, `dossier_id`
- Alle basis dossier velden

**ECH-specifiek:**
- `max_stacking_height` (integer) - Containers hoog
- `box_type` (enum: 'single', 'double', 'double_independent')
- `container_sizes` (text[])
- `spreader_type` (enum: 'fixed', 'telescopic')
- `stacking_pattern` (text) - Bijvoorbeeld "1-over-2"
- `weighing_system` (boolean)
- `central_greasing` (boolean)
- `opmerkingen` (text)

---

#### `terminal_tractor_details`
**Doel:** Extra specificaties voor terminal tractors

Kolommen:
- `id`, `dossier_id`
- Alle basis dossier velden

**Terminal Tractor-specifiek:**
- `cabin_type` (enum: 'day_cabin', 'sleeper_cabin')
- `coupling_type` (enum: 'fifth_wheel', 'automatic', 'manual')
- `fifth_wheel_height` (integer, mm)
- `axle_configuration` (text) - Bijvoorbeeld "4x2", "6x4"
- `trailer_brake` (enum: 'air', 'hydraulic', 'electric')
- `hydraulic_system` (boolean)
- `pto` (boolean) - Power Take-Off
- `adblue` (boolean)
- `central_greasing` (boolean)
- `opmerkingen` (text)

---

### **4. Dealers & Biedingen**

#### `dealers`
**Doel:** Externe partijen die kunnen bieden op voorraad

Kolommen:
- `id` (uuid, PK)
- `bedrijfsnaam` (text, required)
- `contactpersoon` (text, required)
- `email` (text, unique, nullable) - Voor login
- `telefoonnummer` (text)
- `adres`, `postcode`, `plaats`, `land`
- `notities` (text)
- `actief` (boolean, default: true)
- `created_at`, `updated_at`

Relaties:
- One-to-many met `bids`

Authenticatie:
- Dealers kunnen inloggen met email/wachtwoord
- Wachtwoorden via Supabase Auth
- RLS policies beperken toegang tot eigen biedingen

---

#### `bids`
**Doel:** Biedingen van dealers op dossiers

Kolommen:
- `id` (uuid, PK)
- `dossier_id` (uuid, FK naar dossiers)
- `dealer_id` (uuid, FK naar dealers)
- `bedrag` (decimal, nullable) - Biedbedrag
- `status` (enum: 'pending', 'accepted', 'rejected', 'withdrawn')
- `opmerkingen` (text) - Notities bij bieding
- `sales_price` (decimal, nullable) - Uiteindelijke verkoopprijs
- `created_at`, `updated_at`
- `created_by` (uuid, FK naar user_profiles)

Business Rules:
- Meerdere biedingen mogelijk per dossier
- Alleen managers kunnen biedingen accepteren
- Dealers zien alleen hun eigen biedingen
- Bedrag mag null zijn (bijvoorbeeld voor "interesse")

---

### **5. Media & Documenten**

#### `photos`
**Doel:** Foto's per dossier met AI-sorting

Kolommen:
- `id` (uuid, PK)
- `dossier_id` (uuid, FK naar dossiers)
- `storage_path` (text) - Pad in Supabase Storage
- `url` (text) - Public URL
- `category` (enum: 'exterior', 'interior', 'engine', 'damage', 'documents', 'other')
- `display_order` (integer) - Handmatig sorteerbaar
- `visible_online` (boolean, default: true) - Tonen op publicaties
- `file_size` (integer, bytes)
- `created_at`, `updated_at`

Features:
- Upload via drag & drop
- AI-powered auto-categorisatie (via Edge Function)
- Handmatig herordenen
- Bulk upload support
- Storage in Supabase Storage bucket: `dossier-photos`

---

#### `dossier_attachments`
**Doel:** PDF documenten per dossier

Kolommen:
- `id` (uuid, PK)
- `dossier_id` (uuid, FK naar dossiers)
- `file_name` (text)
- `storage_path` (text)
- `file_type` (text) - MIME type
- `file_size` (integer)
- `created_at`

Storage:
- Bucket: `dossier-attachments`
- Ondersteunde formaten: PDF, Word, Excel, etc.

---

#### `videos`
**Doel:** Video's per dossier

Kolommen:
- `id` (uuid, PK)
- `dossier_id` (uuid, FK naar dossiers)
- `storage_path` (text)
- `url` (text)
- `file_size` (integer)
- `duration` (integer, seconds)
- `created_at`

Storage:
- Bucket: `dossier-videos`
- Ondersteunde formaten: MP4, MOV, AVI

---

### **6. Marktdata (Taxatietool)**

#### `marktdata`
**Doel:** Historische marktprijzen voor taxatie-algoritme

Kolommen:
- `id` (uuid, PK)
- `dossiernummer` (text, auto-generated)
- `equipment_type` (enum)
- `created_by` (uuid, FK naar user_profiles)

**Identieke velden als dossiers:**
- Alle specificatie velden (merk, model, bouwjaar, etc.)
- Prijsvelden (purchase_price, asking_price, sale_price)
- Equipment-specifieke velden

**Web Scraping velden:**
- `scraped_from` (text) - Bron website
- `scraped_url` (text) - Originele advertentie URL
- `scraped_at` (timestamp)
- `scraped_price` (decimal)
- `scraped_location` (text)

**Import tracking:**
- `is_from_marktdata` (boolean)
- `created_at`, `updated_at`

Gebruik:
- Handmatige invoer via formulier
- CSV bulk import
- Web scraping (Mascus)
- Basis voor prijssuggesties in taxatietool

---

### **7. Publicatie & Advertenties**

#### `advertisements`
**Doel:** Tracking van gepubliceerde advertenties op externe platforms

Kolommen:
- `id` (uuid, PK)
- `dossier_id` (uuid, FK naar dossiers)
- `platform` (enum: 'forklift_international', 'mascus', 'technikboerse')
- `external_ad_id` (text) - ID op externe platform
- `status` (enum: 'active', 'paused', 'expired', 'deleted')
- `published_at` (timestamp)
- `expires_at` (timestamp, nullable)
- `view_count` (integer, default: 0)
- `inquiry_count` (integer, default: 0)
- `last_synced_at` (timestamp)
- `sync_errors` (text, nullable)
- `created_at`, `updated_at`

Relaties:
- Many-to-one met `dossiers`
- Één dossier kan meerdere advertenties hebben (verschillende platforms)

---

#### `api_credentials`
**Doel:** Opslag externe API keys

Kolommen:
- `id` (uuid, PK)
- `platform` (text) - Naam van platform
- `api_key` (text, encrypted)
- `api_secret` (text, encrypted)
- `username` (text, nullable)
- `other_credentials` (jsonb) - Flexibel veld voor extra data
- `is_active` (boolean)
- `last_used_at` (timestamp)
- `created_at`, `updated_at`

Security:
- Alleen managers hebben toegang
- Keys zijn encrypted at rest

---

## 🎯 FUNCTIONALITEITEN PER MODULE

### **1. Dashboard (Managers & Verkopers)**

**URL:** `/dashboard`

Features:
- Overzicht statistieken:
  - Totaal aantal dossiers per status
  - Totaal aantal biedingen per status
  - Totaal aantal dealers
  - Totaal aantal marktdata records
- Snelle filters per equipment type
- Recent toegevoegde dossiers (top 10)
- Kaartweergave met alle machines (MapOverview)
- Zoekfunctionaliteit (GlobalSearch)

---

### **2. Dossiers Module**

**URL:** `/dossiers`

#### **Features:**
1. **Overzicht:**
   - Lijst van alle dossiers
   - Filters: equipment type, status, locatie
   - Zoeken op dossiernummer, merk, model, serienummer
   - Sorteerbaar op datum, prijs, status
   - Kaartweergave met GPS-coördinaten

2. **Dossier aanmaken:**
   - Modal met stappen:
     1. Equipment type selecteren
     2. Basisinformatie invoeren
     3. Specificaties invoeren (type-specifiek formulier)
     4. Prijzen en marktdata
   - Auto-generate dossiernummer (format: YYYY-NNN)
   - GPS coördinaten ophalen via geocoding

3. **Dossier bewerken:**
   - Tabbed interface:
     - Tab 1: Basisinformatie
     - Tab 2: Specificaties (equipment-specific)
     - Tab 3: Foto's & Documenten
     - Tab 4: Biedingen
     - Tab 5: Publicatie
   - Real-time opslag
   - Validatie op verplichte velden

4. **Foto Management:**
   - Drag & drop upload (meerdere bestanden)
   - AI-powered auto-categorisatie
   - Handmatig herordenen (drag & drop)
   - Toon/verberg per foto voor publicatie
   - Bulk upload support
   - Thumbnail preview
   - Lightbox voor full-screen view

5. **Document Management:**
   - PDF upload
   - PDF data extractie via AI (extract-pdf-data Edge Function)
   - Preview in browser
   - Download functionaliteit

6. **Video Management:**
   - Upload tot 100MB per video
   - HTML5 video player
   - Thumbnail generation

7. **Biedingen beheer:**
   - Overzicht alle biedingen op dit dossier
   - Status updates (accepteren/afwijzen)
   - Notities per bieding
   - Email notificaties naar dealers

8. **Dossier kopiëren:**
   - Dupliceer een dossier
   - Automatisch nieuw dossiernummer
   - Kopieert alle details (zonder foto's/documenten)

9. **PDF Export:**
   - Meertalig (NL, EN, DE)
   - Selecteer taal via modal
   - Professionele layout met logo
   - Alle specs, foto's en documenten
   - Terms & Conditions in gekozen taal

10. **Excel Export:**
    - Export selectie of alle dossiers
    - Alle velden in spreadsheet
    - Geschikt voor analyse

---

### **3. Taxatietool**

**URL:** `/taxatie`

#### **Doel:**
Machine taxeren op basis van historische marktdata

#### **Workflow:**
1. **Equipment type selecteren**
2. **Specificaties invoeren:**
   - Merk, model, bouwjaar
   - Capaciteit, masthoogte
   - Uren, locatie
   - Aandrijving, transmissie
   - Conditie indicatoren

3. **Marktdata analyse:**
   - Algoritme zoekt vergelijkbare machines in `marktdata` tabel
   - Filters:
     - Zelfde equipment type
     - Merk/model match (exact of fuzzy)
     - Bouwjaar range (±3 jaar)
     - Capaciteit range (±20%)
     - Uren range
   - Berekeningen:
     - Gemiddelde prijs
     - Min/max prijzen
     - Aantal vergelijkbare machines
     - Prijstrend

4. **Prijssuggestie:**
   - Weighted algoritme:
     - 40% gemiddelde marktprijs
     - 30% conditie correctie
     - 20% uren correctie
     - 10% locatie correctie
   - Range: minimum - gemiddeld - maximum
   - Confidence score

5. **Dossier aanmaken (optioneel):**
   - Direct van taxatie → nieuw dossier
   - Alle ingevoerde data wordt overgenomen

#### **Toegang:**
- Managers: volledige toegang
- Verkopers: volledige toegang
- Eindgebruikers: alleen taxatietool, geen dossiers

---

### **4. Marktdata Module**

**URL's:** `/marktdata-invoeren`, `/marktdata-import`, `/marktdata-database`

#### **4.1 Handmatig Invoeren**
Features:
- Formulier per equipment type
- Identiek aan dossier formulier
- Wordt opgeslagen in `marktdata` tabel
- Voor historische data entry

#### **4.2 CSV Import**
Features:
- Template download (Excel format)
- Bulk import (honderden records tegelijk)
- Mapping van kolommen
- Validatie:
  - Verplichte velden
  - Data types
  - Enum waarden
- Foutrapportage per rij
- Preview voor import
- Edge Function: `import-marktdata`

Template velden:
```csv
equipment_type,merk,model,bouwjaar,capaciteit,uren,aandrijving,sale_price,locatie,...
forklift,Linde,H80,2015,8000,5000,diesel,45000,Rotterdam,NL
```

#### **4.3 Web Scraping (Mascus)**
Features:
- Automatische scraper via Edge Function
- URL format: `https://www.mascus.nl/transport/heftruck/...`
- Extraheert:
  - Merk, model, bouwjaar
  - Prijs, locatie
  - Specificaties uit beschrijving
  - Foto's (URLs)
- Opslag in `marktdata` met `scraped_from` veld
- Dagelijkse sync via cron job

#### **4.4 Database Overzicht**
Features:
- Alle marktdata records
- Filters: type, merk, bouwjaar, prijsrange
- Zoeken
- Edit/delete
- Export naar Excel
- Statistieken per type

---

### **5. Biedingen Module**

**URL:** `/biedingen`

#### **Voor Managers & Verkopers:**
Features:
- Overzicht alle biedingen
- Filters:
  - Status (pending, accepted, rejected)
  - Dealer
  - Dossier
  - Datum range
- Acties:
  - Accepteren
  - Afwijzen
  - Notities toevoegen
  - Sales price invoeren
- Bulk operaties:
  - Bulk offer naar dealers (selecteer meerdere dossiers)
  - Email naar dealer met aanbod

#### **Voor Dealers:**
Features:
- Alleen eigen biedingen zichtbaar
- Status updates real-time
- Nieuwe bieding plaatsen op toegewezen dossier
- Dossiers bekijken waarvoor uitgenodigd
- Email notificaties

---

### **6. Dealers Module**

**URL:** `/dealers`

**Alleen Managers**

Features:
1. **Overzicht:**
   - Lijst alle dealers
   - Actief/inactief status
   - Aantal biedingen per dealer
   - Laatste activiteit

2. **Dealer toevoegen:**
   - Bedrijfsnaam, contactpersoon
   - Email (optioneel, voor login)
   - Adresgegevens
   - Notities

3. **Dealer login aanmaken:**
   - Genereer email + wachtwoord
   - Account aanmaken in Supabase Auth
   - Email met credentials naar dealer
   - Edge Function: `create-dealer-account`

4. **Dealer bewerken:**
   - Update gegevens
   - Wachtwoord resetten
   - Deactiveren (soft delete)

5. **Bulk offer:**
   - Selecteer meerdere dossiers
   - Selecteer dealers
   - Verstuur aanbod via email
   - Edge Function: `bulk-offer-to-dealers`

---

### **7. Publicatie Module**

**URL:** `/publicatie`

**Doel:** Advertenties beheren op externe marktplaatsen

#### **Ondersteunde Platforms:**

##### **7.1 Forklift International**
Features:
- Publish knop in dossier
- Mapping van velden naar FI API format
- Foto upload (max 20 foto's)
- Multi-language support (EN, DE, FR, IT, ES)
- Status tracking
- Auto-sync (dagelijks)
- Edge Function: `publish-to-forklift-international`
- Daily sync: `daily-forklift-international-sync`

API vereisten:
- API credentials opgeslagen in `api_credentials`
- OAuth2 authenticatie
- Rate limiting

##### **7.2 Mascus** (In ontwikkeling)
Features:
- Vergelijkbaar met Forklift International
- Edge Function: `publish-to-mascus`
- XML feed generatie

#### **Publicatie Dashboard:**
Features:
- Overzicht alle actieve advertenties
- Filters: platform, status
- Bulk acties:
  - Pause/resume
  - Delete
  - Refresh
- Statistieken:
  - Views per advertentie
  - Inquiries
  - Conversie rate
- Sync status en errors

---

### **8. Instellingen Module**

**URL:** `/settings`

#### **Gebruikersinstellingen:**
- Taalvoorkeur (NL, EN, DE)
- Display name
- Email
- Wachtwoord wijzigen

#### **Manager Settings:**
- API credentials beheer
- Gebruikersbeheer:
  - Lijst alle users
  - Rollen toewijzen
  - Users activeren/deactiveren
  - Edge Function: `update-user`, `delete-user`
- Systeeminstellingen:
  - Logo upload
  - Bedrijfsgegevens
  - Email templates

#### **Test Functies (Development):**
- Create test users
- Reset test passwords
- Database health checks
- Edge Function: `create-test-users`, `reset-test-passwords`

---

## 🔧 EDGE FUNCTIONS (Supabase)

### **1. Authentication & Users**

#### `create-dealer-account`
- Input: dealer_id, email, password
- Actie:
  - Create user in Supabase Auth
  - Link to dealer record
  - Send welcome email
- CORS: Enabled

#### `create-test-users`
- Development only
- Creates test accounts (manager, verkoper, dealer)
- Used for demo/testing

#### `delete-user`
- Input: user_id
- Actie:
  - Delete from auth.users
  - Cascade delete user_profiles
  - Cleanup related records

#### `update-user`
- Input: user_id, updates (email, role, display_name)
- Actie:
  - Update auth.users
  - Update user_profiles
  - Audit trail

#### `reset-test-passwords`
- Development only
- Resets all test account passwords

---

### **2. Biedingen & Communication**

#### `send-bid-invitation`
- Input: dossier_ids[], dealer_ids[]
- Actie:
  - Create bid records
  - Send email to dealers
  - Include dossier details
  - Personalized message
- Email template: HTML met logo

#### `bulk-offer-to-dealers`
- Input: dossier_ids[], dealer_ids[], message
- Actie:
  - Loop through combinations
  - Call send-bid-invitation per dealer
  - Track success/failures
- Returns: summary report

---

### **3. Media & AI**

#### `sort-photos-with-ai`
- Input: dossier_id
- Actie:
  - Fetch all photos for dossier
  - Download images from storage
  - Send to OpenAI Vision API
  - Prompt: "Categorize this image of industrial equipment"
  - Update photo.category in database
  - Return: categorization results
- AI Model: GPT-4 Vision
- Categories: exterior, interior, engine, damage, documents, other

#### `extract-pdf-data`
- Input: file_url, dossier_id
- Actie:
  - Download PDF from URL
  - Extract text via PDF parsing
  - Send to OpenAI GPT-4
  - Prompt: "Extract equipment specs from this document"
  - Structure response as JSON
  - Update dossier fields
- Use case: Auto-fill specs from uploaded spec sheets

---

### **4. Marktdata & Import**

#### `import-marktdata`
- Input: CSV file (base64 or URL)
- Actie:
  - Parse CSV
  - Validate rows:
    - Required fields present
    - Data types correct
    - Enum values valid
  - Insert into `marktdata` table
  - Return: success_count, error_count, errors[]
- Handles: up to 1000 rows per call
- Timeout: 5 minutes

#### `scrape-mascus`
- Input: url (Mascus listing)
- Actie:
  - Fetch HTML via Deno fetch
  - Parse HTML (DOM manipulation)
  - Extract:
    - Price (€)
    - Specs table
    - Location
    - Photos
  - Create marktdata record
  - Set scraped_from, scraped_url
- Rate limiting: 10 calls/minute

---

### **5. Publicatie & Sync**

#### `publish-to-forklift-international`
- Input: dossier_id, language
- Actie:
  - Fetch dossier + details + photos
  - Map to Forklift International API format:
    ```json
    {
      "manufacturer": "Linde",
      "model": "H80",
      "year": 2015,
      "hours": 5000,
      "price": 45000,
      "photos": [...],
      "description": "...",
      "language": "en"
    }
    ```
  - POST to FI API
  - Store external_ad_id in `advertisements`
  - Return: success, ad_url

#### `publish-to-mascus`
- Similar to Forklift International
- Different API format (XML-based)

#### `daily-forklift-international-sync`
- Scheduled: Daily at 03:00 UTC
- Actie:
  - Fetch all active advertisements (platform='forklift_international')
  - For each:
    - Call FI API to get stats (views, inquiries)
    - Update advertisement record
    - Check if expired/deleted
    - Update status
  - Handle errors gracefully
  - Log to http_request_queue

#### `sync-advertisements`
- Manual trigger version of daily sync
- Input: platform (optional filter)

---

## 🔐 ROW LEVEL SECURITY (RLS)

### **Policies per Rol:**

#### **Managers (rol='manager'):**
- **SELECT:** All tables
- **INSERT:** All tables
- **UPDATE:** All tables
- **DELETE:** All tables (except auth.users - via Edge Function)

#### **Verkopers (rol='verkoper'):**
- **Dossiers:**
  - SELECT: All
  - INSERT: Own created dossiers
  - UPDATE: Own created dossiers
  - DELETE: None
- **Bids:**
  - SELECT: All
  - INSERT: Yes
  - UPDATE: Own created bids
  - DELETE: None
- **Dealers:**
  - SELECT: All (read-only)
  - INSERT/UPDATE/DELETE: None
- **Marktdata:**
  - SELECT/INSERT/UPDATE: All
  - DELETE: None
- **Photos/Documents:**
  - All operations on own dossiers

#### **Eindgebruikers (rol='eindgebruiker'):**
- **Dossiers:**
  - SELECT: Own created only
  - INSERT: Yes
  - UPDATE: Own only
  - DELETE: None
- **Marktdata:**
  - SELECT: All (for taxatie)
  - INSERT: Yes (via taxatietool)
- **No access:** Bids, Dealers, Advertisements

#### **Dealers (via dealers table):**
- **Dossiers:**
  - SELECT: Only if bid exists for this dealer
- **Bids:**
  - SELECT: Own bids only (where dealer_id = auth.uid())
  - INSERT: Yes (via public endpoint)
  - UPDATE: Own pending bids only
  - DELETE: None
- **Photos:**
  - SELECT: Via dossier access

---

## 🎨 FRONTEND TECHNOLOGIE

### **Stack:**
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Maps:** Leaflet + React-Leaflet
- **PDF:** jsPDF + jsPDF-AutoTable + pdf-lib
- **Excel:** XLSX (SheetJS)
- **State:** React Context API (AuthContext, LanguageContext)
- **Forms:** Controlled components

### **Key Libraries:**
```json
{
  "@supabase/supabase-js": "^2.57.4",
  "react": "^18.3.1",
  "react-leaflet": "^4.2.1",
  "leaflet": "^1.9.4",
  "jspdf": "^3.0.3",
  "xlsx": "^0.18.5",
  "lucide-react": "^0.344.0"
}
```

### **Routing:**
- React Router (presumed - not in package.json but used in pages)
- Routes:
  - `/` → Login
  - `/dashboard` → Dashboard
  - `/dossiers` → Dossiers lijst
  - `/dossiers/:id` → Dossier detail
  - `/biedingen` → Biedingen
  - `/dealers` → Dealers
  - `/taxatie` → Taxatietool
  - `/marktdata-invoeren` → Marktdata form
  - `/marktdata-import` → CSV import
  - `/marktdata-database` → Marktdata overzicht
  - `/publicatie` → Publicatie dashboard
  - `/settings` → Instellingen
  - `/dealer-dashboard` → Dealer view
  - `/dealer-dossier/:id` → Dealer dossier view

---

## 🗂️ BELANGRIJKE COMPONENTEN

### **1. GlobalSearch**
- Search bar in navbar
- Zoekt in: dossiernummer, merk, model, serienummer, customer_name
- Real-time results dropdown
- Navigate to dossier

### **2. PhotoGallery**
- Grid view met thumbnails
- Categorieën als tabs
- Drag & drop reordering
- Lightbox voor full-screen
- Toggle visibility per foto
- Delete functie

### **3. PhotoUpload**
- Drag & drop zone
- Multiple file upload
- Progress indicator
- Auto-trigger AI sorting na upload
- Thumbnail preview

### **4. MapOverview**
- Leaflet map met markers
- Cluster support
- Popup met dossier info
- Filter per equipment type
- Click to navigate

### **5. PriceSuggestion**
- Embedded in dossier form
- Real-time calculation
- Shows:
  - Aantal vergelijkbare machines
  - Prijsrange (min/avg/max)
  - Confidence score
  - Chart (optioneel)

### **6. Equipment Details Forms**
- ForkliftDetailsForm
- ReachstackerDetailsForm
- EmptyContainerHandlerDetailsForm
- TerminalTractorDetailsForm
- Conditional rendering based on equipment_type

### **7. BidsSection**
- Embedded in dossier detail
- Table with all bids
- Status badges
- Accept/reject buttons
- Modal for new bid

### **8. PublicationSection**
- Embedded in dossier detail
- Publish buttons per platform
- Active advertisements list
- Sync status
- View counts

---

## 📊 SUPABASE STORAGE BUCKETS

### **1. dossier-photos**
- Public bucket
- Path structure: `{dossier_id}/{photo_id}.jpg`
- Max size: 10MB per file
- Allowed: jpg, jpeg, png, gif, webp
- RLS: Public read, authenticated write

### **2. dossier-attachments**
- Private bucket
- Path structure: `{dossier_id}/{file_name}`
- Max size: 50MB per file
- Allowed: pdf, doc, docx, xls, xlsx
- RLS: Authenticated read (via dossier access)

### **3. dossier-videos**
- Public bucket
- Path structure: `{dossier_id}/{video_id}.mp4`
- Max size: 100MB per file
- Allowed: mp4, mov, avi, webm
- RLS: Public read, authenticated write

---

## 🌍 INTERNATIONALISATIE

### **Ondersteunde Talen:**
- Nederlands (nl) - Default
- Engels (en)
- Duits (de)

### **Implementatie:**
- `LanguageContext` met translations object
- `translations.ts` bevat alle strings
- Gebruikers kunnen taal kiezen in Settings
- PDF export in gekozen taal
- Terms & Conditions per taal:
  - `verkoopvoorwaarden_nl.pdf`
  - `terms_and_conditions_of_sales_uk.pdf`
  - `verkoopvoorwaarden_de.pdf`

### **Vertaalbare Content:**
- UI labels en buttons
- Form placeholders
- Error messages
- PDF export
- Email templates (toekomst)

---

## 📈 BUSINESS LOGIC

### **Dossiernummer Generatie:**
```sql
Format: YYYY-NNN
Voorbeeld: 2026-001, 2026-002, ...

Implementatie:
1. Trigger: generate_dossier_number()
2. Per jaar reset counter
3. Zero-padded (3 cijfers)
```

### **Prijs Suggestie Algoritme:**
```typescript
1. Zoek vergelijkbare machines:
   - Zelfde type
   - Merk match (exact > fuzzy)
   - Bouwjaar ±3 jaar
   - Capaciteit ±20%
   - Uren range

2. Bereken gemiddelden:
   - avg_price
   - min_price
   - max_price

3. Correcties:
   - Uren correctie: -2% per 1000 uur boven gemiddelde
   - Conditie: ±10% based on tire condition, etc.
   - Locatie: +5% for popular locations

4. Final suggestion:
   - Base: avg_price
   - Apply corrections
   - Clamp between min and max
```

### **AI Photo Categorisatie:**
```typescript
Flow:
1. User uploads foto's
2. Edge Function: sort-photos-with-ai
3. OpenAI Vision API analyseert elke foto
4. Prompt:
   "Categorize this image of industrial equipment into one of:
    - exterior: Outside view of the machine
    - interior: Cabin, controls, seats
    - engine: Engine compartment, motor
    - damage: Visible damage or wear
    - documents: Papers, spec plates, manuals
    - other: Anything else"
5. Response: category name
6. Update database: photos.category
7. UI refreshes
```

---

## 🔄 DAGELIJKSE PROCESSEN

### **1. Forklift International Sync**
- **Tijd:** 03:00 UTC
- **Frequentie:** Dagelijks
- **Actie:**
  - Fetch stats van actieve advertenties
  - Update view_count, inquiry_count
  - Check expiration
  - Update status

### **2. Database Backup (OneDrive)**
- **Tijd:** 03:00 lokale tijd (via Windows Task Scheduler)
- **Frequentie:** Maandelijks (1e van de maand)
- **Actie:**
  - Export alle tabellen naar JSON
  - ZIP bestand aanmaken
  - Opslaan in OneDrive
  - Oude backups opruimen (>6 maanden)

### **3. Supabase Automatic Backups**
- **Tijd:** Automatisch
- **Frequentie:** Dagelijks
- **Bewaartermijn:** 7 dagen
- **Type:** Point-in-time recovery

---

## 🚨 ERROR HANDLING & LOGGING

### **Frontend:**
- Try-catch blocks rond Supabase calls
- User-friendly error messages
- Toast notifications (aangenomen - niet in code maar best practice)
- Console.log voor development

### **Edge Functions:**
- Structured error responses:
  ```typescript
  {
    error: true,
    message: "User-friendly message",
    details: "Technical details",
    code: "ERROR_CODE"
  }
  ```
- CORS headers op alle responses
- HTTP status codes

### **Database:**
- Foreign key constraints
- Check constraints (enums, ranges)
- Triggers voor data consistency
- RLS voor security

---

## 📱 RESPONSIVE DESIGN

- **Mobile First:** Tailwind breakpoints
- **Breakpoints:**
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px
- **Features:**
  - Collapsible sidebar op mobile
  - Responsive tables (horizontal scroll)
  - Touch-friendly buttons
  - Mobile-optimized forms

---

## 🔮 TOEKOMSTIGE ONTWIKKELINGEN

### **Prioriteit 1:**
- [ ] Mascus publicatie volledig implementeren
- [ ] Email notificaties systeem
- [ ] Dashboard statistieken uitbreiden
- [ ] Audit trail / activity log

### **Prioriteit 2:**
- [ ] WhatsApp integratie voor dealers
- [ ] QR codes per dossier
- [ ] Barcode scanner voor serienummers
- [ ] Maintenance scheduling

### **Prioriteit 3:**
- [ ] Mobile app (React Native)
- [ ] Offline mode
- [ ] Advanced analytics dashboard
- [ ] Machine learning price predictions

---

## 🔑 BELANGRIJKE BESTANDEN

### **Configuration:**
- `.env` - Supabase credentials
- `vite.config.ts` - Build config
- `tailwind.config.js` - Styling config

### **Core Files:**
- `src/main.tsx` - App entry point
- `src/App.tsx` - Main routing & layout
- `src/lib/supabase.ts` - Supabase client setup
- `src/lib/database.types.ts` - TypeScript types (auto-generated)
- `src/lib/translations.ts` - i18n strings

### **Contexts:**
- `src/contexts/AuthContext.tsx` - Authentication state
- `src/contexts/LanguageContext.tsx` - Language preference

### **Documentation:**
- `README.md` (diverse docs in root)
- `GEBRUIKERSROLLEN_OVERZICHT.md`
- `FORKLIFT_INTERNATIONAL_SETUP.md`
- `MARKTDATA_IMPORT_HANDLEIDING.md`
- `VIDEO_UPLOAD_SETUP.md`
- `DOCUMENT_UPLOAD_SETUP.md`

---

## ⚠️ BEKENDE ISSUES & WORKAROUNDS

### **1. Terberg Duplicates**
- Issue: Terberg brand heeft dubbele entries
- Fix: `fix-terberg-duplicates.js` script
- Status: Resolved via `consolidate-terberg-brand.sql`

### **2. Missing GPS Coordinates**
- Issue: Oude dossiers hebben geen lat/lng
- Fix: `fix-missing-coordinates.js` (geocoding script)
- Workaround: Handmatig invullen via edit form

### **3. Photo Upload Permissions**
- Issue: RLS policies te restrictief
- Fix: Multiple migrations (`fix-photo-upload-permissions.sql`)
- Status: Resolved

### **4. HTTP Request Queue NULL URLs**
- Issue: Edge function logs met null URLs
- Fix: `fix-http-request-queue-null-url.sql`
- Status: Resolved

---

## 🛠️ DEVELOPMENT SETUP

### **Prerequisites:**
- Node.js 18+
- npm 9+
- Supabase account
- Supabase CLI (optional, maar handig)

### **Installation:**
```bash
# Clone repo
git clone [repo-url]
cd project

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env met Supabase credentials

# Run development server
npm run dev

# Build for production
npm run build

# Run tests (indien beschikbaar)
npm run test
```

### **Supabase Local Development:**
```bash
# Start local Supabase
npx supabase start

# Apply migrations
npx supabase db push

# Reset database
npx supabase db reset
```

---

## 📞 SUPPORT & CONTACT

### **Technical Support:**
- Check documentation files in `/docs`
- Review migration files voor database changes
- Check Edge Function code voor API logic

### **Key Contacts:**
- Project Owner: [Naam]
- Lead Developer: [Naam]
- Database Admin: [Naam]

---

## 📄 LICENTIE & COMPLIANCE

### **Data Privacy:**
- GDPR compliant
- Data stored in EU (Supabase EU region)
- User consent voor data processing
- Right to be forgotten (user deletion)

### **Security:**
- SSL/TLS voor alle verbindingen
- Encrypted passwords (Supabase Auth)
- API keys encrypted at rest
- RLS op alle tabellen
- Input sanitization
- SQL injection prevention

---

## 🎓 LEER DE CODEBASE KENNEN

### **Startpunten:**
1. **Authenticatie flow:**
   - `LoginPage.tsx` → `AuthContext.tsx` → Supabase Auth

2. **Dossier workflow:**
   - `DossiersPage.tsx` → `DossierDetailPage.tsx` → Equipment detail forms

3. **Edge Functions:**
   - `supabase/functions/*/index.ts`

4. **Database schema:**
   - `supabase/migrations/*.sql`

5. **RLS Policies:**
   - Zoek naar "CREATE POLICY" in migrations

---

**Einde van documentatie**

**Laatste update:** 31 januari 2026
**Versie:** 1.0.0
**Status:** Productie-ready met toekomstige ontwikkelingen gepland
