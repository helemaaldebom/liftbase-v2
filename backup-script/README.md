# 🔄 HC-Lifters Automatische Backup naar OneDrive

Dit script maakt automatisch een volledige backup van je HC-Lifters database en slaat deze op in OneDrive.

## 📋 Wat wordt er gebackupt?

- ✅ Alle dossiers
- ✅ Alle bids
- ✅ Alle dealers
- ✅ Alle marktdata
- ✅ Forklift, ECH, Reachstacker en Terminal Tractor details
- ✅ Photo metadata
- ✅ User profiles
- ✅ Advertisements

## 🚀 Installatie (Eenmalig)

### Stap 1: Installeer Node.js
1. Download Node.js van https://nodejs.org (LTS versie)
2. Installeer en herstart je computer

### Stap 2: Script Configureren
1. Open `backup-to-onedrive.js` in Notepad
2. Zoek de `CONFIG` sectie bovenaan:
   ```javascript
   const CONFIG = {
     onedriveBackupPath: 'C:\\Users\\GEBRUIKERSNAAM\\OneDrive\\HC-Lifters-Backups',
     keepBackups: 6,
     ...
   };
   ```
3. Pas `onedriveBackupPath` aan naar JOUW OneDrive pad:
   - Voorbeeld: `'C:\\Users\\JanJansen\\OneDrive\\HC-Lifters-Backups'`
   - Let op: gebruik dubbele backslashes `\\`

### Stap 3: Dependencies Installeren
1. Open Command Prompt (cmd)
2. Navigeer naar de backup-script map:
   ```cmd
   cd C:\pad\naar\project\backup-script
   ```
3. Installeer dependencies:
   ```cmd
   npm install
   ```

### Stap 4: Test de Backup
```cmd
npm run backup
```

Als het goed is zie je:
```
🔧 HC-Lifters Database Backup
📅 Datum: 30-1-2026 10:30:15
══════════════════════════════════════════════════
📥 Data ophalen van Supabase...
   ✓ 150 dossiers
   ✓ 230 bids
   ...
✅ Backup succesvol!
```

## ⚙️ Automatisch Maandelijks Draaien (Windows Task Scheduler)

### Stap 1: Open Task Scheduler
1. Druk op `Windows toets + R`
2. Type: `taskschd.msc`
3. Druk op Enter

### Stap 2: Maak Nieuwe Taak
1. Klik rechts op **"Taak maken..."** (niet "Standaardtaak")
2. Tab **Algemeen**:
   - Naam: `HC-Lifters Maandelijkse Backup`
   - Beschrijving: `Automatische database backup naar OneDrive`
   - Selecteer: ☑ **"Uitvoeren ongeacht of gebruiker is aangemeld"**
   - Selecteer: ☑ **"Uitvoeren met hoogste bevoegdheden"**

### Stap 3: Trigger Instellen
1. Tab **Triggers** → klik **Nieuw**
2. Instellingen:
   - Begin de taak: **Op schema**
   - Instellingen: ⚪ **Maandelijks**
   - Maanden: ☑ **Alle maanden**
   - Dagen: **1** (eerste dag van de maand)
   - Tijd: **03:00:00** (3 uur 's nachts)
   - ☑ **Ingeschakeld**
3. Klik **OK**

### Stap 4: Actie Instellen
1. Tab **Acties** → klik **Nieuw**
2. Instellingen:
   - Actie: **Programma starten**
   - Programma/script: `C:\Program Files\nodejs\node.exe`
   - Argumenten toevoegen: `backup-to-onedrive.js`
   - Starten in: `C:\pad\naar\project\backup-script`
3. Klik **OK**

### Stap 5: Voorwaarden (Optioneel)
1. Tab **Voorwaarden**:
   - ☐ **Taak alleen starten als computer op netstroom werkt** (uitvinken)
2. Tab **Instellingen**:
   - ☑ **Toestaan dat taak op verzoek wordt uitgevoerd**
   - ☑ **Taak zo snel mogelijk uitvoeren na gemist schema**

### Stap 6: Test de Task
1. Zoek je taak in de lijst
2. Rechtsklik → **Uitvoeren**
3. Check je OneDrive map voor de nieuwe backup

## 📂 Backup Bestanden

Elke backup heet:
```
hclifters-backup-2026-01-30T10-30-15.zip
```

In de ZIP vind je:
```
dossiers.json
bids.json
dealers.json
marktdata.json
forklift_details.json
empty_container_handler_details.json
reachstacker_details.json
terminal_tractor_details.json
photos.json
user_profiles.json
advertisements.json
backup-info.json (metadata)
```

## 🧹 Automatisch Opruimen

Het script bewaart standaard de laatste **6 backups** (6 maanden).
Oudere backups worden automatisch verwijderd.

Wijzig dit in `CONFIG.keepBackups` als je meer of minder wilt bewaren.

## 🔧 Handmatig Backup Maken

Als je tussentijds een backup wilt:
```cmd
cd C:\pad\naar\project\backup-script
npm run backup
```

## ❓ Problemen Oplossen

### "OneDrive pad bestaat niet"
- Check of het pad correct is gespeld
- Zorg dat de map bestaat (maak hem aan als dat niet zo is)
- Gebruik dubbele backslashes: `C:\\Users\\...`

### "Cannot find module '@supabase/supabase-js'"
- Voer opnieuw uit: `npm install`

### Task Scheduler draait niet
- Check of de pad naar `node.exe` correct is
- Check of "Starten in" pad correct is
- Bekijk Task History voor foutmeldingen

## 📊 Supabase Automatische Backups

**Goed nieuws!** Supabase maakt ook automatisch backups:

### Pro Plan (standaard):
- ✅ **Dagelijkse backups** (automatisch)
- ✅ Bewaard voor **7 dagen**
- ✅ Point-in-time recovery (laatste 7 dagen)

### Hoe te vinden:
1. Ga naar https://supabase.com/dashboard
2. Selecteer je project
3. Ga naar **Settings** → **Database** → **Backups**
4. Hier zie je alle automatische backups

### Restore een backup:
1. Klik op een backup
2. Klik **"Restore"**
3. Bevestig

**💡 Tip:** Gebruik Supabase backups voor dagelijkse veiligheid en dit OneDrive script voor langetermijn archief!

## 🎯 Aanbevolen Setup

- **Supabase:** Dagelijkse backups (automatisch) → 7 dagen bewaren
- **Dit script:** Maandelijkse backups → 6 maanden bewaren in OneDrive
- **Extra:** Jaarlijks een backup naar externe harde schijf

## 📞 Support

Bij vragen of problemen, check de Task Scheduler logs:
1. Open Task Scheduler
2. Selecteer je taak
3. Tab **Geschiedenis** (onderaan)
