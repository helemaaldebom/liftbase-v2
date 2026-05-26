# Forklift International API - Debug Logging Guide

## Overzicht

De Forklift International koppeling heeft nu uitgebreide debug logging om problemen te kunnen diagnosticeren. Deze logging geeft inzicht in:

- Request parameters
- XML generatie
- API authenticatie
- API responses
- Database updates
- Errors met volledige stack traces

## Edge Functions met Debug Logging

### 1. publish-to-forklift-international
Deze functie wordt gebruikt om individuele dossiers handmatig te publiceren.

**Belangrijke logs:**
- `=== PUBLISH TO FORKLIFT INTERNATIONAL STARTED ===` - Start van de functie
- `User authenticated:` - Welke gebruiker de actie uitvoert
- `Request body received:` - De ontvangen parameters (dossierIds, credentials, testMode)
- `Query result - dossiers:` - Hoeveel dossiers zijn gevonden
- `Publishable dossiers:` - Hoeveel dossiers kunnen worden gepubliceerd
- `Processing dossier` - Voor elk dossier: nummer, merk en model
- `Details fetched:` - Of de detail records zijn gevonden
- `Photos found:` - Aantal gevonden foto's per dossier
- `Full XML output:` - De complete XML die naar FI wordt gestuurd
- `=== FORKLIFT INTERNATIONAL API REQUEST ===` - Details van het API request
- `=== FORKLIFT INTERNATIONAL API RESPONSE ===` - Response van de FI API
- `Upload result - Success:` - Of de upload succesvol was
- `=== PUBLISH TO FORKLIFT INTERNATIONAL COMPLETED ===` - Einde van de functie

### 2. daily-forklift-international-sync
Deze functie wordt gebruikt voor de dagelijkse automatische synchronisatie.

**Belangrijke logs:**
- `=== DAILY SYNC: FI API REQUEST ===` - Details van de sync request
- `=== DAILY SYNC: FI API RESPONSE ===` - Response van de FI API

## Logs Bekijken

### Via Supabase Dashboard

1. Ga naar je Supabase project dashboard
2. Klik op "Edge Functions" in het menu
3. Selecteer de functie die je wilt bekijken:
   - `publish-to-forklift-international`
   - `daily-forklift-international-sync`
4. Klik op de "Logs" tab
5. Logs worden in realtime getoond

### Via Browser Console

Wanneer je de functie aanroept vanuit de frontend (via "Nu publiceren" knop):

1. Open de browser Developer Tools (F12)
2. Ga naar de "Console" tab
3. Klik op "Nu publiceren" voor Forklift International
4. In de console zie je:
   - `Publication result:` - Het volledige response object
   - Error details als er iets misgaat

## Frontend Verbeteringen

De frontend toont nu meer details in de alert messages:

**Bij succes:**
```
Succesvol gepubliceerd naar forklift_international!

Machines: 1
Status: 200
Response: OK
```

**Bij fout:**
```
Publicatie naar forklift_international heeft gefaald.

Status: 400
Fout: [error message from API]
```

**Bij exception:**
```
Fout bij publiceren naar forklift_international:

[error message]

Check de browser console voor meer details.
```

## Veelvoorkomende Problemen en Debugging

### Probleem: Geen dossiers worden gepubliceerd
**Check in logs:**
- `Query result - dossiers:` - Zijn er dossiers gevonden?
- `Publishable dossiers:` - Hoeveel dossiers zijn geschikt voor FI?
- `Equipment types:` - Welke equipment types zijn gevonden?

**Mogelijke oorzaak:**
- Equipment type wordt niet ondersteund door FI
- Dossier IDs zijn niet correct

### Probleem: API geeft error response
**Check in logs:**
- `=== FORKLIFT INTERNATIONAL API RESPONSE ===`
- `Status:` - HTTP status code (200 = OK, 401 = authenticatie fout, 400 = bad request)
- `Response body:` - Error message van FI API

**Mogelijke oorzaken:**
- Onjuiste credentials
- Ongeldige XML structuur
- API rate limiting

### Probleem: XML bevat onjuiste data
**Check in logs:**
- `Full XML output:` - Complete XML wordt gelogd
- `Processing dossier` - Details per dossier
- `Details fetched:` - Of detail records zijn gevonden
- `Photos found:` - Aantal foto's

**Mogelijke oorzaken:**
- Detail records ontbreken in database
- Verplichte velden zijn leeg
- Foto URLs zijn ongeldig

### Probleem: Authenticatie faalt
**Check in logs:**
- `ERROR: User authentication failed:` - Auth error details
- `User authenticated:` - Email van ingelogde gebruiker

**Mogelijke oorzaken:**
- Sessie is verlopen
- Gebruiker heeft geen rechten

## API Credentials Testen

De functie ondersteunt een "test mode" die de XML genereert zonder naar de API te sturen:

**Via API:**
```javascript
{
  "dossierIds": ["uuid-1", "uuid-2"],
  "testMode": true,
  "fiUsername": "test",
  "fiPassword": "test"
}
```

**Response in test mode:**
```json
{
  "success": true,
  "testMode": true,
  "xml": "<?xml version=\"1.0\" encoding=\"utf-8\"?>...",
  "machineCount": 2,
  "dossiers": [
    {
      "dossier_number": "2024-001",
      "equipment_type": "forklift"
    }
  ]
}
```

## Handmatige Test

Om de koppeling handmatig te testen zonder de UI:

1. Open de browser console op een pagina waar je bent ingelogd
2. Voer dit script uit:

```javascript
const testPublish = async () => {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-to-forklift-international`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dossierIds: ['DOSSIER-ID-HIER'],
        testMode: true,
        fiUsername: 'test',
        fiPassword: 'test'
      }),
    }
  );

  const result = await response.json();
  console.log('Test result:', result);
};

testPublish();
```

## Debug Checklist

Wanneer de koppeling niet werkt, controleer:

1. ✅ **Edge Function Logs** - Zijn er errors in de Supabase logs?
2. ✅ **Browser Console** - Zijn er JavaScript errors?
3. ✅ **Credentials** - Zijn de FI username en password correct?
4. ✅ **Dossier Data** - Heeft het dossier alle verplichte velden ingevuld?
5. ✅ **Equipment Type** - Is het equipment type ondersteund door FI?
6. ✅ **Photo URLs** - Zijn de foto URLs toegankelijk?
7. ✅ **API Response** - Wat is de exacte error message van de FI API?
8. ✅ **XML Structuur** - Is de gegenereerde XML correct?

## Support

Als je de logs hebt bekeken en het probleem niet kunt vinden:

1. Kopieer de relevante logs uit de Supabase dashboard
2. Kopieer de browser console output
3. Voeg de gegenereerde XML toe
4. Voeg de FI API response toe
5. Beschrijf wat je verwacht en wat er gebeurt

Met deze informatie kan het probleem snel worden gediagnosticeerd.
