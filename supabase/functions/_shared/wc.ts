// Gedeelde WooCommerce-logica (heavycargolifters.com)
// Gebruikt door publish-to-hcl-website en daily-hcl-sync.

import { externeTekst, photoFingerprint } from "./extern.ts";
export { photoFingerprint };

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
  // Serienummer NIET op de website (besluit Tigran 15-09, net als bij Truck1)
  return attrs;
}

export function buildProductPayload(dossier: any, details: any, photos: any[], supabaseUrl: string, categoryId: number | null, productStatus: string) {
  const title = [dossier.brand || dossier.merk, dossier.model || dossier.type].filter(Boolean).join(' ') || dossier.title || dossier.dossier_number;
  return {
    name: title,
    type: 'simple',
    sku: dossier.dossier_number,
    status: productStatus,
    // GEEN prijzen op de website (regel Tigran 14-09: prijzen zijn intern).
    // Lege string wist ook bestaande prijzen bij een update.
    regular_price: '',
    // UITSLUITREGEL 16-09: alleen whitelisted externe tekst (zie extern.ts),
    // nooit dossier.description of interne remarks
    description: externeTekst(dossier, details),
    short_description: '',
    categories: categoryId ? [{ id: categoryId }] : [],
    images: photos.map((p, i) => ({
      src: `${supabaseUrl}/storage/v1/object/public/dossier-photos/${p.storage_path}`,
      position: i,
    })),
    attributes: buildAttributes(dossier, details),
    meta_data: [
      { key: 'liftbase_dossier_number', value: dossier.dossier_number },
      // Vingerafdruk van de fotoset: hiermee ziet de sync of de foto's al
      // op het product staan, zodat ze niet elke keer opnieuw geüpload
      // worden (fix 16-09: dagelijkse sync maakte duplicaten -> schijf vol)
      { key: 'liftbase_photo_paths', value: photoFingerprint(photos) },
    ],
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

  // Foto's worden NIET meer in deze functie geüpload (fix 22-09): dat werk
  // duurt langer dan de achtergrondtaak-limiet van edge functions en
  // sneuvelde halverwege. De producten krijgen status 'pending' en de
  // hcl-photo-worker (aparte functie met zelf-herinvocatie) werkt ze één
  // voor één af, hervattend waar hij gebleven was.
  let fotoWerkNodig = false;

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

    let fotosOngewijzigd = false;
    try {
      // status=any: vind ook concepten (voorkomt "SKU al aanwezig"-fouten)
      const existing = await wcFetch(cfg, `/products?sku=${encodeURIComponent(dossier.dossier_number)}&status=any`);
      let existingProduct = (existing.json ?? [])[0];

      // Restanten in de prullenbak blokkeren de SKU maar zijn onvindbaar via
      // status=any — die ruimen we definitief op voordat we opnieuw aanmaken.
      if (!existingProduct && !unpublish) {
        const trashed = await wcFetch(cfg, `/products?sku=${encodeURIComponent(dossier.dossier_number)}&status=trash`);
        const trashedProduct = (trashed.json ?? [])[0];
        if (trashedProduct) {
          console.log(`Prullenbak-restant voor ${dossier.dossier_number} (id ${trashedProduct.id}) definitief verwijderen`);
          await wcFetch(cfg, `/products/${trashedProduct.id}?force=true`, { method: 'DELETE' });
        }
      }

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
        const allPhotos = photos ?? [];

        // Foto's alleen uploaden als de set gewijzigd is (fix 16-09): de
        // vingerafdruk in het product vertelt welke foto's er al op staan.
        // Zo maakt de dagelijkse sync geen duplicaten meer in de mediabieb.
        // 'liftbase_photos_done' wordt pas gezet als een fotoset VOLLEDIG op
        // het product staat (door hcl-photo-worker) — half gelukte uploads
        // tellen dus niet als "ongewijzigd".
        const vorigeFingerprint = (existingProduct?.meta_data ?? [])
          .find((m: any) => m.key === 'liftbase_photos_done')?.value ?? null;
        fotosOngewijzigd = !!existingProduct
          && vorigeFingerprint === photoFingerprint(allPhotos)
          && (existingProduct.images?.length ?? 0) > 0;

        // Foto's gescheiden van het product: de site is traag en valt in een
        // timeout zodra er foto's in de eerste request zitten. Het product
        // wordt hier zonder foto's aangemaakt/bijgewerkt; de foto's zelf doet
        // de hcl-photo-worker daarna (status 'pending' tot die klaar is).
        const payload: any = buildProductPayload(dossier, details, allPhotos, supabaseUrl, categoryId, productStatus);
        // NOOIT bestaande productfoto's wissen (harde regel 23-09): het
        // images-veld gaat niet mee, dus wat er staat blijft staan. De
        // hcl-photo-worker vervangt de set pas NADAT de nieuwe foto's er
        // volledig naast staan (add-first, dan atomisch omwisselen).
        delete payload.images;
        result = existingProduct
          ? await wcFetch(cfg, `/products/${existingProduct.id}`, { method: 'PUT', body: JSON.stringify(payload) })
          : await wcFetch(cfg, '/products', { method: 'POST', body: JSON.stringify(payload) });

        if (result.ok && allPhotos.length > 0 && !fotosOngewijzigd) {
          fotoWerkNodig = true;
        }
      }

      // Anti-dubbel: oude producten (zonder dossiernummer-SKU) van dezelfde
      // machine naar de prullenbak, zodat de Liftbase-versie de enige is.
      const legacyOpgeruimd: string[] = [];
      if (result.ok && !unpublish) {
        try {
          const naam = [dossier.brand || dossier.merk, dossier.model || dossier.type].filter(Boolean).join(' ').trim();
          const jaar = String(dossier.year || dossier.bouwjaar || '');
          if (naam) {
            const zoek = await wcFetch(cfg, `/products?search=${encodeURIComponent(naam)}&per_page=20&status=any`);
            const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
            for (const p of (zoek.json ?? [])) {
              const isLegacy = !String(p.sku || '').toUpperCase().startsWith('HCL');
              const zelfdeNaam = norm(p.name || '') === norm(naam);
              if (!isLegacy || !zelfdeNaam || p.id === (result.json?.id ?? existingProduct?.id)) continue;
              // bouwjaar vergelijken indien het oude product er een heeft
              const jaarAttr = (p.attributes ?? []).find((a: any) => /jaar/i.test(a.name || ''));
              const oudJaar = jaarAttr?.options?.[0] ? String(jaarAttr.options[0]).trim() : null;
              if (oudJaar && jaar && oudJaar !== jaar) continue;
              const del = await wcFetch(cfg, `/products/${p.id}`, { method: 'DELETE' }); // zonder force => prullenbak
              if (del.ok) legacyOpgeruimd.push(`${p.name} (id ${p.id}, sku ${p.sku || '-'})`);
            }
          }
        } catch (e: any) {
          console.error(`Legacy-opruiming ${dossier.dossier_number} mislukt:`, e.message);
        }
      }

      const success = result.ok;
      const fotoUploadLoopt = success && !unpublish && (photos?.length ?? 0) > 0 && !fotosOngewijzigd;
      await updateHclPublicationStatus(supabase, dossier.id,
        // Bij lopende achtergrond-fotoupload: 'pending'; de taak zet hem
        // daarna zelf op published/failed.
        success ? (unpublish ? 'deleted' : (fotoUploadLoopt ? 'pending' : 'published')) : 'failed',
        success ? null : `WooCommerce ${result.status}: ${result.text.slice(0, 300)}`,
        {
          sku: dossier.dossier_number,
          action: actionLabel,
          product_id: result.json?.id ?? existingProduct?.id ?? null,
          product_url: result.json?.permalink ?? null,
          photo_count: photos?.length ?? 0,
          product_status: unpublish ? 'draft' : productStatus,
          legacy_opgeruimd: legacyOpgeruimd.length ? legacyOpgeruimd : undefined,
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

  // Foto-worker aftrappen (één keer per run); die werkt alle 'pending'
  // producten één voor één af en roept zichzelf opnieuw aan tot alles klaar is.
  if (fotoWerkNodig) {
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (cronSecret) {
      const kickoff = fetch(`${supabaseUrl}/functions/v1/hcl-photo-worker`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cronSecret}` },
      }).catch((e) => console.error('Foto-worker kickoff mislukt:', e?.message));
      if (typeof EdgeRuntime !== 'undefined' && (EdgeRuntime as any)?.waitUntil) {
        (EdgeRuntime as any).waitUntil(kickoff);
      } else {
        await kickoff;
      }
    } else {
      console.error('CRON_SECRET ontbreekt — foto-worker niet gestart');
    }
  }

  return results;
}
