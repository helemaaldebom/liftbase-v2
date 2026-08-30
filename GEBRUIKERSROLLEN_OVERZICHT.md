# LiftBase Gebruikersrollen Overzicht

## Overzicht van Gebruikersrollen

LiftBase kent **4 hoofdrollen** met elk specifieke permissies en toegangsrechten:

---

## 1. Manager (Beheerder)

### Algemeen
De manager heeft **volledige toegang** tot het systeem en alle functionaliteiten.

### Permissies

#### Dossiers
- ✅ Alle dossiers bekijken (van alle gebruikers)
- ✅ Alle dossiers bewerken en verwijderen
- ✅ Nieuwe dossiers aanmaken
- ✅ Status wijzigen (Stock, Open, Bieden actief, Verkocht, Gearchiveerd)
- ✅ Prijzen bewerken (Inkoopprijs, Handelsprijs, Eindklantprijs, Verkoopprijs)
- ✅ Foto's uploaden, verwijderen en herordenen
- ✅ Equipment details toevoegen/bewerken (Forklift, ECH, Reachstacker, Terminal Tractor)
- ✅ Screenshots uploaden voor data-extractie
- ✅ PDF's genereren (intern en extern)
- ✅ Bijlagen uploaden en verwijderen

#### Marktdata
- ✅ Marktdata database volledig bekijken
- ✅ Marktdata invoeren en bewerken
- ✅ Marktdata verwijderen
- ✅ Marktdata importeren via CSV
- ✅ Marktdata exporteren naar Excel
- ✅ Eindgebruiker-marktdata bekijken (voor marktanalyse)

#### Dealers
- ✅ Dealers aanmaken, bewerken en verwijderen
- ✅ Dealer accounts aanmaken
- ✅ Dealer uitnodigingen versturen
- ✅ Alle biedingen bekijken en beheren

#### Publicatie
- ✅ Publicatie Dashboard toegang
- ✅ Advertenties publiceren naar platforms (Forklift International, Mascus, etc.)
- ✅ Advertenties beheren en offline halen
- ✅ Publicatiestatus monitoren

#### Gebruikersbeheer
- ✅ Gebruikers aanmaken, bewerken en verwijderen
- ✅ Rollen toewijzen
- ✅ Taxatietool toegang beheren voor eindgebruikers
- ✅ Alle gebruikersprofielen bekijken

#### Biedingen
- ✅ Alle biedingen bekijken
- ✅ Biedingen accepteren/weigeren
- ✅ Handmatig biedingen toevoegen

---

## 2. Verkoper

### Algemeen
De verkoper heeft **operationele toegang** voor dagelijks werkzaamheden met dossiers en biedingen.

### Permissies

#### Dossiers
- ✅ Eigen dossiers bekijken
- ✅ Alle dossiers bekijken (read-only voor anderen)
- ✅ Nieuwe dossiers aanmaken
- ✅ Eigen dossiers bewerken
- ✅ Status wijzigen voor eigen dossiers
- ✅ Prijzen bewerken voor eigen dossiers
- ✅ Foto's uploaden en verwijderen
- ✅ Equipment details toevoegen/bewerken
- ✅ Screenshots uploaden voor data-extractie
- ✅ PDF's genereren (intern en extern)
- ✅ Bijlagen uploaden
- ❌ Dossiers verwijderen (alleen manager)

#### Marktdata
- ✅ Marktdata database bekijken
- ✅ Marktdata invoeren
- ✅ Marktdata bewerken
- ✅ Marktdata verwijderen
- ✅ Marktdata importeren via CSV
- ✅ Marktdata exporteren naar Excel

#### Dealers
- ✅ Dealers bekijken
- ❌ Dealers aanmaken/bewerken (alleen manager)

#### Publicatie
- ❌ Geen toegang tot Publicatie Dashboard (alleen manager)

#### Biedingen
- ✅ Biedingen bekijken voor eigen dossiers
- ✅ Biedingen accepteren/weigeren voor eigen dossiers
- ✅ Handmatig biedingen toevoegen

---

## 3. Eindgebruiker

