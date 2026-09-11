// Gedeelde Truck1.eu-logica (JSON-API, zie claude/truck1-koppeling-analyse.md)
// Gebruikt door publish-to-truck1 en daily-truck1-sync.
// Secrets: TRUCK1_PROVIDER_KEY, TRUCK1_DEALER_ID (+ optioneel TRUCK1_LOC_ID,
// TRUCK1_CONTACT_PERSON_ID)

export const TRUCK1_ENDPOINT = 'https://www.truck1.eu/-service/API';

export const DETAILS_TABLE: Record<string, string> = {
  forklift: 'forklift_details',
  heavy_duty_forklift: 'forklift_details',
  reachstacker: 'reachstacker_details',
  terminal_tractor: 'terminal_tractor_details',
  empty_container_handler: 'empty_container_handler_details',
};

// Truck1-categorieën (datasheet): Port equipment heeft eigen codes
function categoryFor(dossier: any): string {
  switch (dossier.equipment_type) {
    case 'reachstacker': return '9-0-241';            // Reach stacker
    case 'empty_container_handler': return '9-0-67';  // Container handler
    case 'terminal_tractor': return '9-0-242';        // Terminal tractor
    default: {
      const fuel = String(dossier.fuel_type || dossier.brandstof || '').toLowerCase();
      if (fuel.includes('elektr') || fuel.includes('electric')) return '9-0-238';
      if (fuel.includes('lpg') || fuel.includes('gas')) return '9-0-1012';
      return '9-0-239';                               // Diesel forklift
    }
  }
}

const FUEL_MAP: Record<string, number> = {
  diesel: 1, benzine: 2, petrol: 2, lpg: 4, treibgas: 4,
  elektrisch: 5, electric: 5, cng: 6, aardgas: 6, lng: 8, hybride: 9, hybrid: 9,
};

const CONDITION_MAP: Record<string, number> = {
  nieuw: 1, new: 1, 'zeer goed': 2, 'very good': 2, excellent: 2,
  goed: 3, good: 3, gebruikt: 3, used: 3, redelijk: 3, matig: 4, slecht: 4, bad: 4,
};

function mapLookup(map: Record<string, number>, value: unknown, fallback: number): number {
  if (!value) return fallback;
  return map[String(value).trim().toLowerCase()] ?? fallback;
}

