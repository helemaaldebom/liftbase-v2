import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  openSession, closeSession, buildProductXML, buildDeleteXML, wrapProducts,
  importData, importImages, fetchMachineData, updateMascusPublicationStatus,
  DETAILS_TABLE, photoFingerprint,
} from "../_shared/mascus.ts";

// Dagelijkse Mascus-sync (per product; geen totaalvervanger):
// - vinkje aan + actieve status  -> create/update (visibilitybyte=1)
// - eerder gepubliceerd, vinkje uit of verkocht/gearchiveerd -> delete
// Aanroep: cron met Authorization: Bearer <CRON_SECRET>.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (!cronSecret || req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
      throw new Error('Niet geautoriseerd (CRON_SECRET)');
    }
    const orgId = Deno.env.get('MASCUS_ORG_ID');
    if (!orgId) throw new Error('MASCUS_ORG_ID ontbreekt');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const OFFLINE_STATUSES = ['sold', 'archived'];

    const { data: flagged, error } = await supabase
      .from('dossiers').select('*')
      .eq('publish_to_mascus', true)
      .eq('is_marktdata', false)
      .not('status', 'in', `(${OFFLINE_STATUSES.join(',')})`)
      .in('equipment_type', Object.keys(DETAILS_TABLE));
    if (error) throw new Error(`Dossiers ophalen mislukt: ${error.message}`);
    const flaggedIds = new Set((flagged ?? []).map((d: any) => d.id));

    const { data: published } = await supabase
      .from('advertisement_publications')
      .select('dossier_id, metadata')
      .eq('platform', 'mascus')
      .eq('status', 'published');
    const vorigeFp = new Map((published ?? []).map((p: any) => [p.dossier_id, p.metadata?.photo_fingerprint]));
    const staleIds = (published ?? [])
      .map((p: any) => p.dossier_id)
      .filter((id: string) => !flaggedIds.has(id));
    let stale: any[] = [];
    if (staleIds.length) {
      const { data } = await supabase.from('dossiers').select('*').in('id', staleIds);
      stale = data ?? [];
    }

    if (!flagged?.length && !stale.length) {
      return new Response(JSON.stringify({ success: true, melding: 'niets te syncen' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const machines = await fetchMachineData(supabase, flagged ?? []);
    const sessionId = await openSession();
    let publishMeldingen: string[] = [], deleteMeldingen: string[] = [];
    const fotoResultaten: Record<string, string | null> = {};
    try {
      if (machines.length) {
        publishMeldingen = await importData(sessionId, wrapProducts(
          machines.map((m) => buildProductXML(orgId, m.dossier, m.details))
        ));
        const dataOk = !publishMeldingen.some((m) => /error|fail/i.test(m));
        for (const m of machines) {
          const fp = photoFingerprint(m.photos);
          // Foto's overslaan als de set ongewijzigd is sinds de vorige
          // publicatie — Mascus hoeft ze dan niet elke nacht opnieuw op te halen
          const fotosOngewijzigd = vorigeFp.get(m.dossier.id) === fp;
          let fotoMelding: string | null = null;
          if (dataOk && m.photos.length && !fotosOngewijzigd) {
            const urls = m.photos.map((p: any) => `${supabaseUrl}/storage/v1/object/public/dossier-photos/${p.storage_path}`);
            try { fotoMelding = await importImages(sessionId, orgId, m.dossier.dossier_number, urls); }
            catch (e: any) { fotoMelding = `FOUT: ${e.message}`; }
          }
          fotoResultaten[m.dossier.dossier_number] = fotosOngewijzigd ? 'overgeslagen (ongewijzigd)' : fotoMelding;
          const ok = dataOk && (!fotoMelding || /imported/i.test(fotoMelding));
          await updateMascusPublicationStatus(supabase, m.dossier.id, ok ? 'published' : 'failed',
            ok ? null : [publishMeldingen.join(' | '), fotoMelding].filter(Boolean).join(' | ').slice(0, 300),
            { action: 'sync-publish', photo_count: m.photos.length, foto_melding: fotoResultaten[m.dossier.dossier_number],
              photo_fingerprint: ok ? fp : vorigeFp.get(m.dossier.id) ?? null });
        }
      }
      if (stale.length) {
        deleteMeldingen = await importData(sessionId, buildDeleteXML(orgId, stale.map((d: any) => d.dossier_number)));
        const ok = !deleteMeldingen.some((m) => /error|fail/i.test(m));
        for (const d of stale) {
          await updateMascusPublicationStatus(supabase, d.id, ok ? 'deleted' : 'failed',
            ok ? null : deleteMeldingen.join(' | ').slice(0, 300), { action: 'sync-delete' });
        }
      }
    } finally { await closeSession(sessionId); }

    const summary = {
      success: ![...publishMeldingen, ...deleteMeldingen].some((m) => /error|fail/i.test(m)),
      gepubliceerd: machines.length,
      verwijderd: stale.length,
      publishMeldingen: publishMeldingen.slice(0, 10),
      deleteMeldingen: deleteMeldingen.slice(0, 10),
      timestamp: new Date().toISOString(),
    };
    console.log('Daily Mascus sync klaar:', JSON.stringify(summary));
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Fout in daily-mascus-sync:', error);
    return new Response(JSON.stringify({ error: error.message || 'Onbekende fout' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