### Algemeen
De eindgebruiker is een **externe klant** die zijn eigen equipment laat taxeren. Hun dossiers worden automatisch gemarkeerd als marktdata.

### Permissies

#### Dossiers
- ✅ Eigen dossiers bekijken
- ✅ Nieuwe dossiers aanmaken (voor taxatie)
- ✅ Eigen dossiers bewerken
- ✅ Status wijzigen voor eigen dossiers
- ✅ Foto's uploaden en verwijderen voor eigen dossiers
- ✅ Open/actieve dossiers van anderen bekijken (beperkt)
- ❌ Equipment details bewerken (beperkt)
- ❌ Publiceren naar externe platforms
- ❌ Prijzen bewerken (beperkt)
- ❌ Dossiers verwijderen

#### Marktdata
- ❌ Geen toegang tot marktdata database
- ❌ Kan niet zien dat eigen dossiers als marktdata worden gebruikt

#### Taxatietool Toegang (Optioneel)
- ⚙️ **heeft_taxatietool_access** vlag (standaard uitgeschakeld)
- ✅ Als ingeschakeld: Toegang tot taxatietool functionaliteit
- ⚙️ Alleen manager kan deze toegang in-/uitschakelen

#### Biedingen
- ✅ Biedingen bekijken voor eigen dossiers
- ✅ Biedingen accepteren/weigeren (beperkt)
- ❌ Handmatig biedingen toevoegen

#### Speciale Kenmerken
- 🔄 **Automatische Marktdata**: Alle dossiers van eindgebruikers worden automatisch gemarkeerd als marktdata
- 📊 **Marktanalyse**: Hun data wordt gebruikt voor markttrends (transparant voor gebruiker)
- 🔐 **Privacy**: Kunnen niet zien dat hun data als marktdata wordt gebruikt

---

## 4. Dealer (Handelaar)

### Algemeen
Dealers zijn **externe partijen** die uitgenodigd worden om te bieden op equipment.

### Permissies

#### Dossiers
- ✅ Uitgenodigde dossiers bekijken (via unieke link)
- ✅ Details van uitgenodigde dossiers bekijken
- ✅ Foto's van uitgenodigde dossiers bekijken
- ❌ Geen toegang tot andere dossiers
- ❌ Dossiers aanmaken of bewerken

#### Biedingen
- ✅ Biedingen plaatsen op uitgenodigde dossiers
- ✅ Eigen biedingen bekijken
- ✅ Eigen biedingen bijwerken (binnen deadline)
- ✅ Interesse tonen zonder bedrag

#### Speciale Kenmerken
- 🔗 **Token-based toegang**: Toegang via unieke uitnodigingslinks
- ⏰ **Tijdelijke toegang**: Uitnodigingen verlopen na 72 uur
- 📧 **Email notificaties**: Ontvangen updates over hun biedingen
- 🔒 **Beperkte zichtbaarheid**: Zien alleen wat met hen gedeeld wordt

---

## Toegangsmatrix

| Functie | Manager | Verkoper | Eindgebruiker | Dealer |
|---------|---------|----------|---------------|--------|
| **Dossiers** |
| Eigen dossiers bekijken | ✅ | ✅ | ✅ | ❌ |
| Alle dossiers bekijken | ✅ | ✅ | ⚠️ Beperkt | ❌ |
| Dossiers aanmaken | ✅ | ✅ | ✅ | ❌ |
| Dossiers bewerken | ✅ Alle | ✅ Eigen | ✅ Eigen | ❌ |
| Dossiers verwijderen | ✅ | ❌ | ❌ | ❌ |
| Equipment details | ✅ | ✅ | ⚠️ Beperkt | ❌ |
| **Marktdata** |
| Database bekijken | ✅ | ✅ | ❌ | ❌ |
| Marktdata invoeren | ✅ | ✅ | ❌ | ❌ |
| Marktdata bewerken | ✅ | ✅ | ❌ | ❌ |
| Marktdata verwijderen | ✅ | ✅ | ❌ | ❌ |
| Import/Export | ✅ | ✅ | ❌ | ❌ |
| **Dealers** |
| Dealers bekijken | ✅ | ✅ | ❌ | ❌ |
| Dealers beheren | ✅ | ❌ | ❌ | ❌ |
| Accounts aanmaken | ✅ | ❌ | ❌ | ❌ |
| **Biedingen** |
| Biedingen bekijken | ✅ Alle | ✅ Eigen | ✅ Eigen | ✅ Eigen |
| Biedingen plaatsen | ✅ | ✅ | ⚠️ Beperkt | ✅ |
| Biedingen accepteren | ✅ | ✅ | ⚠️ Beperkt | ❌ |
| **Publicatie** |
| Publicatie Dashboard | ✅ | ❌ | ❌ | ❌ |
| Advertenties publiceren | ✅ | ❌ | ❌ | ❌ |
| **Beheer** |
| Gebruikersbeheer | ✅ | ❌ | ❌ | ❌ |
| Taxatietool toegang | ✅ | ❌ | ⚙️ Optioneel | ❌ |
| Instellingen | ✅ | ⚠️ Eigen | ⚠️ Eigen | ❌ |

