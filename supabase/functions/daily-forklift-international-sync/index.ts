import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  DATA_ENDPOINT, IMAGE_ENDPOINT,
  generateDataXML, generateImageXML, uploadXML,
  fetchCompleteFiSet, updatePublicationStatus, toInternalNo,
} from "../_shared/fi.ts";

// Dagelijkse Forklift International-sync.
// LET OP: de F.I.-import is een totaalvervanger — elke upload bevat daarom
// de COMPLETE voorraad in één lijst: aangevinkte actieve machines zichtbaar,
// eerder gepubliceerde maar uitgevinkte/verkochte machines als onzichtbaar.
// Aanroep: cron met Authorization: Bearer <CRON_SECRET>.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
      throw new Error('F.I.-secrets ontbreken');
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    const fullSet = await fetchCompleteFiSet(supabase);
    if (!fullSet.length) {
      return new Response(JSON.stringify({ success: true, machineCount: 0, melding: 'geen machines aangevinkt — niets geüpload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dataResult = await uploadXML(DATA_ENDPOINT, generateDataXML(machinelistCode, fullSet), fiUsername, fiPassword);
    let imageResult: Awaited<ReturnType<typeof uploadXML>> | null = null;
    if (dataResult.ok) {
      imageResult = await uploadXML(IMAGE_ENDPOINT, generateImageXML(machinelistCode, fullSet, supabaseUrl), fiUsername, fiPassword);
    }
    const success = dataResult.ok && imageResult?.ok !== false;

    for (const item of fullSet) {
      await updatePublicationStatus(
        supabase, item.dossier.id,
        success ? (item.visible === false ? 'deleted' : 'published') : 'failed',
        success ? null : `Sync: ${dataResult.status} ${dataResult.body.slice(0, 300)}`,
        {
          internalno: toInternalNo(item.dossier.dossier_number),
          action: item.visible === false ? 'sync-offline-in-fullset' : 'sync-publish-fullset',
          data_response: dataResult.body.slice(0, 500),
          photo_count: item.photos.length,
        }
      );
    }

    const summary = {
      success,
      machineCount: fullSet.length,
      zichtbaar: fullSet.filter((m) => m.visible !== false).length,
      offline: fullSet.filter((m) => m.visible === false).length,
      dataStatus: dataResult.status,
      timestamp: new Date().toISOString(),
    };
    console.log('Daily FI sync klaar:', JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
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
