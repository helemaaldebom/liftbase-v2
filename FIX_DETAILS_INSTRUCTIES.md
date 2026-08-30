# Fix voor lege detail formulieren

## Probleem
Wanneer je in het database overzicht een record opent, zijn de detail velden leeg ondanks dat merk en type wel in het overzicht staan. Dit komt omdat de detail records (reachstacker_details, empty_container_handler_details, terminal_tractor_details) niet automatisch worden aangemaakt en gesynchroniseerd met het hoofddossier.

## Oplossing
Voer de volgende SQL bestanden uit in de Supabase SQL Editor:

### Stap 1: Open Supabase SQL Editor
1. Ga naar je Supabase project dashboard
2. Klik in het linkermenu op "SQL Editor"
3. Klik op "New query"

### Stap 2: Voer de SQL scripts uit

#### Voor Reachstackers
1. Open het bestand `create-reachstacker-triggers.sql`
2. Kopieer de inhoud
3. Plak in de SQL editor
4. Klik op "Run" (of druk op Ctrl/Cmd + Enter)

#### Voor Empty Container Handlers
1. Open het bestand `create-ech-triggers.sql`
2. Kopieer de inhoud
3. Plak in de SQL editor
4. Klik op "Run"

#### Voor Terminal Tractors
1. Open het bestand `create-terminal-tractor-triggers.sql`
2. Kopieer de inhoud
3. Plak in de SQL editor
4. Klik op "Run"

## Wat doen deze scripts?

### 1. Auto-create triggers
- Maken automatisch een detail record aan wanneer een nieuw dossier wordt aangemaakt
- Kopiëren merk, type en bouwjaar van het dossier naar de details

### 2. Sync triggers
- Houden de details automatisch gesynchroniseerd met het hoofddossier
- Wanneer je merk, type of bouwjaar wijzigt in het hoofddossier, wordt dit automatisch bijgewerkt in de details

### 3. Backfill
- Maken detail records aan voor bestaande dossiers die deze nog niet hebben
- Los dus meteen het huidige probleem op

## Na het uitvoeren
Na het uitvoeren van deze scripts:
- Bestaande dossiers hebben nu wel detail records met de juiste basisgegevens
- Nieuwe dossiers krijgen automatisch detail records
- Wijzigingen in het hoofddossier worden automatisch gesynchroniseerd naar de details

## Verificatie
Test of het werkt:
1. Ga naar het marktdata database overzicht
2. Klik op een bestaand reachstacker dossier
3. Klik op "Bewerk Reachstacker Details"
4. De velden voor Brand, Model en Year should nu gevuld zijn
