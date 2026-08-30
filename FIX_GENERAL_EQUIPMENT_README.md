# General Equipment Ltd Duplicaten Oplossen

## Wat is het probleem?

In de Maintenance Dashboard kan "General Equipment Ltd" twee keer voorkomen als:
1. Er twee records zijn in de `customers` table met (bijna) dezelfde naam
2. Er varianten zijn zoals "General Equipment Ltd" en "general equipment ltd"

## Oplossingen

### 1. Frontend Fix (Direct actief)

Het Maintenance Dashboard filtert nu automatisch duplicaten uit de lijst. Als er twee "General Equipment Ltd" records in de database staan, wordt nu alleen de eerste getoond.

**Deze fix werkt direct** zonder verdere actie.

### 2. Database Fix (Om duplicaten permanent samen te voegen)

Om de duplicaten in de database echt samen te voegen, gebruik je één van deze methoden:

#### Methode A: JavaScript Script (Aanbevolen)

```bash
node fix-general-equipment.js
```

Dit script:
- Vindt alle "General Equipment" varianten in de `customers` table
- Houdt de oudste klant en voegt de rest samen
- Update de naam naar "General Equipmet Ltd" (zoals gevraagd)
- Update alle gerelateerde records (maintenance documents, temporary access)
- Verwijdert de duplicate records
- Update ook dossiers met General Equipment varianten

#### Methode B: SQL Script

Als je direct toegang hebt tot de database, voer dan uit:

```bash
psql your_database < fix-general-equipment-duplicates.sql
```

Of kopieer de inhoud van `fix-general-equipment-duplicates.sql` naar de Supabase SQL Editor.

## Verificatie

Na het uitvoeren van het script:

1. Check de customers table:
```sql
SELECT * FROM customers WHERE company_name ILIKE '%General Equipment%';
```

2. Check dossiers:
```sql
SELECT DISTINCT customer_name FROM dossiers WHERE customer_name ILIKE '%General Equipment%';
```

Er zou nu precies één record moeten zijn met de naam: **"General Equipmet Ltd"**

## Preventie

De frontend code is nu aangepast om automatisch duplicaten te filteren bij het tonen van de klantenlijst. Dit voorkomt dat gebruikers duplicaten zien, zelfs als ze in de database bestaan.

Voor het voorkomen van nieuwe duplicaten:
- Gebruik altijd dezelfde schrijfwijze voor klantnamen
- Check of een klant al bestaat voordat je een nieuwe aanmaakt
- Gebruik de bestaande klantenselector in plaats van nieuwe klanten aan te maken

## Scripts Overzicht

- `fix-general-equipment.js` - Voegt General Equipment duplicaten samen (JavaScript)
- `fix-general-equipment-duplicates.sql` - SQL versie van hetzelfde script
- `find-all-customers.js` - Toont alle klanten uit alle bronnen (handig voor debugging)
- `check-general-equipment-dossiers.js` - Check specifiek General Equipment in dossiers
- `analyze-customer-duplicates.js` - Algemeen script voor het vinden van alle duplicaten

## Belangrijk

Let op de spelling: **"General Equipmet Ltd"** (met "Equipmet" zonder 'n')

Dit is de gewenste naam zoals aangegeven door de gebruiker.
