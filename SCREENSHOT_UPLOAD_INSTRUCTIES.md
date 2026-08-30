# Screenshot Upload Functionaliteit

## Overzicht
De screenshot upload functionaliteit maakt het mogelijk om automatisch marktdata in te voeren door een screenshot te uploaden van een advertentie (bijv. van Mascus, Trucks.nl, etc.). De AI leest de gegevens uit de screenshot en vult automatisch het formulier in.

## Setup

### OpenAI API Key
Om deze functionaliteit te gebruiken heb je een OpenAI API key nodig:

1. Ga naar https://platform.openai.com/api-keys
2. Maak een nieuwe API key aan
3. Kopieer de key
4. Voeg deze toe aan je `.env` bestand:
   ```
   VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
   ```
5. Herstart de development server

## Gebruik

### Stap 1: Maak een Screenshot
1. Open een advertentie in je browser (Mascus, Trucks.nl, Forklift International, etc.)
2. Maak een screenshot van de advertentie (meestal met Print Screen of CMD+Shift+4 op Mac)
3. Zorg ervoor dat de belangrijkste informatie zichtbaar is:
   - Merk en model
   - Bouwjaar
   - Prijs
   - Specificaties (capaciteit, hefhoogte, uren, etc.)

### Stap 2: Upload Screenshot
1. Ga naar "Marktdata Invoeren" in de applicatie
2. Selecteer het juiste type equipment (Forklift, Reachstacker, etc.)
3. Klik op de "Screenshot Kiezen" knop in het blauwe upload paneel
4. Selecteer je screenshot bestand
5. Wacht terwijl de AI de gegevens analyseert (duurt 5-10 seconden)

### Stap 3: Controleer en Bewerk
1. De gegevens worden automatisch ingevuld in het formulier
2. Je ziet een groene melding: "Screenshot data succesvol ingevuld!"
3. **Belangrijk**: Controleer alle ingevulde velden
4. Pas waar nodig gegevens aan of vul ontbrekende velden in
5. Klik op "Opslaan" om de marktdata toe te voegen

## Ondersteunde Velden per Equipment Type

### Heavy Duty Forklift
- Merk, Type, Bouwjaar
- Serienummer
- Brandstof/Aandrijving
- Capaciteit, Lastzwaartepunt
- Hefhoogte, Vrije hef
- Urenstand
- Masttype
- Land, Locatie
- Handelsprijs, Eindklantprijs
- Bron (website naam)
- Notities

### Empty Container Handler
- Merk, Type, Bouwjaar
- Serienummer
- Brandstof/Aandrijving
- Capaciteit, Hefhoogte
- Urenstand
- Land, Locatie
- Handelsprijs, Eindklantprijs
- Bron, Notities

### Reachstacker
- Merk, Type, Bouwjaar
- Serienummer
- Brandstof (meestal Diesel)
- Capaciteit, Hefhoogte
- Urenstand
- Land, Locatie
- Handelsprijs, Eindklantprijs
- Bron, Notities

### Terminal Tractor
- Merk, Type, Bouwjaar
- Serienummer
- Brandstof/Aandrijving
- Urenstand
- Land, Locatie
- Handelsprijs, Eindklantprijs
- Bron, Notities

## Tips voor Beste Resultaten

1. **Duidelijke Screenshots**: Zorg voor hoge resolutie en goede contrast
2. **Volledig Zichtbaar**: Zorg dat alle relevante informatie in beeld is
3. **Nederlands of Engels**: De AI werkt het beste met Nederlandse of Engelse advertenties
4. **Meerdere Screenshots**: Als niet alle info op één screenshot past, maak dan meerdere screenshots en upload ze één voor één
5. **Altijd Controleren**: De AI is accuraat maar niet perfect - controleer altijd de ingevulde gegevens

## Troubleshooting

### "Kon geen gestructureerde data vinden"
- Screenshot is mogelijk onduidelijk
- Probeer een screenshot met beter contrast
- Zorg dat de tekst leesbaar is

### "Er is een fout opgetreden"
- Controleer of je OpenAI API key correct is ingesteld
- Controleer of je internetverbinding werkt
- Probeer het opnieuw

### Velden worden niet ingevuld
- Niet alle informatie was zichtbaar in de screenshot
- Vul handmatig de ontbrekende velden in
- De AI vult alleen velden in die het met zekerheid kan herkennen

## Kosten
- Gebruikt OpenAI's GPT-4 Vision API
- Kosten zijn ca. $0.01-0.03 per screenshot analyse
- Zorg voor een credit balance op je OpenAI account

## Privacy & Security
- Screenshots worden NIET opgeslagen op onze servers
- Screenshots worden alleen naar OpenAI gestuurd voor analyse
- OpenAI's data privacy policy is van toepassing
- Verwijder gevoelige informatie uit screenshots indien nodig
