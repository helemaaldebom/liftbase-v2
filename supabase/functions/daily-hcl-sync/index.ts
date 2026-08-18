import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { wcConfigFromEnv, processDossiersToWC, DETAILS_TABLE } from "../_shared/wc.ts";

// Dagelijkse sync eigen website (heavycargolifters.com):
// - publiceert/actualiseert dossiers met publish_to_hcl=true (niet sold/archived)
// - zet producten op concept voor dossiers die uitgevinkt/verkocht/gearchiveerd zijn
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

    const cfg = wcConfigFromEnv();
    if (!cfg.key || !cfg.secret) throw new Error('WooCommerce-secrets ontbreken');

    // Te publiceren
    const { data: toPublish, error: pubError } = await supabase
      .from('dossiers')
      .select('*')
      .eq('publish_to_hcl', true)
      .eq('is_marktdata', false)
      .not('status', 'in', `(${OFFLINE_STATUSES.join(',')})`)
      .in('equipment_type', Object.keys(DETAILS_TABLE));
    if (pubError) throw new Error(`Dossiers ophalen mislukt: ${pubError.message}`);

    // Offline te halen (naar concept)
    const { data: published } = await supabase
      .from('advertisement_publications')
      .select('dossier_id')
      .eq('platform', 'hcl')
      .eq('status', 'published');

    let toUnpublish: any[] = [];
    if (published?.length) {
      const { data: pubDossiers } = await supabase
        .from('dossiers')
        .select('*')
        .in('id', published.map((p: any) => p.dossier_id));
      toUnpublish = (pubDossiers ?? []).filter((d: any) =>
        !d.publish_to_hcl || OFFLINE_STATUSES.includes(d.status)
      );
    }

    const publishResults = toPublish?.length
      ? await processDossiersToWC(supabase, cfg, toPublish, { actionLabel: 'sync-publish' })
      : [];
    const unpublishResults = toUnpublish.length
      ? await processDossiersToWC(supabase, cfg, toUnpublish, { unpublish: true, actionLabel: 'sync-unpublish' })
      : [];

    const summary = {
      success: [...publishResults, ...unpublishResults].every((r) => r.success !== false),
      published: { count: publishResults.length, failed: publishResults.filter((r) => !r.success).length },
      unpublished: { count: unpublishResults.length, failed: unpublishResults.filter((r) => !r.success).length },
      timestamp: new Date().toISOString(),
    };
    console.log('Daily HCL sync klaar:', JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Fout in daily-hcl-sync:', error);
    return new Response(JSON.stringify({ error: error.message || 'Onbekende fout' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