**Legenda:**
- ✅ = Volledige toegang
- ⚠️ = Beperkte toegang
- ⚙️ = Configureerbaar
- ❌ = Geen toegang

---

## Navigatie & Menu's per Rol

### Manager
```
📊 Dashboard
📁 Dossiers (alle)
👥 Dealers
💰 Biedingen
📈 Marktdata Database
✍️ Marktdata Invoeren
📥 Marktdata Import
📢 Publicatie Dashboard
⚙️ Instellingen (inclusief gebruikersbeheer)
🔍 Globale zoekfunctie
```

### Verkoper
```
📊 Dashboard
📁 Dossiers (alle, edit alleen eigen)
👥 Dealers (alleen bekijken)
💰 Biedingen (voor eigen dossiers)
📈 Marktdata Database
✍️ Marktdata Invoeren
📥 Marktdata Import
⚙️ Instellingen (eigen profiel)
🔍 Globale zoekfunctie
```

### Eindgebruiker
```
📊 Dashboard (Taxatietool indien toegang)
📁 Mijn Dossiers
💰 Mijn Biedingen
⚙️ Instellingen (eigen profiel)
```

### Dealer
```
📧 Uitgenodigde Dossiers (via email links)
💰 Mijn Biedingen
```

---

## Data Privacy & Security

### Eindgebruiker Marktdata
- **Automatisch gemarkeerd**: Alle dossiers van eindgebruikers worden automatisch als marktdata gemarkeerd
- **Transparant proces**: Eindgebruiker ziet dit niet, maar data wordt wel gebruikt voor marktanalyse
- **Alleen manager toegang**: Alleen managers kunnen zien welke dossiers van eindgebruikers zijn
- **Privacy bescherming**: Persoonlijke gegevens worden gescheiden van marktdata

### RLS (Row Level Security)
Alle tabellen hebben strikte RLS policies:
- Gebruikers kunnen alleen hun eigen data zien (tenzij manager)
- Dealers hebben alleen toegang tot uitgenodigde dossiers
- Eindgebruikers kunnen geen marktdata database bekijken
- Alle wijzigingen worden gelogd

---

## Belangrijke Notities

1. **Taxatietool Toegang voor Eindgebruiker**
   - Is standaard UITGESCHAKELD
   - Moet door manager expliciet ingeschakeld worden
   - Geeft toegang tot prijssuggesties en waardebepalingen

2. **Dealer Accounts**
   - Worden aangemaakt door managers
   - Hebben beperkte login mogelijkheden
   - Primaire interactie via email uitnodigingen

3. **Status Overgangen**
   - Manager en Verkoper kunnen alle statussen wijzigen
   - Eindgebruiker kan beperkt statussen wijzigen
   - Bij status "Verkocht" worden advertenties automatisch offline gehaald

4. **Publicatie Rechten**
   - Alleen Manager kan advertenties publiceren
   - Dit is om consistentie en kwaliteit te waarborgen
   - Verkoper kan wel voorbereiden maar niet publiceren

5. **Marktdata van Eindgebruikers**
   - Wordt gebruikt voor AI-gedreven prijssuggesties
   - Helpt managers betere taxaties te maken
   - Verbetert marktinzicht en trends analyse
