# Forklift International - Field Mapping

## Veldkoppelingen tussen Forklift International API en Database

Deze tabel toont de mapping tussen Forklift International XML velden en de velden in onze database.

| Forklift International Veld | Database Veld | Type | Verplicht | Opmerkingen |
|------------------------------|---------------|------|-----------|-------------|
| **Basis Identificatie** |
| `<id>` | `dossiers.dossier_number` | text | Ja | Uniek ID voor de machine |
| `<changed>` | `dossiers.updated_at` | datetime | Ja | Format: YYYY-MM-DD HH:MM:SS |
| `<type>` | Hardcoded: "1" | number | Ja | 1 = Forklift |
| **Machine Details** |
| `<make>` | `dossiers.brand` | text | Ja | Merk van de machine |
| `<model>` | `dossiers.model` | text | Ja | Model van de machine |
| `<year>` | `dossiers.year` | number | Ja | Bouwjaar (4 cijfers) |
| `<hours>` | `dossiers.hours` of `forklift_details.hours_on_clock` | number | Nee | Aantal draaiuren |
| `<serial>` | `forklift_details.serial_no` | text | Nee | Serienummer van de machine |
| **Capaciteit & Afmetingen** |
| `<capacity>` | `dossiers.capacity` of `forklift_details.capacity_kg` | number | Ja | Capaciteit in kg |
| `<loadcenter>` | `dossiers.load_center` of `forklift_details.load_center_mm` | number | Ja | Lastzwaartepunt in mm (default: 500) |
| `<lift>` | `dossiers.lifting_height` of `forklift_details.lift_height_mm` | number | Nee | Hefhoogte in mm |
| `<freelift>` | `dossiers.free_lift` | number | Nee | Vrije hefhoogte in mm |
| `<height>` | `forklift_details.drive_through_height_mm` | number | Nee | Doorrijhoogte in mm |
| `<length>` | `forklift_details.length_total_mm` | number | Nee | Totale lengte in mm |
| `<width>` | `forklift_details.width_total_mm` | number | Nee | Totale breedte in mm |
| `<weight>` | `forklift_details.serviceweight_kg` | number | Nee | Eigen gewicht in kg |
| **Mast Details** |
| `<mast>` | `dossiers.mast_type` of `forklift_details.mast_type` | text | Nee | Type mast (bijv. Duplex, Triplex) |
| `<mastsections>` | `forklift_details.mast` | text | Nee | Aantal mastsecties |
| **Aandrijving** |
| `<power>` | `dossiers.fuel_type` | text | Ja | D=Diesel, E=Electric, L=LPG, G=Gas, H=Hybrid |
| `<engine>` | `forklift_details.engine_brand` + `forklift_details.engine_type` | text | Nee | Motor merk en type |
| `<transmission>` | `forklift_details.trans_brand` + `forklift_details.trans_type` | text | Nee | Transmissie merk en type |
| **Banden** |
| `<tyres>` | `forklift_details.front_tire_type` + `forklift_details.rear_tire_type` | text | Nee | Type banden (bijv. SE, Pneumatic) |
| `<tyresfront>` | `forklift_details.front_tire_size` | text | Nee | Bandenspanning voorzijde |
| `<tyresrear>` | `forklift_details.rear_tire_size` | text | Nee | Bandenspanning achterzijde |
| **Cabine & Comfort** |
| `<cabin>` | `forklift_details.cabin_type` | text | Nee | Type cabine (Open/Closed) |
| `<heater>` | `forklift_details.heater` | boolean | Nee | Verwarming aanwezig (yes/no) |
| `<airco>` | `forklift_details.airco` | boolean | Nee | Airconditioning aanwezig (yes/no) |
| `<radio>` | `forklift_details.radio` | text | Nee | Radio aanwezig |
| **Verlichting** |
| `<worklight>` | `forklift_details.work_light_front` + `forklift_details.work_light_rear` | text | Nee | Werkverlichting |
| `<beacon>` | `forklift_details.beacon` | text | Nee | Zwaailicht |
| **Aanbouwdeel** |
| `<attachment>` | `dossiers.aanbouwdeel` of `forklift_details.attachment` | text | Nee | Type aanbouwdeel |
| `<forklength>` | `forklift_details.forks_length_mm` | number | Nee | Vorklengte in mm |
| `<forkwidth>` | `forklift_details.forks_width_mm` | number | Nee | Vorkbreedte in mm |
| `<forkthickness>` | `forklift_details.forks_thickness_mm` | number | Nee | Vorkdikte in mm |
| `<forkcarriage>` | `forklift_details.forks_carriage` | text | Nee | Vorkcarriage specificatie |
| `<sideshift>` | `forklift_details.side_shift` | text | Nee | Zijverstelling aanwezig (yes/no) |
| `<hydrauliclines>` | `forklift_details.hydraulic_lines` | text | Nee | Aantal hydraulische leidingen |
| **Locatie** |
| `<country>` | `dossiers.country` | text | Ja | Landcode (bijv. NL, DE, BE) |
| `<city>` | `dossiers.location` | text | Nee | Stad/locatie |
| **Prijzen** |
| `<dealerprice>` | `dossiers.handelsprijs` | number | Ja | Handelsprijs (netto dealer prijs) |
| `<customerprice>` | `dossiers.eindklantprijs` | number | Nee | Klantprijs (bruto eindklant prijs) |
| `<webprice>` | - | number | Nee | Webprijs (wordt berekend of apart ingesteld) |
| **Beschrijving & Media** |
| `<description>` | `dossiers.description` | text | Ja | Gedetailleerde beschrijving |
| `<url>` | - | text | Nee | URL naar eigen website (optioneel) |
| `<photo><url>` | `photos.storage_path` | text | Nee | Foto URLs uit Supabase Storage |
| `<photo><main>` | `photos.display_order = 0` | boolean | Nee | Hoofdfoto indicator |
| **Aanvullende Info** |
| `<remark>` | `forklift_details.remark` | text | Nee | Extra opmerkingen |
| `<condition>` | `dossiers.condition` | text | Nee | Staat van de machine |
| `<ce>` | - | boolean | Nee | CE certificering (yes/no) |
| `<warranty>` | - | text | Nee | Garantie informatie |

