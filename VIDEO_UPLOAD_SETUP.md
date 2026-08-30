# Video Upload Functionaliteit

## Wat is toegevoegd

Een complete video upload en beheer sectie voor dossiers, vergelijkbaar met de foto upload functionaliteit.

### Nieuwe componenten:
1. **VideoUpload.tsx** - Component voor het uploaden van video's
2. **VideoGallery.tsx** - Component voor het tonen en beheren van video's

### Functionaliteit:
- Upload meerdere video's tegelijk via drag & drop of bestandsselectie
- Ondersteunde formaten: MP4, MOV, AVI, WebM, MPEG
- Maximale bestandsgrootte: 500MB per video
- Video preview met native HTML5 video player
- Download functie voor video's
- Verwijder functie (alleen voor verkoper en manager rollen)
- Automatische sorteer volgorde

## Database Setup

De video functionaliteit vereist een nieuwe database tabel en storage bucket.

### Optie 1: Automatische setup (aanbevolen)
De database setup zou automatisch moeten gebeuren via Supabase migraties.

### Optie 2: Handmatige setup
Als de automatische setup niet werkt, voer dan het volgende uit:

1. Ga naar je Supabase Dashboard
2. Open de SQL Editor
3. Kopieer en voer de inhoud van `setup-videos-table.sql` uit

Dit script maakt:
- De `videos` tabel met alle benodigde kolommen
- RLS (Row Level Security) policies voor toegangscontrole
- De `dossier-videos` storage bucket
- Storage policies voor het uploaden en ophalen van video's
- Database indexes voor betere performance

## Gebruik

### Voor gebruikers:
1. Open een dossier
2. Scroll naar de "Video's" sectie (boven de foto's)
3. Verkoper en manager rollen kunnen video's uploaden door:
   - Te klikken op het upload gebied en bestanden te selecteren
   - Video bestanden naar het upload gebied te slepen
4. Geüploade video's worden direct afgespeeld in de gallery
5. Video's kunnen worden gedownload of verwijderd (door verkoper/manager)

### Technische details:
- Video's worden opgeslagen in de `dossier-videos` Supabase storage bucket
- Metadata wordt opgeslagen in de `videos` database tabel
- RLS zorgt ervoor dat alleen geautoriseerde gebruikers video's kunnen uploaden/verwijderen
- Video's worden automatisch verwijderd wanneer een dossier wordt verwijderd (CASCADE)

## Beveiliging

De video upload functionaliteit is beveiligd met:
- RLS policies op database niveau
- Storage policies voor bucket toegang
- Validatie op bestandstype en grootte
- Alleen verkoper en manager rollen kunnen video's uploaden/verwijderen
- Alle geauthenticeerde gebruikers kunnen video's bekijken

## Positionering

De video sectie is geplaatst **boven** de foto sectie in de dossier detail pagina, zoals gevraagd.