function intVal(...candidates: unknown[]): number | undefined {
  for (const c of candidates) {
    const n = Math.round(Number(c));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

/** 'ja'/'yes'/'x'/true e.d. naar Truck1-boolean (1); anders undefined (weglaten). */
function boolVal(v: unknown): number | undefined {
  if (v === true || v === 1) return 1;
  const s = String(v ?? '').trim().toLowerCase();
  return ['ja', 'yes', 'true', 'x', '1'].includes(s) ? 1 : undefined;
}

/** Combineert merk+type tot één tekstveld ("Volvo TAD750" etc.). */
function combi(...parts: unknown[]): string | undefined {
  const s = parts.map((p) => String(p ?? '').trim()).filter(Boolean).join(' ');
  return s || undefined;
}

const MAST_MAP: Record<string, number> = { simplex: 1, duplex: 2, triplex: 4 };

/** Bouwt het advertentie-object voor action=add/update. */
export function buildAdPayload(dossier: any, details: any, photos: any[], supabaseUrl: string) {
  const title = [dossier.brand || dossier.merk, dossier.model || dossier.type].filter(Boolean).join(' ') || dossier.dossier_number;
  const ad: Record<string, unknown> = {
    category: categoryFor(dossier),
    make: dossier.brand || dossier.merk || '',
    model: dossier.model || dossier.type || '',
    titleen: title,
    ayear: intVal(dossier.year, dossier.bouwjaar),
    price: intVal(dossier.eindklantprijs),
    price_orig_currency: 'EUR',
    price_type: 1, // netto
    // Locatie bewust alleen "Nederland": machine-adressen zijn intern.
    // (Leeg laten kan niet — dan vult Truck1 het bedrijfsadres van de dealer in.)
    addr: 'Nederland',
    f_MachineHours: intVal(dossier.hours, dossier.uren, details?.hours_on_clock),
    f_LiftPayload: intVal(dossier.capacity, dossier.capaciteit, details?.capacity_kg),
    f_LiftHeight: intVal(dossier.lifting_height, dossier.hefhoogte, details?.lift_height_mm),
    f_FreeLift: intVal(dossier.free_lift, details?.free_lift_mm),
    f_Fuel: mapLookup(FUEL_MAP, dossier.fuel_type || dossier.brandstof, 1),
    f_Condition: mapLookup(CONDITION_MAP, dossier.condition, 3),

    // Uitgebreide specificaties uit de detailtabellen (weggelaten indien leeg)
    f_VIN: combi(dossier.serienummer || details?.serial_no),
    f_EngineMake: combi(details?.engine_brand, details?.engine_type),
    f_Gearbox: combi(details?.trans_brand, details?.trans_type),
    f_Weight: intVal(details?.serviceweight_kg),
    f_Length: intVal(details?.length_total_mm),
    f_Width: intVal(details?.width_total_mm),
    f_WheelBase: intVal(details?.wheelbase_mm, details?.wheelbase, dossier.wheelbase_mm),
    f_FifthWheelHeight: intVal(details?.fifth_wheel_height_mm, dossier.fifth_wheel_height_mm),
    f_CenterOfGravity: intVal(details?.load_center_mm, dossier.load_center),
    f_ForkLength: intVal(details?.fork_length_mm),
    f_FrontTires: combi(details?.tire_size_front),
    f_RearTires: combi(details?.tire_size_back),
    f_MastType: details?.mast_type ? MAST_MAP[String(details.mast_type).trim().toLowerCase()] : undefined,
    f_AC: boolVal(details?.airco),
    f_Heater: boolVal(details?.heater),
    f_Radio: boolVal(details?.radio),
    f_CentralLubrication: boolVal(details?.central_greasing_chassis),
    f_DPF: boolVal(details?.particle_filter),

    // Omschrijving: dossiertekst + externe opmerkingen uit de machinekaart
    notesen: [dossier.description, details?.external_remarks].map((s) => String(s ?? '').trim()).filter(Boolean).join('\n\n'),
    images: photos.map((p) => `${supabaseUrl}/storage/v1/object/public/dossier-photos/${p.storage_path}`),
  };

  const locId = intVal(Deno.env.get('TRUCK1_LOC_ID'));
  const contactId = intVal(Deno.env.get('TRUCK1_CONTACT_PERSON_ID'));
  if (locId) ad.loc_id = locId;
  if (contactId) ad.contact_person_id = contactId;

  // lege waarden weglaten
  return Object.fromEntries(Object.entries(ad).filter(([, v]) => v !== undefined && v !== ''));
}

/**
 * Verstuurt acties naar Truck1: { "HCL26-140": {action:'add', ...}, ... }
 * test=true gebruikt de ingebouwde Truck1-testmodus (er wordt niets geplaatst).
 */
export async function sendToTruck1(ads: Record<string, unknown>, opts: { test?: boolean } = {}) {
  const providerKey = Deno.env.get('TRUCK1_PROVIDER_KEY');
  const dealerId = Deno.env.get('TRUCK1_DEALER_ID');
  if (!providerKey || !dealerId) {
    throw new Error('Truck1-secrets ontbreken (TRUCK1_PROVIDER_KEY, TRUCK1_DEALER_ID)');
  }

  const data: Record<string, unknown> = { dealers: { [dealerId]: ads } };
  if (opts.test) data.test = '1';

  const body = new URLSearchParams({ provider: providerKey, data: JSON.stringify(data) });

  // Truck1 blokkeert cloud-IP's; daarom loopt het verkeer via de relay op de
  // Hetzner-server (TRUCK1_RELAY_URL), beveiligd met het CRON_SECRET.
  const relayUrl = Deno.env.get('TRUCK1_RELAY_URL');
  const endpoint = relayUrl || TRUCK1_ENDPOINT;
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (relayUrl) headers['X-Relay-Secret'] = Deno.env.get('CRON_SECRET') ?? '';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  const text = await response.text();
  console.log(`Truck1 -> ${response.status}:`, text.slice(0, 800));

  let json: any = null;
  try { json = JSON.parse(text); } catch { /* "API is busy" e.d. */ }

  const dealer = json?.dealers?.[dealerId] ?? {};
  const summary = dealer.summary ?? {};
  const errors: unknown[] = [...(json?.error ?? []), ...(dealer.error ?? [])];
  const busy = !json && /busy/i.test(text);

  // summary-waarden zijn "gelukt/totaal" per actie
  const parseRatio = (s: unknown) => {
    const m = String(s ?? '0/0').match(/(\d+)\s*\/\s*(\d+)/);
    return m ? { ok: parseInt(m[1], 10), total: parseInt(m[2], 10) } : { ok: 0, total: 0 };
  };
  const totals = ['add', 'update', 'delete'].map((a) => parseRatio(summary[a]));
  const allOk = totals.every((t) => t.ok === t.total) && errors.length === 0;

  return {
    ok: response.ok && !busy && allOk,
    busy,
    status: response.status,
    summary,
    errors,
    warnings: [...(json?.warning ?? []), ...(dealer.warning ?? [])],
    raw: text.slice(0, 1000),
    stock: dealer.stock ?? null,
  };
}

export async function fetchMachineData(supabase: any, dossiers: any[]) {
  const result: { dossier: any; details: any; photos: any[] }[] = [];
  for (const dossier of dossiers) {
    const table = DETAILS_TABLE[dossier.equipment_type];
    const { data: details } = table
      ? await supabase.from(table).select('*').eq('dossier_id', dossier.id).maybeSingle()
      : { data: null };
    const { data: photos } = await supabase
      .from('photos').select('*')
      .eq('dossier_id', dossier.id)
      .eq('visible_online', true)
      .order('display_order', { ascending: true });
    result.push({ dossier, details, photos: photos ?? [] });
  }
  return result;
}

export async function updateTruck1PublicationStatus(
  supabase: any, dossierId: string, status: 'published' | 'failed' | 'deleted',
  errorMessage: string | null, metadata: Record<string, unknown>
) {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from('advertisement_publications')
    .select('id')
    .eq('dossier_id', dossierId)
    .eq('platform', 'truck1')
    .maybeSingle();

  const record = { status, last_synced_at: now, sync_error_message: errorMessage, metadata };
  if (existing) {
    await supabase.from('advertisement_publications').update(record).eq('id', existing.id);
  } else {
    await supabase.from('advertisement_publications').insert({
      dossier_id: dossierId, platform: 'truck1',
      published_at: status === 'published' ? now : null,
      ...record,
    });
  }
}
