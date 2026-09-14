// Gedeelde Forklift International-logica (XML-interface v4.82)
// Gebruikt door publish-to-forklift-international en daily-forklift-international-sync.

export const DATA_ENDPOINT = "https://importapi.forklift-international.com/xmlstapler.php";
export const IMAGE_ENDPOINT = "https://importapi.forklift-international.com/xmlimgstapler.php";

export interface MachineData {
  dossier: any;
  details: any;
  photos: any[];
  /** false = mee in de lijst maar offline (viewforklift=0) */
  visible?: boolean;
}

// Appendix A — type of construction (binnen machine type=1 Forklift)
const TOC_MAP: Record<string, number> = {
  forklift: 13,
  heavy_duty_forklift: 13,
  reachstacker: 4,
  terminal_tractor: 6,
  empty_container_handler: 2,
};

// Appendix C — engine types
const ENGINE_MAP: Record<string, number> = {
  diesel: 2, elektrisch: 1, electric: 1, lpg: 3, treibgas: 3,
  benzine: 5, gasoline: 5, cng: 6, aardgas: 6, hybride: 7, hybrid: 7, 'li-ion': 8,
};

// Appendix B — conditions
const CONDITION_MAP: Record<string, number> = {
  nieuw: 7, new: 7, 'zeer goed': 2, 'very good': 2, goed: 3, good: 3,
  gebruikt: 4, used: 4, redelijk: 4, matig: 4, slecht: 5, bad: 5,
};

// Appendix H — landcodes
const COUNTRY_MAP: Record<string, number> = {
  nl: 4, nederland: 4, netherlands: 4,
};

export const DETAILS_TABLE: Record<string, string> = {
  forklift: 'forklift_details',
  heavy_duty_forklift: 'forklift_details',
  reachstacker: 'reachstacker_details',
  terminal_tractor: 'terminal_tractor_details',
  empty_container_handler: 'empty_container_handler_details',
};

