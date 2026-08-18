import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// Publiceert dossiers als WooCommerce-producten op heavycargolifters.com.
// SKU = dossiernummer; aanmaken/bijwerken idempotent; unpublish = concept.
// Secrets: WC_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET
// body: { dossierIds: string[], testMode?: boolean, action?: 'publish'|'unpublish',
//         productStatus?: 'draft'|'publish' }  (default 'publish')

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CATEGORY_MAP: Record<string, string> = {
  forklift: 'Heavy Duty Forklifts',
  heavy_duty_forklift: 'Heavy Duty Forklifts',
  reachstacker: 'Reachstackers',
  terminal_tractor: 'Terminal Tractors',
  empty_container_handler: 'Empty Container Handlers',
};

interface WCConfig { url: string; key: string; secret: string; }

function wcHeaders(cfg: WCConfig) {
  return {
    'Authorization': `Basic ${btoa(`${cfg.key}:${cfg.secret}`)}`,
    'Content-Type': 'application/json',
  };
}

async function wcFetch(cfg: WCConfig, path: string, init?: RequestInit) {
  const response = await fetch(`${cfg.url}/wp-json/wc/v3${path}`, {
    ...init,
    headers: { ...wcHeaders(cfg), ...(init?.headers ?? {}) },
  });
  const text = await response.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* laat json null */ }
  return { ok: response.ok, status: response.status, json, text };
}

/** Zoekt categorie-ID op naam; maakt hem aan als hij nog niet bestaat. */
const categoryCache = new Map<string, number>();
async function resolveCategory(cfg: WCConfig, name: string): Promise<number | null> {
  if (categoryCache.has(name)) return categoryCache.get(name)!;
  const search = await wcFetch(cfg, `/products/categories?search=${encodeURIComponent(name)}&per_page=20`);
  const match = (search.json ?? []).find((c: any) => c.name.toLowerCase() === name.toLowerCase());
  if (match) { categoryCache.set(name, match.id); return match.id; }
  const created = await wcFetch(cfg, '/products/categories', {
    method: 'POST', body: JSON.stringify({ name }),
  });
  if (created.ok && created.json?.id) { categoryCache.set(name, created.json.id); return created.json.id; }
  console.error('Categorie aanmaken mislukt:', name, created.status, created.text.slice(0, 200));
  return null;
}

function buildAttributes(dossier: any, details: any) {
  const attrs: { name: string; visible: boolean; options: string[] }[] = [];
  const add = (name: string, value: unknown, suffix = '') => {
    if (value !== null && value !== undefined && String(value).trim() !== '' && Number(value) !== 0) {
      attrs.push({ name, visible: true, options: [`${value}${suffix}`] });
    }
  };
  add('Fabrikant', dossier.brand || dossier.merk);
  add('Capaciteit', dossier.capacity || dossier.capaciteit || details?.capacity_kg, ' kg');
  add('Hefhoogte', dossier.lifting_height || dossier.hefhoogte || details?.lift_height_mm, ' mm');
  add('Gesloten hoogte', details?.closed_height_mm, ' mm');
  add('Bouwjaar', dossier.year || dossier.bouwjaar);
  add('Urenstand', dossier.hours || dossier.uren || details?.hours_on_clock, ' uur');
  add('Serienummer', dossier.serienummer || details?.serial_number);
  return attrs;
}

function buildProductPayload(dossier: any, details: any, photos: any[], supabaseUrl: string, categoryId: number | null, productStatus: string) {
  const title = [dossier.brand || dossier.merk, dossier.model || dossier.type].filter(Boolean).join(' ') || dossier.title || dossier.dossier_number;
  return {
    name: title,
    type: 'simple',
    sku: dossier.dossier_number,
    status: productStatus,
    regular_price: dossier.eindklantprijs ? String(dossier.eindklantprijs) : '',
    description: dossier.description || '',
    short_description: '',
    categories: categoryId ? [{ id: categoryId }] : [],
    images: photos.map((p, i) => ({
      src: `${supabaseUrl}/storage/v1/object/public/dossier-photos/${p.storage_path}`,
      position: i,
    })),
    attributes: buildAttributes(dossier, details),
    meta_data: [{ key: 'liftbase_dossier_number', value: dossier.dossier_number }],
  };
}

const DETAILS_TABLE: Record<string, string> = {
  forklift: 'forklift_details',
  heavy_duty_forklift: 'forklift_details',
  reachstacker: 'reachstacker_details',
  terminal_tractor: 'terminal_tractor_details',
  empty_container_handler: 'empty_container_handler_details',
};