## Extra Database Velden (Niet gebruikt in FI API)

Deze velden zijn beschikbaar in de database maar worden niet direct gebruikt in de Forklift International XML:

| Database Veld | Doel |
|---------------|------|
| `dossiers.id` | Interne UUID voor database relaties |
| `dossiers.dossier_datum` | Datum van dossier aanmaak |
| `dossiers.status` | Status (draft, active, sold, archived) |
| `dossiers.created_by` | Gebruiker die dossier heeft aangemaakt |
| `dossiers.assigned_to` | Toegewezen verkoper |
| `dossiers.estimated_value` | Interne taxatiewaarde |
| `dossiers.is_marktdata` | Indicator voor marktdata |
| `dossiers.verkoopdatum` | Verkoopdatum |
| `forklift_details.order_no` | Intern ordernummer |
| `forklift_details.date` | Datum van details |
| `forklift_details.seat_brand` | Stoel merk |
| `forklift_details.seat_type_suspension` | Stoeltype/vering |
| `forklift_details.headrest` | Hoofdsteun |
| `forklift_details.mirrors` | Spiegels |
| `forklift_details.mirrors_heated` | Verwarmde spiegels |
| `forklift_details.adblue` | AdBlue systeem |
| `forklift_details.particle_filter` | Roetfilter |
| `forklift_details.shift_type` | Schakeltype |

## Brandstof Type Mapping

| Database Waarde | FI Code | Beschrijving |
|-----------------|---------|--------------|
| Diesel | D | Diesel motor |
| Elektrisch / Electric | E | Elektrische motor |
| LPG | L | LPG motor |
| Gas | G | Gas motor |
| Hybride / Hybrid | H | Hybride motor |

## Foto Synchronisatie

Foto's worden opgehaald uit de `photos` tabel en de Supabase Storage bucket `dossier-photos`:
- `photos.storage_path` wordt gebruikt om de volledige URL te genereren
- `photos.display_order` bepaalt de volgorde (0 = hoofdfoto)
- URL format: `https://[supabase-url]/storage/v1/object/public/dossier-photos/[storage_path]`

## Notities voor Implementatie

1. **Verplichte velden**: Zorg dat deze velden altijd gevuld zijn voordat je publiceert naar FI
2. **Datum format**: FI verwacht datums in format `YYYY-MM-DD HH:MM:SS`
3. **XML encoding**: Alle tekstuele content moet XML-escaped worden (&, <, >, ", ')
4. **Foto's**: Minimaal 1 foto is sterk aanbevolen, maximaal geen limiet
5. **Prijzen**: Handelsprijs is verplicht, klantprijs optioneel
6. **Land codes**: Gebruik ISO 3166-1 alpha-2 codes (NL, DE, BE, etc.)

## Belangrijke Database Veld Updates (November 2025)

De database gebruikt nu **Engelse** veldnamen in plaats van Nederlandse:

| Oud (Nederlands) | Nieuw (Engels) |
|------------------|----------------|
| `dossiers.merk` | `dossiers.brand` |
| `dossiers.type` | `dossiers.model` |
| `dossiers.bouwjaar` | `dossiers.year` |
| `dossiers.uren` | `dossiers.hours` |
| `dossiers.capaciteit` | `dossiers.capacity` |
| `dossiers.lastzwaartepunt` | `dossiers.load_center` |
| `dossiers.hefhoogte` | `dossiers.lifting_height` |
| `dossiers.vrije_hef` | `dossiers.free_lift` |
| `dossiers.masttype` | `dossiers.mast_type` |
| `dossiers.brandstof` | `dossiers.fuel_type` |
| `dossiers.land` | `dossiers.country` |
| `dossiers.locatie` | `dossiers.location` |

**Alle Edge Functions zijn bijgewerkt om de nieuwe Engelse veldnamen te gebruiken.**

## Test Mode

De Edge Function ondersteunt een test mode waarbij de XML wordt gegenereerd maar niet geüpload:
```json
{
  "dossierIds": ["uuid1", "uuid2"],
  "fiUsername": "username",
  "fiPassword": "password",
  "testMode": true
}
```