function escapeXml(unsafe: unknown): string {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function toInternalNo(dossierNumber: string): string {
  return dossierNumber.replace(/[^A-Za-z0-9_-]/g, '-');
}

function mapLookup(map: Record<string, number>, value: unknown, fallback: number): number {
  if (!value) return fallback;
  return map[String(value).trim().toLowerCase()] ?? fallback;
}

function intVal(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Math.round(Number(c));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function generateMachineXML(data: MachineData, opts: { extraTags?: string } = {}): string {
  const { dossier, details } = data;
  // Per machine: zichtbaar tenzij expliciet op onzichtbaar gezet
  const visible = (data as any).visible === false ? 0 : 1;

  const tags: [string, string | number][] = [
    ['internalno', toInternalNo(dossier.dossier_number)],
    ['manufacturer', escapeXml(dossier.brand || dossier.merk || '')],
    ['model', escapeXml(dossier.model || dossier.type || '')],
    ['chassisno', escapeXml(dossier.serienummer || details?.serial_number || '')],
    ['toc', TOC_MAP[dossier.equipment_type] ?? 0],
    ['condition', mapLookup(CONDITION_MAP, dossier.condition, 4)],
    ['yoc', intVal(dossier.year, dossier.bouwjaar)],
    ['hours', intVal(dossier.hours, dossier.uren, details?.hours_on_clock)],
    ['closedheight', intVal(details?.closed_height_mm)],
    ['liftingheight', intVal(dossier.lifting_height, dossier.hefhoogte, details?.lift_height_mm)],
    ['freelift', intVal(dossier.free_lift, details?.free_lift_mm)],
    ['enginetype', mapLookup(ENGINE_MAP, dossier.fuel_type || dossier.brandstof, 2)],
    ['dealerprice', intVal(dossier.handelsprijs)],
    ['custprice', intVal(dossier.eindklantprijs)],
    ['capacity', intVal(dossier.capacity, dossier.capaciteit, details?.capacity_kg)],
    ['loadcenter', intVal(dossier.load_center, details?.load_center_mm)],
    ['masttype', 0],
    ['tyres', 0],
    ['userremarks', escapeXml(dossier.description || '')],
    ['available', ''],
    ['rental', 0],
    ['viewforklift', visible],
    ['viewuser', visible],
    // Doorplaatsing naar Mascus: per machine via het Mascus-vinkje in Liftbase,
    // en alleen zolang de globale schakelaar FI_EXPORT_MASCUS aan staat
    // (tijdelijke brug totdat de directe Mascus-koppeling draait).
    // SupraLift blijft uit (besluit Tigran).
    ['expmascus', (['1', 'true'].includes((Deno.env.get('FI_EXPORT_MASCUS') ?? '0').toLowerCase()) && dossier.publish_to_mascus) ? 1 : 0],
    ['expsupralift', 0],
    ['loccountry', mapLookup(COUNTRY_MAP, dossier.country || dossier.land, 4)],
    // Machine-adressen zijn intern (Liftbase-only): geen plaats/adres naar F.I.
    ['loccity', ''],
  ];

  const body = tags.map(([k, v]) => ` <${k}>${v}</${k}>`).join('\n');
  return `<machine type="1">\n${body}${opts.extraTags ? '\n' + opts.extraTags : ''}\n</machine>`;
}

export function generateDataXML(code: string, data: MachineData[]): string {
  const machines = data.map((m) => generateMachineXML(m)).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<machinelist code="${escapeXml(code)}">\n${machines}\n</machinelist>`;
}

/**
 * KRITIEK (les van 14-09-2026): de F.I.-import is een TOTAALVERVANGER —
 * machines die niet in de geüploade lijst staan worden door F.I. VERWIJDERD.
 * Elke upload moet daarom ALTIJD de complete voorraad bevatten:
 * - alle dossiers met vinkje aan en status niet sold/archived -> zichtbaar
 * - dossiers die eerder gepubliceerd waren maar nu uitgevinkt/verkocht zijn
 *   -> mee in de lijst met viewforklift=0 (offline, maar niet verdwenen uit
 *   de lijst, zodat de rest intact blijft)
 */
export async function fetchCompleteFiSet(supabase: any): Promise<MachineData[]> {
  const OFFLINE_STATUSES = ['sold', 'archived'];

  const { data: flagged, error } = await supabase
    .from('dossiers')
    .select('*')
    .eq('publish_to_forklift_international', true)
    .eq('is_marktdata', false)
    .not('status', 'in', `(${OFFLINE_STATUSES.join(',')})`)
    .in('equipment_type', Object.keys(DETAILS_TABLE));
  if (error) throw new Error(`Dossiers ophalen mislukt: ${error.message}`);

  const flaggedIds = new Set((flagged ?? []).map((d: any) => d.id));

  // Eerder gepubliceerde machines die niet meer in de zichtbare set zitten
  const { data: published } = await supabase
    .from('advertisement_publications')
    .select('dossier_id')
    .eq('platform', 'forklift_international')
    .eq('status', 'published');
  const staleIds = (published ?? [])
    .map((p: any) => p.dossier_id)
    .filter((id: string) => !flaggedIds.has(id));

  let stale: any[] = [];
  if (staleIds.length) {
    const { data } = await supabase.from('dossiers').select('*').in('id', staleIds);
    stale = (data ?? []).filter((d: any) => DETAILS_TABLE[d.equipment_type]);
  }

  const visibleData = await fetchMachineData(supabase, flagged ?? []);
  const staleData = (await fetchMachineData(supabase, stale)).map((m) => ({ ...m, visible: false }));
  return [...visibleData, ...staleData];
}

export function generateImageXML(code: string, data: MachineData[], supabaseUrl: string): string {
  // Conform xmlimagedemo.xml: de beeld-XML bevat de volledige machinevelden
  // (o.a. manufacturer is verplicht) mét daarachter de image-tags.
  const machines = data.map((m) => {
    const imgs = m.photos.map((p, i) => {
      const url = `${supabaseUrl}/storage/v1/object/public/dossier-photos/${p.storage_path}`;
      return ` <image pos="${i + 1}">${escapeXml(url)}</image>`;
    }).join('\n');
    return generateMachineXML(m, { extraTags: imgs });
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<machinelist code="${escapeXml(code)}">\n${machines}\n</machinelist>`;
}

export async function uploadXML(endpoint: string, xml: string, username: string, password: string) {
  const form = new FormData();
  form.append('xmlfile', new Blob([xml], { type: 'application/xml' }), 'upload.xml');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${btoa(`${username}:${password}`)}` },
    body: form,
  });

  const text = await response.text();
  console.log(`FI upload ${endpoint} -> ${response.status}:`, text.slice(0, 500));

  // F.I. antwoordt met een telling als "UPD: 0 - New: 1 - ERR: 0 - DEL: 0".
  const errMatch = text.match(/ERR:\s*(\d+)/i);
  const errCount = errMatch ? parseInt(errMatch[1], 10) : 0;
  // Drukte-signalen: import geweigerd, later opnieuw proberen
  const busy = /another import running/i.test(text);
  // Een 200 zonder telling én zonder busy-melding is óók verdacht
  const heeftTelling = /UPD:\s*\d+/i.test(text);

  return {
    ok: response.ok && errCount === 0 && !busy && heeftTelling,
    busy,
    status: response.status,
    body: busy ? 'F.I. is nog bezig met de vorige import — wacht enkele minuten en probeer opnieuw' : text,
    errCount,
  };
}

/** Dossier + details + online-foto's ophalen voor een lijst dossiers. */
export async function fetchMachineData(supabase: any, dossiers: any[]): Promise<MachineData[]> {
  const result: MachineData[] = [];
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

export async function updatePublicationStatus(
  supabase: any, dossierId: string,
  status: 'published' | 'failed' | 'deleted',
  errorMessage: string | null, metadata: Record<string, unknown>
) {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from('advertisement_publications')
    .select('id')
    .eq('dossier_id', dossierId)
    .eq('platform', 'forklift_international')
    .maybeSingle();

  const record = { status, last_synced_at: now, sync_error_message: errorMessage, metadata };

  if (existing) {
    await supabase.from('advertisement_publications').update(record).eq('id', existing.id);
  } else {
    await supabase.from('advertisement_publications').insert({
      dossier_id: dossierId,
      platform: 'forklift_international',
      published_at: status === 'published' ? now : null,
      ...record,
    });
  }
}
