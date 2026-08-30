# AI Foto Sortering - Instructies

## Overzicht

De AI foto sortering functionaliteit gebruikt OpenAI's GPT-4 Vision model om automatisch foto's van heftrucks en ander zwaar materieel in een professionele volgorde te sorteren.

## Hoe het werkt

1. **AI Analyse**: De AI bekijkt alle foto's van een dossier en identificeert wat er op elke foto staat
2. **Professionele Sortering**: De foto's worden gesorteerd volgens een professionele volgorde:
   - Vooraanzicht (volledig voertuig)
   - Diagonale hoeken (voor-links, voor-rechts)
   - Zijaanzichten (links, rechts)
   - Achteraanzicht
   - Cabine interieur
   - Controlepaneel/dashboard
   - Mast/hefmechanisme
   - Vorken/aanbouwdelen
   - Motorcompartiment
   - Banden/wielen
   - Detail close-ups (schade, slijtage, serienummers, etc.)

## Gebruik

1. Ga naar een dossier met meerdere foto's
2. Klik op de **"AI Sorteren"** knop (paarse knop met sparkles icoon)
3. Bevestig dat je de huidige volgorde wilt overschrijven
4. Wacht terwijl de AI de foto's analyseert en sorteert (dit kan 10-30 seconden duren)
5. De foto's worden automatisch herladen in de nieuwe volgorde

## Edge Function Deployment

De edge function is al gemaakt maar moet nog gedeployed worden naar Supabase.

### Benodigde Environment Variables

De volgende environment variables zijn al beschikbaar in Supabase:
- `SUPABASE_URL` (automatisch)
- `SUPABASE_SERVICE_ROLE_KEY` (automatisch)
- `VITE_OPENAI_API_KEY` (al geconfigureerd in .env)

### Deployment Commando

Wanneer je klaar bent om te deployen, gebruik dit commando:

```bash
supabase functions deploy sort-photos-with-ai
```

## Technische Details

- **Model**: GPT-4o (Vision model)
- **Token Limit**: 1000 tokens
- **Temperature**: 0.3 (voor consistente resultaten)
- **Timeout**: ~30 seconden (afhankelijk van aantal foto's)
- **Kosten**: ~$0.01-0.05 per sortering (afhankelijk van aantal foto's)

## Beperkingen

- Minimaal 2 foto's nodig om te sorteren
- Maximum ~20-30 foto's per keer (vanwege API token limits)
- Vereist goede belichting en herkenbare foto's
- Kan niet werken met zeer onduidelijke of beschadigde foto's

## Foutafhandeling

Als de AI sortering mislukt:
1. Controleer of alle foto's correct zijn geüpload
2. Controleer of de OpenAI API key geldig is
3. Probeer het opnieuw of sorteer handmatig met drag & drop
4. Check de browser console voor gedetailleerde foutmeldingen

## Privacy & Veiligheid

- Foto's worden alleen geanalyseerd door OpenAI's API
- Geen foto's worden permanent opgeslagen bij OpenAI
- Alle communicatie gebeurt via HTTPS
- RLS policies zorgen ervoor dat alleen geautoriseerde gebruikers foto's kunnen sorteren
