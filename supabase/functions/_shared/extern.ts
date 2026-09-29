// UITSLUITREGEL EXTERNE PUBLICATIE (regel Tigran/Bas 16-09-2026)
// =================================================================
// Interne informatie mag NOOIT op een advertentieplatform of op de
// website komen. Daarom werkt alle externe tekst via een WHITELIST:
// alleen velden die hieronder expliciet als extern zijn aangemerkt
// gaan naar buiten. Al het andere is per definitie intern.
//
// EXTERN toegestaan (whitelist):
//   - details.external_remarks   ("Externe opmerkingen" in de app)
//   - dossier.online_description (expliciet voor online bedoeld, indien gevuld)
//
// NOOIT extern (definitieve internlijst, Tigran/Bas 16-09-2026):
//   - ALLE prijzen: inkoopprijs (purchase_price), geschatte waarde
//     (estimated_value), handelsprijs, eindklantprijs, verkocht voor
//     (sale_price), publication_price — afgedwongen per kanaal
//     (F.I. dealerprice/custprice=0, Truck1 price=0, WC regular_price='')
//   - Interne opmerkingen: details.remark, dossier.description,
//     engine_remark / trans_remark / *_remark-velden
//   - Foto's die op "niet online" staan (visible_online=false) —
//     afgedwongen: alle kanalen filteren op visible_online=true
//   - Serienummer / VIN (dossier.serial_number, details.serial_no) —
//     ook niet naar F.I. (chassisno blijft leeg)
//   - Klantnaam / vlootnummer klant (customer_name, customer_id, order_no)
//   - Afmetingen en gewicht (length_total_mm, width_total_mm,
//     serviceweight_kg, e.d.)
//   - Documenten en bijlagen (PDF's)
//   - Locatie/adres van de machine (alleen land; afgedwongen per kanaal)
//   - marktdata_* velden, interne notities, toewijzingen
//
// Gebruik in de kanalen (fi.ts, truck1.ts, wc.ts): ALTIJD deze functie
// aanroepen voor advertentie-/productteksten. Nooit rechtstreeks een
// dossier- of detailveld in een externe tekst zetten.

/**
 * Stabiele vingerafdruk van een fotoset (paden + volgorde). Gedeeld door
 * alle kanalen om ongewijzigde foto's te kunnen overslaan bij syncs.
 */
export function photoFingerprint(photos: any[]): string {
  return (photos ?? []).map((p) => p.storage_path).join('|');
}

/** Enige toegestane bron voor externe advertentie-/productteksten. */
export function externeTekst(dossier: any, details: any): string {
  const delen = [
    dossier?.online_description,
    details?.external_remarks,
  ].map((s) => String(s ?? '').trim()).filter(Boolean);
  return delen.join('\n\n');
}
