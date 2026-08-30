# Marktdata Import Handleiding

Deze handleiding beschrijft hoe je marktdata kunt voorbereiden voor import in het systeem.

## Excel Template

De Excel template (`marktdata_import_template.csv`) bevat alle kolommen die nodig zijn voor het importeren van marktdata. Je kunt dit CSV bestand openen in Excel en je eigen data invoeren.

## Kolom Definities

### Verplichte Velden

| Kolom | Beschrijving | Voorbeeld |
|-------|--------------|-----------|
| `equipment_type` | Type equipment (verplicht) | `heavy_duty_forklift`, `empty_container_handler`, `reachstacker`, `terminal_tractor` |
| `merk` | Merk van de machine (verplicht) | `Toyota`, `Kalmar`, `Linde` |
| `type` | Type/model aanduiding (verplicht) | `8FD25`, `DRG450`, `TT612D` |
| `bouwjaar` | Bouwjaar (verplicht) | `2020`, `2019` |

### Prijsinformatie

| Kolom | Beschrijving | Voorbeeld |
|-------|--------------|-----------|
| `inkoopprijs` | Inkoopprijs in EUR | `40000.00` |
| `handelsprijs` | Dealer/handelsprijs in EUR | `45000.00` |
| `eindklantprijs` | Eindklantprijs in EUR | `52000.00` |
| `verkoopdatum` | Datum van verkoop | `2024-01-15` (YYYY-MM-DD) |
| `land` | Land waar verkocht | `Nederland`, `Duitsland` |
| `locatie` | Stad/locatie | `Rotterdam`, `Hamburg` |

### Bron Informatie

| Kolom | Beschrijving | Voorbeeld |
|-------|--------------|-----------|
| `marktdata_bron` | Bron van de data | `Trucksnl`, `Marktplaats`, `Direct dealer` |
| `marktdata_bron_url` | URL naar advertentie | `https://trucksnl.com/example` |
| `marktdata_notities` | Extra notities over de bron | `Goed onderhouden machine` |

### Basis Specificaties

| Kolom | Beschrijving | Van toepassing op | Voorbeeld |
|-------|--------------|-------------------|-----------|
| `serienummer` | Serienummer van de machine | Alle types | `12345ABC` |
| `brandstof` | Brandstof/aandrijving type | Alle types | `Diesel`, `Electric` |
| `uren` | Uren op de teller | Alle types | `5000`, `8000` |

### Heavy Duty Forklift Specifiek

| Kolom | Beschrijving | Voorbeeld |
|-------|--------------|-----------|
| `capaciteit` | Capaciteit in kg | `2500`, `5000` |
| `lastzwaartepunt` | Lastzwaartepunt in mm | `500`, `600` |
| `hefhoogte` | Hefhoogte in mm | `4500`, `6000` |
| `vrije_hef` | Vrije hef in mm | `1500` |
| `masttype` | Type mast | `Duplex`, `Triplex` |
| `aanbouwdeel` | Aanbouwdeel type | `Sideshifter`, `Paper clamp`, `No attachment` |
| `fork_length_mm` | Vorklengte in mm | `1200` |
| `fork_width_mm` | Vorkbreedte in mm | `150` |
| `fork_height_mm` | Vorkhoogte in mm | `60` |
| `hydraulic_lines` | Aantal hydraulische lijnen | `4`, `5` |
| `no_forks` | Geen vorken aanwezig | `TRUE`, `FALSE` |

### Empty Container Handler Specifiek

| Kolom | Beschrijving | Voorbeeld |
|-------|--------------|-----------|
| `capaciteit` | Capaciteit in kg | `45000` |
| `lastzwaartepunt` | Lastzwaartepunt in mm | `1200` |
| `hefhoogte` | Hefhoogte (containers hoog) | `5`, `6`, `7` |
| `vrije_hef` | Vrije hef | `Yes`, `No` |
| `masttype` | Type mast | `duplex`, `duplex FFL`, `triplex` |
| `double_box_type` | Type double box spreader | `Hook and side clamp`, `Horizontal twistlock`, `Hook and wedge clamp` |
| `central_greasing_spreader` | Central greasing voor spreader | `TRUE`, `FALSE` |

