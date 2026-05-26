# Customer Duplicate Fixer

Dit script identificeert en repareert dubbele klantnamen in de dossiers database.

## Wat doet het script?

Het script:
1. Haalt alle `customer_name` waarden op uit de `dossiers` table
2. Normaliseert de namen (lowercase, trimmed) om varianten te vinden
3. Identificeert dubbele namen (bijv. "Metrans (Radek Smeja)" vs "metrans (radek smeja)")
4. Kiest de meest gebruikte variant als de "correcte" naam
5. Update alle dossiers om de consistente naam te gebruiken

## Gebruik

### Stap 1: Duplicaten analyseren (zonder wijzigingen)

Om te zien welke duplicaten er zijn zonder de database te wijzigen, pas het script aan:

```javascript
// In analyze-customer-duplicates.js, verander de laatste regel:
// fixDuplicates().catch(console.error);
// naar:
analyzeCustomerDuplicates().catch(console.error);
```

Voer uit:
```bash
node analyze-customer-duplicates.js
```

### Stap 2: Duplicaten repareren

Om daadwerkelijk de database te updaten:

```javascript
// In analyze-customer-duplicates.js, zorg dat de laatste regel is:
fixDuplicates().catch(console.error);
```

Voer uit:
```bash
node analyze-customer-duplicates.js
```

## Voorbeeld output

```
=== DUPLICATES FOUND ===

1. "metrans (radek smeja)" (5 dossiers)
   Variants:
     - "Metrans (Radek Smeja)" (4 dossiers)
     - "metrans (radek smeja)" (1 dossier)

Fixing "metrans (radek smeja)" -> using "Metrans (Radek Smeja)"
  Updated 1 dossiers

✓ Duplicate fixing complete!
```

## Belangrijk

- Het script kiest automatisch de meest voorkomende variant
- Als er een gelijke verdeling is, wordt de eerste gevonden variant gebruikt
- Alle dossiers worden ge-update om de consistente naam te gebruiken
- Maak altijd eerst een backup van de database voordat je het script uitvoert!

## Maintenance Dashboard Update

Na het uitvoeren van dit script, zal het Maintenance Dashboard automatisch:
- Alle unieke klanten uit dossiers tonen in de customer dropdown
- Duplicaten voorkomen door case-insensitive matching
- Automatisch nieuwe klanten toevoegen wanneer ze een dossier krijgen

De klanten worden gecombineerd uit 3 bronnen:
1. **customers table** - Bestaande klanten met volledige gegevens
2. **user_profiles** - Eindgebruikers die toegang hebben tot de app
3. **dossiers.customer_name** - Alle klanten die in dossiers voorkomen

Alle drie de bronnen worden samengevoegd en gededupliceerd in de customer dropdown.
