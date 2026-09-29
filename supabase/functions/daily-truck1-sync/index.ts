import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  buildAdPayload, sendToTruck1, fetchMachineData,
  updateTruck1PublicationStatus, DETAILS_TABLE, photoFingerprint,
} from "../_shared/truck1.ts";

// Dagelijkse Truck1-sync:
// - publiceert/actualiseert dossiers met publish_to_truck1=true (niet sold/archived)
// - verwijdert advertenties van uitgevinkte/verkochte/gearchiveerde dossiers
// Aanroep: cron met Authorization: Bearer <CRON_SECRET>.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OFFLINE_STATUSES = ['sold', 'archived'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (!cronSecret || req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
      throw new Error('Niet geautoriseerd (CRON_SECRET)');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    const { data: toPublish, error: pubError } = await supabase
      .from('dossiers')
      .select('*')
      .eq('publish_to_truck1', true)
      .eq('is_marktdata', false)
      .not('status', 'in', `(${OFFLINE_STATUSES.join(',')})`)
      .in('equipment_type', Object.keys(DETAILS_TABLE));
    if (pubError) throw new Error(`Dossiers ophalen mislukt: ${pubError.message}`);

    const { data: published } = await supabase
      .from('advertisement_publications')
      .select('dossier_id, metadata')
      .eq('platform', 'truck1')
      .eq('status', 'published');
    // vingerafdruk van de fotoset zoals die eerder naar Truck1 ging
    const vorigeFp = new Map((published ?? []).map((p: any) => [p.dossier_id, p.metadata?.photo_fingerprint]));

    let toUnpublish: any[] = [];
    if (published?.length) {
      const { data: pubDossiers } = await supabase
        .from('dossiers')
        .select('*')
        .in('id', published.map((p: any) => p.dossier_id));
      toUnpublish = (pubDossiers ?? []).filter((d: any) =>
        !d.publish_to_truck1 || OFFLINE_STATUSES.includes(d.status)
      );
    }

    if (!toPublish?.length && !toUnpublish.length) {
      return new Response(JSON.stringify({ success: true, published: { count: 0 }, unpublished: { count: 0 } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Eén gecombineerde aanroep: adds/updates + deletes samen
    const publishData = await fetchMachineData(supabase, toPublish ?? []);
    const unpublishData = await fetchMachineData(supabase, toUnpublish);

    const alreadyPublished = new Set((published ?? []).map((p: any) => p.dossier_id));
    const ads: Record<string, unknown> = {};
    for (const item of publishData) {
      const isUpdate = alreadyPublished.has(item.dossier.id);
      // Foto's overslaan als de set ongewijzigd is sinds de vorige publicatie
      // (Truck1 laat bestaande foto's dan staan) — scheelt elke nacht het
      // opnieuw ophalen van honderden foto's.
      const skipImages = isUpdate && vorigeFp.get(item.dossier.id) === photoFingerprint(item.photos);
      ads[item.dossier.dossier_number] = {
        action: isUpdate ? 'update' : 'add',
        ...buildAdPayload(item.dossier, item.details, item.photos, supabaseUrl, { skipImages }),
      };
    }
    for (const item of unpublishData) {
      ads[item.dossier.dossier_number] = { action: 'delete' };
    }

    const result = await sendToTruck1(ads);

    for (const item of publishData) {
      await updateTruck1PublicationStatus(supabase, item.dossier.id,
        result.ok ? 'published' : 'failed',
        result.ok ? null : (result.busy ? 'Truck1 API bezet' : JSON.stringify(result.errors).slice(0, 300)),
        { imp_id: item.dossier.dossier_number, action: 'sync-publish', summary: result.summary, photo_count: item.photos.length, photo_fingerprint: result.ok ? photoFingerprint(item.photos) : vorigeFp.get(item.dossier.id) ?? null });
    }
    for (const item of unpublishData) {
      await updateTruck1PublicationStatus(supabase, item.dossier.id,
        result.ok ? 'deleted' : 'failed',
        result.ok ? null : (result.busy ? 'Truck1 API bezet' : JSON.stringify(result.errors).slice(0, 300)),
        { imp_id: item.dossier.dossier_number, action: 'sync-unpublish', summary: result.summary });
    }

    const summary = {
      success: result.ok,
      published: { count: publishData.length },
      unpublished: { count: unpublishData.length },
      truck1Summary: result.summary,
      timestamp: new Date().toISOString(),
    };
    console.log('Daily Truck1 sync klaar:', JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Fout in daily-truck1-sync:', error);
    return new Response(JSON.stringify({ error: error.message || 'Onbekende fout' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
