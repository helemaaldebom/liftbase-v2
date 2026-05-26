# Forklift International API Integratie - Setup Instructies

## Overzicht

De Forklift International integratie bestaat uit twee Edge Functions:
1. **publish-to-forklift-international**: Handmatige upload van geselecteerde dossiers
2. **daily-forklift-international-sync**: Automatische dagelijkse synchronisatie van alle actieve forklifts

## 1. Credentials Instellen

Je moet de volgende environment variabelen instellen in Supabase:

### Via Supabase Dashboard:
1. Ga naar je Supabase project dashboard
2. Klik op "Settings" → "Edge Functions" → "Secrets"
3. Voeg de volgende secrets toe:

```
FI_USERNAME=jouw_forklift_international_username
FI_PASSWORD=jouw_forklift_international_password
CRON_SECRET=een_willekeurige_geheime_sleutel_voor_cron_jobs
```

## 2. Handmatige Upload (via Frontend)

Om dossiers handmatig te publiceren naar Forklift International vanuit de applicatie:

```javascript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-to-forklift-international`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAuthToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dossierIds: ['uuid1', 'uuid2', 'uuid3'],
      fiUsername: 'jouw_username',
      fiPassword: 'jouw_password',
      testMode: false // Zet op true om alleen XML te genereren zonder upload
    })
  }
);

const result = await response.json();
console.log(result);
```

### Test Mode
Voor het testen kun je `testMode: true` gebruiken. Dit genereert de XML maar upload niet naar FI:

```javascript
{
  dossierIds: ['uuid1'],
  fiUsername: 'test',
  fiPassword: 'test',
  testMode: true
}
```

## 3. Dagelijkse Automatische Sync

Er zijn twee manieren om de dagelijkse sync in te stellen:

### Optie A: Via Supabase Cron (Aanbevolen)

1. Maak een nieuwe SQL functie aan:

```sql
-- Create a function to call the edge function
CREATE OR REPLACE FUNCTION trigger_fi_daily_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cron_secret text;
BEGIN
  -- Get the cron secret from vault or use a default
  cron_secret := current_setting('app.settings.cron_secret', true);

  -- Call the edge function using pg_net
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-forklift-international-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || cron_secret
      ),
      body := '{}'::jsonb
    );
END;
$$;

-- Schedule the function to run daily at 19:00 (7 PM)
SELECT cron.schedule(
  'daily-fi-sync',
  '0 19 * * *',  -- Run at 19:00 every day
  $$SELECT trigger_fi_daily_sync()$$
);
```

### Optie B: Via Externe Cron Service (bijv. cron-job.org)

1. Ga naar [cron-job.org](https://cron-job.org) of een vergelijkbare service
2. Maak een nieuwe cron job aan met:
   - **URL**: `https://wcjegvxnojzirwxogesj.supabase.co/functions/v1/daily-forklift-international-sync`
   - **Method**: POST
   - **Headers**:
     - `Authorization: Bearer [JOUW_CRON_SECRET]`
     - `Content-Type: application/json`
   - **Schedule**: Dagelijks om 19:00 (7 PM)
   - **Timezone**: Europe/Amsterdam

### Optie C: Via GitHub Actions (voor development)

Maak een bestand `.github/workflows/fi-sync.yml`:

```yaml
name: Daily Forklift International Sync

on:
  schedule:
    - cron: '0 19 * * *'  # Dagelijks om 19:00 UTC
  workflow_dispatch:  # Handmatige trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger FI Sync
        run: |
          curl -X POST \\
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \\
            -H "Content-Type: application/json" \\
            https://wcjegvxnojzirwxogesj.supabase.co/functions/v1/daily-forklift-international-sync
```

## 4. Welke Dossiers Worden Gesynchroniseerd?

De dagelijkse sync synchroniseert automatisch alle dossiers die voldoen aan:
- `equipment_type = 'forklift'` (lowercase!)
- `status IN ('active', 'published')`
- `is_marktdata = false`

## 5. Vereiste Velden voor Publicatie

Zorg dat de volgende velden **altijd** ingevuld zijn voordat je publiceert:

### Verplicht in Database:
- `dossiers.brand` (Make)
- `dossiers.model` (Model)
- `dossiers.year` (Year)
- `dossiers.capacity` (Capacity in kg)
- `dossiers.fuel_type` (Power type: Diesel/Electric/LPG/Gas/Hybrid)
- `dossiers.country` (Country code: NL/DE/BE/etc.)
- `dossiers.handelsprijs` (Dealer price)
- `dossiers.description` (Description)

