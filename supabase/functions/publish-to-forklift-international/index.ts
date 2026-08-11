import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// Forklift International XML-interface v4.82
// Officiële endpoints (uit xmlinterface.zip):
//   data:        POST https://importapi.forklift-international.com/xmlstapler.php
//   afbeeldingen: POST https://importapi.forklift-international.com/xmlimgstapler.php
// Auth: HTTP Basic (FI_USERNAME/FI_PASSWORD) + machinelist-code in de XML-root.
// Credentials uitsluitend server-side via Supabase-secrets:
//   FI_MACHINELIST_CODE, FI_USERNAME, FI_PASSWORD

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DATA_ENDPOINT = "https://importapi.forklift-international.com/xmlstapler.php";
const IMAGE_ENDPOINT = "https://importapi.forklift-international.com/xmlimgstapler.php";

interface MachineData {
  dossier: any;
  details: any;
  photos: any[];
}

// Appendix A — type of construction (binnen machine type=1 Forklift)
const TOC_MAP: Record<string, number> = {
  forklift: 13,                  // Diesel Forklift
  heavy_duty_forklift: 13,       // Diesel Forklift
  reachstacker: 4,               // Reach-stacker
  terminal_tractor: 6,           // Terminal tractor
  empty_container_handler: 2,    // Container-Stacker
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

// Appendix H — landcodes (meest relevante)
const COUNTRY_MAP: Record<string, number> = {
  nl: 4, nederland: 4, netherlands: 4,
};

function escapeXml(unsafe: unknown): string {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** internalno mag geen spaties/speciale tekens bevatten (wordt ook voor foto-koppeling gebruikt) */
function toInternalNo(dossierNumber: string): string {
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

function generateMachineXML(data: MachineData, opts: { unpublish?: boolean } = {}): string {
  const { dossier, details } = data;
  const visible = opts.unpublish ? 0 : 1;

  const tags = [
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
    // Besluit Tigran 11-08-2026: GEEN doorplaatsing via F.I.
    ['expmascus', 0],
    ['expsupralift', 0],
    ['loccountry', mapLookup(COUNTRY_MAP, dossier.country || dossier.land, 4)],
    ['loccity', escapeXml(dossier.location || dossier.locatie || '')],
  ];

  const body = tags.map(([k, v]) => ` <${k}>${v}</${k}>`).join('\n');
  return `<machine type="1">\n${body}\n</machine>`;
}

function generateDataXML(code: string, data: MachineData[], opts: { unpublish?: boolean } = {}): string {
  const machines = data.map((m) => generateMachineXML(m, opts)).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<machinelist code="${escapeXml(code)}">\n${machines}\n</machinelist>`;
}

/** Aparte beeld-XML: publieke foto-URLs per machine, alleen visible_online, in display_order. */
function generateImageXML(code: string, data: MachineData[], supabaseUrl: string): string {
  const machines = data.map(({ dossier, photos }) => {
    const imgs = photos.map((p, i) => {
      const url = `${supabaseUrl}/storage/v1/object/public/dossier-photos/${p.storage_path}`;
      return ` <image pos="${i + 1}">${escapeXml(url)}</image>`;
    }).join('\n');
    return `<machine type="1">\n <internalno>${toInternalNo(dossier.dossier_number)}</internalno>\n${imgs}\n</machine>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<machinelist code="${escapeXml(code)}">\n${machines}\n</machinelist>`;
}

async function uploadXML(endpoint: string, xml: string, username: string, password: string) {
  const form = new FormData();
  form.append('xmlfile', new Blob([xml], { type: 'application/xml' }), 'upload.xml');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${btoa(`${username}:${password}`)}` },
    body: form,
  });

  const text = await response.text();
  console.log(`FI upload ${endpoint} -> ${response.status}:`, text.slice(0, 500));
  return { ok: response.ok, status: response.status, body: text };
}

const DETAILS_TABLE: Record<string, string> = {
  forklift: 'forklift_details',
  heavy_duty_forklift: 'forklift_details',
  reachstacker: 'reachstacker_details',
  terminal_tractor: 'terminal_tractor_details',
  empty_container_handler: 'empty_container_handler_details',
};

