import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  DATA_ENDPOINT, IMAGE_ENDPOINT,
  generateDataXML, generateImageXML, uploadXML,
  fetchMachineData, updatePublicationStatus, DETAILS_TABLE, toInternalNo,
} from "../_shared/fi.ts";

// Handmatig publiceren/offline halen van dossiers op Forklift International.
// Aanroep vanuit de UI (alleen managers). Zie ../_shared/fi.ts voor de XML-logica.
// body: { dossierIds: string[], testMode?: boolean, action?: 'publish' | 'unpublish' }

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

    // Alleen ingelogde managers mogen publiceren
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Geen autorisatie-header');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Niet geautoriseerd');

    const { data: profile } = await supabase
      .from('user_profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'manager') throw new Error('Alleen managers kunnen advertenties publiceren');

    const body = await req.json();
    const { dossierIds, testMode, action } = body;
    const unpublish = action === 'unpublish';

    if (!dossierIds?.length) throw new Error('Geen dossier-IDs opgegeven');

    const machinelistCode = Deno.env.get('FI_MACHINELIST_CODE');
    const fiUsername = Deno.env.get('FI_USERNAME');
    const fiPassword = Deno.env.get('FI_PASSWORD');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    const { data: dossiers, error: dossiersError } = await supabase
      .from('dossiers').select('*').in('id', dossierIds);
    if (dossiersError) throw new Error(`Dossiers ophalen mislukt: ${dossiersError.message}`);

    const publishable = (dossiers ?? []).filter((d: any) => DETAILS_TABLE[d.equipment_type]);
    if (!publishable.length) throw new Error('Geen van de geselecteerde dossiers heeft een type dat naar F.I. kan');

    const machineData = await fetchMachineData(supabase, publishable);
    const code = machinelistCode ?? 'ONTBREEKT';
    const dataXML = generateDataXML(code, machineData, { unpublish });
    const imageXML = unpublish ? null : generateImageXML(code, machineData, supabaseUrl);

    if (testMode) {
      return new Response(JSON.stringify({
        success: true, testMode: true, action: unpublish ? 'unpublish' : 'publish',
        machineCount: machineData.length, dataXML, imageXML,
        secretsAanwezig: { FI_MACHINELIST_CODE: !!machinelistCode, FI_USERNAME: !!fiUsername, FI_PASSWORD: !!fiPassword },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!machinelistCode || !fiUsername || !fiPassword) {
      throw new Error('F.I.-secrets ontbreken in Supabase (FI_MACHINELIST_CODE, FI_USERNAME, FI_PASSWORD)');
    }

    const dataResult = await uploadXML(DATA_ENDPOINT, dataXML, fiUsername, fiPassword);
    let imageResult: Awaited<ReturnType<typeof uploadXML>> | null = null;
    if (dataResult.ok && imageXML) {
      imageResult = await uploadXML(IMAGE_ENDPOINT, imageXML, fiUsername, fiPassword);
    }

    const success = dataResult.ok && (unpublish || imageResult?.ok !== false);

    for (const item of machineData) {
      await updatePublicationStatus(
        supabase,
        item.dossier.id,
        success ? (unpublish ? 'deleted' : 'published') : 'failed',
        success ? null : `Data: ${dataResult.status} (ERR: ${dataResult.errCount}) ${dataResult.body.slice(0, 300)}${imageResult ? ` | Afbeeldingen: ${imageResult.status}` : ''}`,
        {
          internalno: toInternalNo(item.dossier.dossier_number),
          action: unpublish ? 'unpublish' : 'publish',
          data_response: dataResult.body.slice(0, 1000),
          image_response: imageResult?.body?.slice(0, 1000) ?? null,
          photo_count: item.photos.length,
        }
      );
    }

    return new Response(JSON.stringify({
      success,
      action: unpublish ? 'unpublish' : 'publish',
      machineCount: machineData.length,
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