### Reachstacker Specifiek

| Kolom | Beschrijving | Voorbeeld |
|-------|--------------|-----------|
| `capacity_1st_row` | Capaciteit 1e rij in kg | `45000` |
| `capacity_2nd_row` | Capaciteit 2e rij in kg | `40000` |
| `capacity_3rd_row` | Capaciteit 3e rij in kg | `35000` |
| `hefhoogte` | Hefhoogte in mm | `16000` |
| `vrije_hef` | Vrije hef in mm | `1500` |
| `masttype` | Type mast | `Duplex`, `Triplex` |
| `central_greasing_spreader` | Central greasing voor spreader | `TRUE`, `FALSE` |

### Terminal Tractor Specifiek

| Kolom | Beschrijving | Voorbeeld |
|-------|--------------|-----------|
| `fifth_wheel_height_mm` | Schoteldiameter in mm | `1150`, `1200` |

### Aandrijflijn (Alle Types)

| Kolom | Beschrijving | Voorbeeld |
|-------|--------------|-----------|
| `engine_brand` | Motor merk | `Cummins`, `Volvo`, `Perkins` |
| `engine_type` | Motor type | `QSB6.7`, `D13`, `1106D` |
| `engine_remark` | Motor opmerkingen | `Stage V`, `Euro 6` |
| `adblue` | AdBlue aanwezig | `TRUE`, `FALSE` |
| `front_axle_brand` | Vooras merk | `ZF`, `Dana` |
| `front_axle_type` | Vooras type | `APL1350`, `TE32` |
| `front_axle_remark` | Vooras opmerkingen | `Independent`, `Planetary` |
| `rear_axle_remark` | Achteras opmerkingen | `Rigid axle`, `Twin reduction` |
| `trans_brand` | Transmissie merk | `Allison`, `ZF` |
| `trans_type` | Transmissie type | `4500RDS`, `6WG200` |
| `trans_remark` | Transmissie opmerkingen | Vrije tekst |

### Cabine (Alle Types)

| Kolom | Beschrijving | Voorbeeld |
|-------|--------------|-----------|
| `heater` | Verwarming aanwezig | `TRUE`, `FALSE` |
| `airco` | Airco aanwezig | `TRUE`, `FALSE` |
| `radio` | Radio aanwezig | `TRUE`, `FALSE` |

### Afmetingen en Gewicht (Alle Types)

| Kolom | Beschrijving | Voorbeeld |
|-------|--------------|-----------|
| `length_total_mm` | Lengte totaal in mm | `5500`, `7500` |
| `width_total_mm` | Breedte totaal in mm | `2500`, `3000` |
| `drive_through_height_mm` | Gesloten hoogte in mm | `3500`, `4200` |
| `serviceweight_kg` | Servicegewicht in kg | `12000`, `18000` |

### Central Greasing en Banden (Alle Types)

| Kolom | Beschrijving | Voorbeeld |
|-------|--------------|-----------|
| `central_greasing_chassis` | Central greasing chassis | `TRUE`, `FALSE` |
| `central_greasing_spreader` | Central greasing spreader (ECH/Reachstacker) | `TRUE`, `FALSE` |
| `tire_size_front` | Bandenmaat voor | `385/65R22.5`, `445/95R25` |
| `tire_size_back` | Bandenmaat achter | `385/65R22.5`, `445/95R25` |
| `tire_type` | Type band | `Solid`, `Air suspended` |

## Equipment Type Waarden

Gebruik exact één van deze waarden in de `equipment_type` kolom:

- `heavy_duty_forklift` - Voor Heavy Duty Forklifts
- `empty_container_handler` - Voor Empty Container Handlers
- `reachstacker` - Voor Reachstackers
- `terminal_tractor` - Voor Terminal Tractors

## Boolean Waarden

