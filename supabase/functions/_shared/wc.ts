// Gedeelde WooCommerce-logica (heavycargolifters.com)
// Gebruikt door publish-to-hcl-website en daily-hcl-sync.

export interface WCConfig { url: string; key: string; secret: string; }

export function wcConfigFromEnv(): WCConfig {
  return {
    url: (Deno.env.get('WC_URL') ?? '').replace(/\/$/, ''),
    key: Deno.env.get('WC_CONSUMER_KEY') ?? '',
    secret: Deno.env.get('WC_CONSUMER_SECRET') ?? '',
  };
}

// Namen exact zoals ze al op de site bestaan (anders ontstaan er duplicaten)
export const CATEGORY_MAP: Record<string, string> = {
  forklift: 'Heavy Duty Forklifts',
  heavy_duty_forklift: 'Heavy Duty Forklifts',
  reachstacker: 'Reachstackers',
  terminal_tractor: 'Terminal tractor',
  empty_container_handler: 'Container Handlers',
};

export const DETAILS_TABLE: Record<string, string> = {
  forklift: 'forklift_details',
  heavy_duty_forklift: 'forklift_details',
  reachstacker: 'reachstacker_details',
  terminal_tractor: 'terminal_tractor_details',
  empty_container_handler: 'empty_container_handler_details',
};

export async function wcFetch(cfg: WCConfig, path: string, init?: RequestInit) {
  const response = await fetch(`${cfg.url}/wp-json/wc/v3${path}`, {
    ...init,
    headers: {
      'Authorization': `Basic ${btoa(`${cfg.key}:${cfg.secret}`)}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* laat json null */ }
  return { ok: response.ok, status: response.status, json, text };
}

const categoryCache = new Map<string, number>();
export async function resolveCategory(cfg: WCConfig, name: string): Promise<number | null> {
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

export function buildProductPayload(dossier: any, details: any, photos: any[], supabaseUrl: string, categoryId: number | null, productStatus: string) {
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

export async function updateHclPublicationStatus(
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

/**
 * Verwerkt een lijst dossiers richting WooCommerce (aanmaken/bijwerken of
 * naar concept bij unpublish) en registreert de status per dossier.
 */
export async function processDossiersToWC(
  supabase: any, cfg: WCConfig, dossiers: any[],
  opts: { unpublish?: boolean; productStatus?: string; actionLabel?: string } = {}
) {
  const { unpublish = false, productStatus = 'publish', actionLabel = unpublish ? 'unpublish' : 'publish' } = opts;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
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

    try {
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
      await updateHclPublicationStatus(supabase, dossier.id,
        success ? (unpublish ? 'deleted' : 'published') : 'failed',
        success ? null : `WooCommerce ${result.status}: ${result.text.slice(0, 300)}`,
        {
          sku: dossier.dossier_number,
          action: actionLabel,
          product_id: result.json?.id ?? existingProduct?.id ?? null,
          product_url: result.json?.permalink ?? null,
          photo_count: photos?.length ?? 0,
          product_status: unpublish ? 'draft' : productStatus,
        });

      results.push({
        dossier: dossier.dossier_number,
        success,
        productId: result.json?.id ?? existingProduct?.id ?? null,
        status: result.status,
        ...(success ? {} : { error: result.text.slice(0, 300) }),
      });
    } catch (err: any) {
      await updateHclPublicationStatus(supabase, dossier.id, 'failed', err.message, {
        sku: dossier.dossier_number, action: actionLabel,
      });
      results.push({ dossier: dossier.dossier_number, success: false, error: err.message });
    }
  }

  return results;
}
