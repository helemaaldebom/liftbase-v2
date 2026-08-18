import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  DATA_ENDPOINT, IMAGE_ENDPOINT,
  generateDataXML, generateImageXML, uploadXML,
  fetchMachineData, updatePublicationStatus, DETAILS_TABLE, toInternalNo,
} from "../_shared/fi.ts";

// Dagelijkse Forklift International-sync:
// 1. Publiceert/actualiseert alle dossiers met publish_to_forklift_international=true
//    die niet verkocht/gearchiveerd zijn.
// 2. Haalt advertenties offline (viewforklift=0) waarvan het vinkje uit is gezet
//    of waarvan het dossier op sold/archived staat.
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

    const machinelistCode = Deno.env.get('FI_MACHINELIST_CODE');
    const fiUsername = Deno.env.get('FI_USERNAME');
    const fiPassword = Deno.env.get('FI_PASSWORD');
    if (!machinelistCode || !fiUsername || !fiPassword) {
      throw new Error('F.I.-secrets ontbreken (FI_MACHINELIST_CODE, FI_USERNAME, FI_PASSWORD)');
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    // 1. Te publiceren: vinkje aan, niet verkocht/gearchiveerd, geen marktdata
    const { data: toPublish, error: pubError } = await supabase
      .from('dossiers')
      .select('*')
      .eq('publish_to_forklift_international', true)
      .eq('is_marktdata', false)
      .not('status', 'in', `(${OFFLINE_STATUSES.join(',')})`)
      .in('equipment_type', Object.keys(DETAILS_TABLE));
    if (pubError) throw new Error(`Dossiers ophalen mislukt: ${pubError.message}`);

    // 2. Offline te halen: eerder gepubliceerd, maar vinkje uit of status sold/archived
    const { data: published } = await supabase
      .from('advertisement_publications')
      .select('dossier_id')
      .eq('platform', 'forklift_international')
      .eq('status', 'published');

    let toUnpublish: any[] = [];
    if (published?.length) {
      const { data: pubDossiers } = await supabase
        .from('dossiers')
        .select('*')
        .in('id', published.map((p: any) => p.dossier_id));
      toUnpublish = (pubDossiers ?? []).filter((d: any) =>
        !d.publish_to_forklift_international || OFFLINE_STATUSES.includes(d.status)
      );
    }

    const results: Record<string, unknown> = {};

    // Publiceren/updaten
    if (toPublish?.length) {
      const machineData = await fetchMachineData(supabase, toPublish);
      const dataResult = await uploadXML(DATA_ENDPOINT, generateDataXML(machinelistCode, machineData), fiUsername, fiPassword);
      let imageResult = null;
      if (dataResult.ok) {
        imageResult = await uploadXML(IMAGE_ENDPOINT, generateImageXML(machinelistCode, machineData, supabaseUrl), fiUsername, fiPassword);
      }
      const success = dataResult.ok && imageResult?.ok !== false;
      for (const item of machineData) {
        await updatePublicationStatus(supabase, item.dossier.id,
          success ? 'published' : 'failed',
          success ? null : `Sync: ${dataResult.status} ${dataResult.body.slice(0, 300)}`,
          {
            internalno: toInternalNo(item.dossier.dossier_number),
            action: 'sync-publish',
            data_response: dataResult.body.slice(0, 1000),
            photo_count: item.photos.length,
          });
      }
      results.published = { count: machineData.length, ok: success, dataStatus: dataResult.status };
    } else {
      results.published = { count: 0 };
    }

    // Offline halen
    if (toUnpublish.length) {
      const machineData = await fetchMachineData(supabase, toUnpublish);
      const dataResult = await uploadXML(DATA_ENDPOINT, generateDataXML(machinelistCode, machineData, { unpublish: true }), fiUsername, fiPassword);
      for (const item of machineData) {
        await updatePublicationStatus(supabase, item.dossier.id,
          dataResult.ok ? 'deleted' : 'failed',
          dataResult.ok ? null : `Unpublish: ${dataResult.status} ${dataResult.body.slice(0, 300)}`,
          {
            internalno: toInternalNo(item.dossier.dossier_number),
            action: 'sync-unpublish',
            data_response: dataResult.body.slice(0, 1000),
          });
      }
      results.unpublished = { count: machineData.length, ok: dataResult.ok, dataStatus: dataResult.status };
    } else {
      results.unpublished = { count: 0 };
    }

    console.log('Daily FI sync klaar:', JSON.stringify(results));
    return new Response(JSON.stringify({ success: true, ...results, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Fout in daily-forklift-international-sync:', error);
    return new Response(JSON.stringify({ error: error.message || 'Onbekende fout' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