### Aanbevolen:
- `dossiers.hours` (Hours)
- `dossiers.lifting_height` (Lift height)
- `dossiers.location` (City/Location)
- `dossiers.eindklantprijs` (Customer price)
- Minimaal 1 foto in de `photos` tabel

## 6. Foto's

Foto's worden automatisch opgehaald uit Supabase Storage:
- Bucket: `dossier-photos`
- De foto met `display_order = 0` wordt als hoofdfoto gemarkeerd
- Alle foto's worden in volgorde van `display_order` toegevoegd

URL format: `https://wcjegvxnojzirwxogesj.supabase.co/storage/v1/object/public/dossier-photos/{storage_path}`

## 7. Monitoring & Logs

### Edge Function Logs Bekijken:

1. Via Supabase Dashboard:
   - Ga naar "Edge Functions" → "Logs"
   - Selecteer de functie die je wilt monitoren

2. Via CLI:
```bash
supabase functions logs daily-forklift-international-sync
```

### Sync Status Controleren:

Je kunt een test sync uitvoeren via curl:

```bash
curl -X POST \\
  -H "Authorization: Bearer [JOUW_CRON_SECRET]" \\
  -H "Content-Type: application/json" \\
  https://wcjegvxnojzirwxogesj.supabase.co/functions/v1/daily-forklift-international-sync
```

Response bij succes:
```json
{
  "success": true,
  "uploadResult": {
    "status": 200,
    "statusText": "OK",
    "response": "..."
  },
  "machineCount": 5,
  "timestamp": "2025-11-04T19:00:00.000Z"
}
```

## 8. Troubleshooting

### "Unauthorized: Invalid cron secret"
- Controleer of de `CRON_SECRET` environment variable correct is ingesteld
- Controleer of de Authorization header correct is in je cron job

### "Forklift International credentials not configured"
- Controleer of `FI_USERNAME` en `FI_PASSWORD` zijn ingesteld in Edge Function secrets

### "No forklifts to sync"
- Controleer of er dossiers zijn met `equipment_type = 'Forklift'` en `status IN ('active', 'published')`
- Controleer of `is_marktdata = false`

### "Failed to fetch dossiers"
- Controleer de RLS policies op de `dossiers` tabel
- Controleer de Edge Function logs voor meer details

### Upload fails (status != 200)
- Controleer de FI API credentials
- Controleer de gegenereerde XML in de response
- Controleer of alle verplichte velden zijn ingevuld
- Kijk in de `uploadResult.response` voor foutmeldingen van FI

## 9. XML Voorbeeld

De Edge Function genereert XML in het volgende format:

```xml
<?xml version="1.0\" encoding=\"utf-8\"?>
<machines>
  <machine type=\"1\">
    <id>250001</id>
    <changed>2025-11-04 19:00:00</changed>
    <make>Hyster</make>
    <model>H16XM-12</model>
    <year>2015</year>
    <hours>8500</hours>
    <capacity>16000</capacity>
    <loadcenter>600</loadcenter>
    <lift>4500</lift>
    <freelift>1200</freelift>
    <mast>Triplex</mast>
    <power>D</power>
    <country>NL</country>
    <city>Rotterdam</city>
    <dealerprice>45000</dealerprice>
    <customerprice>52000</customerprice>
    <description>Hyster H16XM-12 heavy duty forklift...</description>
    <photo>
      <url>https://wcjegvxnojzirwxogesj.supabase.co/storage/v1/object/public/dossier-photos/250001/photo1.jpg</url>
      <main>yes</main>
    </photo>
  </machine>
</machines>
```

## 10. Field Mapping

Voor een complete lijst van veldkoppelingen, zie: `FORKLIFT_INTERNATIONAL_FIELD_MAPPING.md`

## 11. Volgende Stappen

Na het instellen van de Forklift International integratie kun je:
1. Dezelfde aanpak gebruiken voor **Mascus** integratie
2. Dezelfde aanpak gebruiken voor **Trucks.nl** integratie
3. Dezelfde aanpak gebruiken voor **heavycargolifters.com** integratie

Elk platform heeft zijn eigen API format en vereisten, maar de basis structuur (Edge Functions + dagelijkse sync) blijft hetzelfde.