Voor velden die TRUE/FALSE waarden accepteren (zoals `adblue`, `heater`, `airco`, etc.):
- Gebruik `TRUE` voor ja
- Gebruik `FALSE` voor nee
- Laat leeg als onbekend (wordt automatisch FALSE)

## Datum Formaat

Gebruik altijd het formaat **YYYY-MM-DD** voor datums:
- Correct: `2024-01-15`
- Incorrect: `15-01-2024` of `01/15/2024`

## Numerieke Waarden

- Voor gehele getallen (capaciteit, uren, etc.): gebruik geen decimalen → `5000`
- Voor prijzen: gebruik maximaal 2 decimalen → `45000.00`
- Gebruik geen punt als duizendtal scheidingsteken → `45000` (niet `45.000`)

## Tips voor het Voorbereiden van Data

1. **Begin met het voorbeeld**: Open de CSV en gebruik de voorbeeldrijen als template
2. **Verwijder voorbeelden**: Verwijder de voorbeeldrijen voordat je je eigen data toevoegt
3. **Consistentie**: Gebruik consistente schrijfwijze voor merken en types
4. **Lege velden**: Laat velden leeg als je de informatie niet hebt (behalve verplichte velden)
5. **Equipment type specifieke velden**: Vul alleen de velden in die relevant zijn voor het equipment type
6. **Controleer data types**: Let op dat getallen als getallen worden opgeslagen (niet als tekst)

## Volgende Stappen

Na het voorbereiden van je Excel bestand:

1. Sla het op als CSV bestand
2. Neem contact op met de systeembeheerder voor import
3. Of gebruik de import functionaliteit in het systeem (indien beschikbaar)

## Voorbeeld Rijen per Equipment Type

### Heavy Duty Forklift
```
heavy_duty_forklift,Toyota,8FD25,2020,12345ABC,Diesel,2500,500,5000,4500,1500,Triplex,Sideshifter,,,,,45000.00,52000.00,2024-01-15,Nederland,Rotterdam,Trucksnl,https://trucksnl.com/example,"Goed onderhouden",Cummins,QSB6.7,Stage V,TRUE,ZF,APL1350,Independent,Rigid,Allison,4500RDS,,TRUE,TRUE,TRUE,5500,2500,3500,12000,TRUE,,385/65R22.5,385/65R22.5,Solid,1200,150,60,4,FALSE
```

### Empty Container Handler
```
empty_container_handler,Kalmar,DRG450,2019,ECH789XYZ,Diesel,45000,1200,8000,,,,Hook and side clamp,,,,,50000.00,58000.00,2024-02-20,Duitsland,Hamburg,Marktplaats,https://marktplaats.nl/example,"Import",Volvo,D13,Euro 6,TRUE,Dana,TE32,Planetary,Twin reduction,ZF,6WG200,,TRUE,TRUE,TRUE,7500,3000,4200,18000,TRUE,TRUE,445/95R25,445/95R25,Air suspended,,,,,
```

### Reachstacker
```
reachstacker,Kalmar,DRF450,2021,RS456DEF,Diesel,,,,16000,,,,,45000,40000,35000,,75000.00,85000.00,2024-03-10,België,Antwerpen,Direct dealer,,"Nieuwstaat",Cummins,QSK19,Tier 4,TRUE,ZF,APL1552,Independent,Planetary,ZF,6WG310,,TRUE,TRUE,TRUE,9500,3500,4800,45000,TRUE,TRUE,525/80R25,525/80R25,,,,,,
```

### Terminal Tractor
```
terminal_tractor,Kalmar,TT612D,2018,TT123GHI,Diesel,,,12000,,,,,,,,,1150,35000.00,40000.00,2024-04-05,Nederland,Amsterdam,Auction,https://auction.com/example,"Goede cabine",Volvo,D8K,Euro 5,FALSE,ZF,APL745,Independent,Rigid,Allison,3000MH,,TRUE,FALSE,TRUE,6000,2800,3800,14000,TRUE,,315/80R22.5,315/80R22.5,,,,,,
```

## Contact

Voor vragen over het importeren van marktdata, neem contact op met het support team.
