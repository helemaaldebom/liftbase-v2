import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { wcConfigFromEnv, wcFetch, photoFingerprint, updateHclPublicationStatus } from "../_shared/wc.ts";

// Foto-worker voor de HCL-website (fix 22-09).
// Achtergrondtaken van een edge function worden na ±400s afgekapt; daarom
// werkt deze worker met een TIJDSBUDGET per aanroep en roept hij zichzelf
// opnieuw aan zolang er 'pending' publicaties zijn. Per product hervat hij
// waar hij gebleven was (de foto's die al op het product staan tellen als
// voortgang), dus een afgebroken run kost nooit werk.
// Auth: Authorization: Bearer <CRON_SECRET>. Deploy met --no-verify-jwt.

// Krap budget: één trage foto-PUT kan zelf al minuten hangen, en de harde
// kill van de runtime (±400s) moet ALTIJD ná onze afronding + herinvocatie
// vallen — anders stopt de keten (dat gebeurde op 22-09 om 18:11).
const BUDGET_MS = 150_000;
const CALL_TIMEOUT_MS = 90_000; // max per WooCommerce-verzoek
const BATCH = 4;

Deno.serve(async (req: Request) => {
  try {
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (!cronSecret || req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Niet geautoriseerd' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const cfg = wcConfigFromEnv();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const start = Date.now();

    // Kandidaten: oudste pending eerst. Claim optimistisch (conditional op
    // last_synced_at) zodat twee parallelle workers niet hetzelfde product
    // oppakken.
    const { data: kandidaten } = await supabase
      .from('advertisement_publications')
      .select('id, dossier_id, last_synced_at, metadata')
      .eq('platform', 'hcl')
      .eq('status', 'pending')
      .order('last_synced_at', { ascending: true })
      .limit(5);

    let claim: any = null;
    for (const k of (kandidaten ?? [])) {
      if (!k.metadata?.product_id) continue;
      const { data: geclaimd } = await supabase
        .from('advertisement_publications')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', k.id)
        .eq('last_synced_at', k.last_synced_at)
        .select('id');
      if (geclaimd?.length) { claim = k; break; }
    }

    if (!claim) {
      return new Response(JSON.stringify({ klaar: true, melding: 'geen pending publicaties' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: dossier } = await supabase
      .from('dossiers').select('*').eq('id', claim.dossier_id).single();
    const { data: photos } = await supabase
      .from('photos').select('*')
      .eq('dossier_id', claim.dossier_id)
      .eq('visible_online', true)
      .order('display_order', { ascending: true });
    const alle = photos ?? [];
    const productId = claim.metadata.product_id;

    // ADD-FIRST-STRATEGIE (harde regel 23-09: bestaande foto's nooit wissen):
    // 1) match gewenste foto's op bestandsnaam met wat er al op het product
    //    staat (hergebruik — niets dubbel uploaden)
    // 2) ontbrekende foto's worden ERBIJ geüpload (append; niets verdwijnt)
    // 3) pas als de volledige gewenste set aanwezig is, wisselt één laatste
    //    update de fotolijst atomisch om naar de juiste set + volgorde.
    // Mislukt er iets halverwege, dan staan de oude foto's er dus gewoon nog.
    const prod = await wcFetch(cfg, `/products/${productId}`);
    if (!prod.ok) throw new Error(`Product ${productId} ophalen mislukt: ${prod.status}`);
    let wpImages: { id: number; src: string }[] = (prod.json?.images ?? []).map((img: any) => ({ id: img.id, src: img.src }));

    const norm = (s: string) => (s.split('/').pop() ?? '')
      .replace(/-scaled/i, '').replace(/\.(jpe?g|png|webp)$/i, '');
    const vindMatch = (base: string) => wpImages.find((img) => {
      const wpBase = norm(img.src);
      return wpBase === base || wpBase.startsWith(base + '-');
    });

    let fout: string | null = null;
    const gewensteIds: (number | null)[] = alle.map((p: any) => vindMatch(norm(p.storage_path))?.id ?? null);

    for (let i = 0; i < alle.length; i += BATCH) {
      if (Date.now() - start > BUDGET_MS) break; // budget op: volgende run maakt af
      const batchIdx = [];
      for (let j = i; j < Math.min(i + BATCH, alle.length); j++) {
        if (gewensteIds[j] === null) batchIdx.push(j);
      }
      if (!batchIdx.length) continue; // alles in deze batch al aanwezig
      const nieuwe = batchIdx.map((j) => ({
        src: `${supabaseUrl}/storage/v1/object/public/dossier-photos/${alle[j].storage_path}`,
      }));
      let res;
      try {
        res = await wcFetch(cfg, `/products/${productId}`, {
          // append: bestaande ids + nieuwe srcs — er verdwijnt niets
          method: 'PUT', body: JSON.stringify({ images: [...wpImages.map((x) => ({ id: x.id })), ...nieuwe] }),
          signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
        });
      } catch {
        break; // timeout/netwerkhapering: geen fout — volgende run hervat hier
      }
      if (!res.ok) {
        fout = `Fotobatch ${Math.floor(i / BATCH) + 1}: ${res.status} ${res.text.slice(0, 150)}`;
        break;
      }
      wpImages = (res.json?.images ?? []).map((img: any) => ({ id: img.id, src: img.src }));
      for (const j of batchIdx) gewensteIds[j] = vindMatch(norm(alle[j].storage_path))?.id ?? null;
    }

    let klaar = !fout && gewensteIds.every((id) => id !== null);
    if (klaar && alle.length) {
      // atomische omwisseling naar exact de gewenste set + volgorde
      try {
        const wissel = await wcFetch(cfg, `/products/${productId}`, {
          method: 'PUT', body: JSON.stringify({ images: gewensteIds.map((id) => ({ id })) }),
          signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
        });
        if (!wissel.ok) klaar = false;
      } catch { klaar = false; }
    }
    if (fout) {
      await updateHclPublicationStatus(supabase, claim.dossier_id, 'failed', fout, {
        ...claim.metadata, photo_count: gewensteIds.filter((id) => id !== null).length,
      });
    } else if (klaar) {
      // markering op het product: deze fotoset staat er volledig op
      await wcFetch(cfg, `/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ meta_data: [{ key: 'liftbase_photos_done', value: photoFingerprint(alle) }] }),
      });
      await updateHclPublicationStatus(supabase, claim.dossier_id, 'published', null, {
        ...claim.metadata, photo_count: alle.length,
      });
    }
    // niet klaar en geen fout -> blijft pending; volgende run hervat

    // Nog werk? Roep onszelf opnieuw aan (fire-and-forget).
    const { count } = await supabase
      .from('advertisement_publications')
      .select('id', { count: 'exact', head: true })
      .eq('platform', 'hcl').eq('status', 'pending');
    const nogWerk = (count ?? 0) > 0;
    if (nogWerk) {
      const vervolg = fetch(`${supabaseUrl}/functions/v1/hcl-photo-worker`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cronSecret}` },
      }).catch(() => {});
      if (typeof EdgeRuntime !== 'undefined' && (EdgeRuntime as any)?.waitUntil) {
        (EdgeRuntime as any).waitUntil(vervolg);
      }
    }

    const summary = {
      dossier: dossier?.dossier_number, productId,
      fotosOpProduct: gewensteIds.filter((id) => id !== null).length, fotosTotaal: alle.length,
      klaar, fout, nogPending: count ?? 0,
    };
    console.log('hcl-photo-worker:', JSON.stringify(summary));
    return new Response(JSON.stringify(summary), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Fout in hcl-photo-worker:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
});
