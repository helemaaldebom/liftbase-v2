import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  DATA_ENDPOINT, IMAGE_ENDPOINT,
  generateDataXML, generateImageXML, uploadXML,
  fetchCompleteFiSet, updatePublicationStatus, toInternalNo,
} from "../_shared/fi.ts";

// Publiceren/offline halen op Forklift International (alleen managers).
// LET OP: de F.I.-import is een totaalvervanger. Deze functie stuurt daarom
// ALTIJD de complete voorraad (op basis van de vinkjes), ongeacht welke
// dossierIds er aangeklikt zijn. De dossierIds bepalen alleen de
// statusregistratie/melding richting de gebruiker.
// body: { dossierIds: string[], testMode?: boolean, action?: 'publish'|'unpublish' }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Geen autorisatie-header');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Niet geautoriseerd');
    const { data: profile } = await supabase
      .from('user_profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'manager') throw new Error('Alleen managers kunnen publiceren');

    const { dossierIds, testMode } = await req.json();
    if (!dossierIds?.length) throw new Error('Geen dossier-IDs opgegeven');

    const machinelistCode = Deno.env.get('FI_MACHINELIST_CODE');
    const fiUsername = Deno.env.get('FI_USERNAME');
    const fiPassword = Deno.env.get('FI_PASSWORD');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    // Altijd de complete voorraad opbouwen (vinkjes zijn leidend; een zojuist
    // uitgevinkt/verkocht dossier gaat automatisch als onzichtbaar mee)
    const fullSet = await fetchCompleteFiSet(supabase);
    if (!fullSet.length) throw new Error('Geen enkele machine heeft het F.I.-vinkje aan — niets te uploaden');

    const code = machinelistCode ?? 'ONTBREEKT';
    const dataXML = generateDataXML(code, fullSet);
    const imageXML = generateImageXML(code, fullSet, supabaseUrl);

    if (testMode) {
      return new Response(JSON.stringify({
        success: true, testMode: true,
        machineCount: fullSet.length,
        zichtbaar: fullSet.filter((m) => m.visible !== false).map((m) => m.dossier.dossier_number),
        offline: fullSet.filter((m) => m.visible === false).map((m) => m.dossier.dossier_number),
        dataXML, imageXML,
        secretsAanwezig: { FI_MACHINELIST_CODE: !!machinelistCode, FI_USERNAME: !!fiUsername, FI_PASSWORD: !!fiPassword },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!machinelistCode || !fiUsername || !fiPassword) {
      throw new Error('F.I.-secrets ontbreken in Supabase');
    }

    const dataResult = await uploadXML(DATA_ENDPOINT, dataXML, fiUsername, fiPassword);
    let imageResult: Awaited<ReturnType<typeof uploadXML>> | null = null;
    if (dataResult.ok) {
      imageResult = await uploadXML(IMAGE_ENDPOINT, imageXML, fiUsername, fiPassword);
    }
    const success = dataResult.ok && imageResult?.ok !== false;

    // Status bijwerken voor de complete set (de waarheid van deze upload)
    for (const item of fullSet) {
      await updatePublicationStatus(
        supabase, item.dossier.id,
        success ? (item.visible === false ? 'deleted' : 'published') : 'failed',
        success ? null : `Data: ${dataResult.status} (ERR: ${dataResult.errCount}) ${dataResult.body.slice(0, 300)}`,
        {
          internalno: toInternalNo(item.dossier.dossier_number),
          action: item.visible === false ? 'offline-in-fullset' : 'publish-fullset',
          data_response: dataResult.body.slice(0, 500),
          image_response: imageResult?.body?.slice(0, 500) ?? null,
          photo_count: item.photos.length,
        }
      );
    }

    return new Response(JSON.stringify({
      success,
      machineCount: fullSet.length,
      zichtbaar: fullSet.filter((m) => m.visible !== false).length,
      offline: fullSet.filter((m) => m.visible === false).length,
      dataStatus: dataResult.status,
      dataErrors: dataResult.errCount,
      imageStatus: imageResult?.status ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Fout in publish-to-forklift-international:', error);
    return new Response(JSON.stringify({ error: error.message || 'Onbekende fout' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