async function updatePublicationStatus(
  supabase: any, dossierId: string, status: 'published' | 'failed' | 'deleted',
  errorMessage: string | null, metadata: Record<string, unknown>
) {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from('advertisement_publications')
    .select('id')
    .eq('dossier_id', dossierId)
    .eq('platform', 'hcl')
    .maybeSingle();

  const record = { status, last_synced_at: now, sync_error_message: errorMessage, metadata };
  if (existing) {
    await supabase.from('advertisement_publications').update(record).eq('id', existing.id);
  } else {
    await supabase.from('advertisement_publications').insert({
      dossier_id: dossierId, platform: 'hcl',
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

    // Alleen ingelogde managers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Geen autorisatie-header');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Niet geautoriseerd');
    const { data: profile } = await supabase
      .from('user_profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'manager') throw new Error('Alleen managers kunnen publiceren');

    const body = await req.json();
    const { dossierIds, testMode, action, productStatus = 'publish' } = body;
    const unpublish = action === 'unpublish';
    if (!dossierIds?.length) throw new Error('Geen dossier-IDs opgegeven');

    const cfg: WCConfig = {
      url: (Deno.env.get('WC_URL') ?? '').replace(/\/$/, ''),
      key: Deno.env.get('WC_CONSUMER_KEY') ?? '',
      secret: Deno.env.get('WC_CONSUMER_SECRET') ?? '',
    };
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    const { data: dossiers, error: dossiersError } = await supabase
      .from('dossiers').select('*').in('id', dossierIds);
    if (dossiersError) throw new Error(`Dossiers ophalen mislukt: ${dossiersError.message}`);
    if (!dossiers?.length) throw new Error('Geen dossiers gevonden');

    const results: any[] = [];

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

      if (testMode) {
        const payload = buildProductPayload(dossier, details, photos ?? [], supabaseUrl, null, unpublish ? 'draft' : productStatus);
        results.push({ dossier: dossier.dossier_number, testMode: true, payload });
        continue;
      }

      if (!cfg.key || !cfg.secret) throw new Error('WooCommerce-secrets ontbreken (WC_CONSUMER_KEY, WC_CONSUMER_SECRET)');

      try {
        // Bestaand product zoeken op SKU
        const existing = await wcFetch(cfg, `/products?sku=${encodeURIComponent(dossier.dossier_number)}`);
        const existingProduct = (existing.json ?? [])[0];

        let result;
        if (unpublish) {
          if (existingProduct) {
            result = await wcFetch(cfg, `/products/${existingProduct.id}`, {
              method: 'PUT', body: JSON.stringify({ status: 'draft' }),
            });
          } else {
            result = { ok: true, status: 200, json: null, text: 'geen product gevonden — niets te doen' };
          }
        } else {
          const categoryId = await resolveCategory(cfg, CATEGORY_MAP[dossier.equipment_type] ?? 'Overig');
          const payload = buildProductPayload(dossier, details, photos ?? [], supabaseUrl, categoryId, productStatus);
          result = existingProduct
            ? await wcFetch(cfg, `/products/${existingProduct.id}`, { method: 'PUT', body: JSON.stringify(payload) })
            : await wcFetch(cfg, '/products', { method: 'POST', body: JSON.stringify(payload) });
        }

        const success = result.ok;
        await updatePublicationStatus(supabase, dossier.id,
          success ? (unpublish ? 'deleted' : 'published') : 'failed',
          success ? null : `WooCommerce ${result.status}: ${result.text.slice(0, 300)}`,
          {
            sku: dossier.dossier_number,
            action: unpublish ? 'unpublish' : 'publish',
            product_id: result.json?.id ?? existingProduct?.id ?? null,
            product_url: result.json?.permalink ?? null,
            photo_count: photos?.length ?? 0,
            product_status: unpublish ? 'draft' : productStatus,
          });

        results.push({
          dossier: dossier.dossier_number,
          success,
          productId: result.json?.id ?? existingProduct?.id ?? null,
          url: result.json?.permalink ?? null,
          status: result.status,
          ...(success ? {} : { error: result.text.slice(0, 300) }),
        });
      } catch (err: any) {
        await updatePublicationStatus(supabase, dossier.id, 'failed', err.message, {
          sku: dossier.dossier_number, action: unpublish ? 'unpublish' : 'publish',
        });
        results.push({ dossier: dossier.dossier_number, success: false, error: err.message });
      }
    }

    const success = results.every((r) => r.success !== false);
    return new Response(JSON.stringify({ success, action: unpublish ? 'unpublish' : 'publish', results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Fout in publish-to-hcl-website:', error);
    return new Response(JSON.stringify({ error: error.message || 'Onbekende fout' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
