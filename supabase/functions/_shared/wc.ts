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
    // GEEN prijzen op de website (regel Tigran 14-09: prijzen zijn intern).
    // Lege string wist ook bestaande prijzen bij een update.
    regular_price: '',
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

        // Foto's gescheiden van het product: de site is traag en valt in een
        // timeout zodra er foto's in de eerste request zitten. Dus: product
        // eerst zonder foto's aanmaken/bijwerken, daarna foto's in mini-porties.
        const BATCH = 4;
        const payload = buildProductPayload(dossier, details, [], supabaseUrl, categoryId, productStatus);
        result = existingProduct
          ? await wcFetch(cfg, `/products/${existingProduct.id}`, { method: 'PUT', body: JSON.stringify(payload) })
          : await wcFetch(cfg, '/products', { method: 'POST', body: JSON.stringify(payload) });

        if (result.ok && allPhotos.length > 0) {
          const productId = result.json?.id ?? existingProduct?.id;
          const startImages = (result.json?.images ?? []).map((img: any) => ({ id: img.id }));

          // De site is traag: alle fotobatches samen duren langer dan de
          // request-limiet van de edge function. Daarom draait de foto-upload
          // als achtergrondtaak door nadat de functie al geantwoord heeft;
          // de publicatiestatus wordt aan het einde daarvan bijgewerkt.
          const fotoTaak = async () => {
            let bestaande = startImages;
            let fout: string | null = null;
            for (let i = 0; i < allPhotos.length && productId; i += BATCH) {
              const nieuwe = allPhotos.slice(i, i + BATCH).map((p, idx) => ({
                src: `${supabaseUrl}/storage/v1/object/public/dossier-photos/${p.storage_path}`,
                position: i + idx,
              }));
              const batchResult = await wcFetch(cfg, `/products/${productId}`, {
                method: 'PUT', body: JSON.stringify({ images: [...bestaande, ...nieuwe] }),
              });
              if (!batchResult.ok) {
                fout = `Fotobatch ${Math.floor(i / BATCH) + 1}: ${batchResult.status} ${batchResult.text.slice(0, 150)}`;
                console.error(`${dossier.dossier_number}: ${fout}`);
                break;
              }
              bestaande = (batchResult.json?.images ?? []).map((img: any) => ({ id: img.id }));
            }
            await updateHclPublicationStatus(supabase, dossier.id,
              fout ? 'failed' : 'published',
              fout,
              {
                sku: dossier.dossier_number,
                action: actionLabel,
                product_id: productId,
                photo_count: fout ? bestaande.length : allPhotos.length,
                product_status: productStatus,
              });
            console.log(`${dossier.dossier_number}: foto-upload klaar (${fout ? 'MET FOUT' : 'ok'})`);
          };

          if (typeof EdgeRuntime !== 'undefined' && (EdgeRuntime as any)?.waitUntil) {
            (EdgeRuntime as any).waitUntil(fotoTaak());
          } else {
            await fotoTaak();
          }
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
      const fotoUploadLoopt = success && !unpublish && (photos?.length ?? 0) > 0;
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

  return results;
}