async function updatePublicationStatus(
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

  const record = {
    status,
    last_synced_at: now,
    sync_error_message: errorMessage,
    metadata,
  };

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Alleen ingelogde managers mogen publiceren
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Geen autorisatie-header');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Niet geautoriseerd');

    const { data: profile } = await supabase
      .from('user_profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'manager') throw new Error('Alleen managers kunnen advertenties publiceren');

    const body = await req.json();
    const { dossierIds, testMode, action } = body; // action: 'publish' (default) | 'unpublish'
    const unpublish = action === 'unpublish';

    if (!dossierIds?.length) throw new Error('Geen dossier-IDs opgegeven');

    const machinelistCode = Deno.env.get('FI_MACHINELIST_CODE');
    const fiUsername = Deno.env.get('FI_USERNAME');
    const fiPassword = Deno.env.get('FI_PASSWORD');

    const { data: dossiers, error: dossiersError } = await supabase
      .from('dossiers').select('*').in('id', dossierIds);
    if (dossiersError) throw new Error(`Dossiers ophalen mislukt: ${dossiersError.message}`);

    const publishable = (dossiers ?? []).filter((d: any) => DETAILS_TABLE[d.equipment_type]);
    if (!publishable.length) throw new Error('Geen van de geselecteerde dossiers heeft een type dat naar F.I. kan');

    const machineData: MachineData[] = [];
    for (const dossier of publishable) {
      const { data: details } = await supabase
        .from(DETAILS_TABLE[dossier.equipment_type])
        .select('*').eq('dossier_id', dossier.id).maybeSingle();

      const { data: photos } = await supabase
        .from('photos').select('*')
        .eq('dossier_id', dossier.id)
        .eq('visible_online', true)
        .order('display_order', { ascending: true });

      machineData.push({ dossier, details, photos: photos ?? [] });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const code = machinelistCode ?? 'ONTBREEKT';
    const dataXML = generateDataXML(code, machineData, { unpublish });
    const imageXML = unpublish ? null : generateImageXML(code, machineData, supabaseUrl);

    if (testMode) {
      return new Response(JSON.stringify({
        success: true, testMode: true, action: unpublish ? 'unpublish' : 'publish',
        machineCount: machineData.length, dataXML, imageXML,
        secretsAanwezig: { FI_MACHINELIST_CODE: !!machinelistCode, FI_USERNAME: !!fiUsername, FI_PASSWORD: !!fiPassword },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!machinelistCode || !fiUsername || !fiPassword) {
      throw new Error('F.I.-secrets ontbreken in Supabase (FI_MACHINELIST_CODE, FI_USERNAME, FI_PASSWORD)');
    }

    // 1. Machinedata uploaden
    const dataResult = await uploadXML(DATA_ENDPOINT, dataXML, fiUsername, fiPassword);
    // 2. Afbeeldingen (alleen bij publish en als data-upload slaagde)
    let imageResult: { ok: boolean; status: number; body: string } | null = null;
    if (dataResult.ok && imageXML) {
      imageResult = await uploadXML(IMAGE_ENDPOINT, imageXML, fiUsername, fiPassword);
    }

    const success = dataResult.ok && (unpublish || imageResult?.ok !== false);

    for (const item of machineData) {
      await updatePublicationStatus(
        supabase,
        item.dossier.id,
        success ? (unpublish ? 'deleted' : 'published') : 'failed',
        success ? null : `Data: ${dataResult.status} ${dataResult.body.slice(0, 300)}${imageResult ? ` | Afbeeldingen: ${imageResult.status}` : ''}`,
        {
          internalno: toInternalNo(item.dossier.dossier_number),
          action: unpublish ? 'unpublish' : 'publish',
          data_response: dataResult.body.slice(0, 1000),
          image_response: imageResult?.body?.slice(0, 1000) ?? null,
          photo_count: item.photos.length,
        }
      );
    }

    return new Response(JSON.stringify({
      success,
      action: unpublish ? 'unpublish' : 'publish',
      machineCount: machineData.length,
      dataStatus: dataResult.status,
      imageStatus: imageResult?.status ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Fout in publish-to-forklift-international:', error);
    return new Response(JSON.stringify({ error: error.message || 'Onbekende fout' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
