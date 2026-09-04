import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  buildAdPayload, sendToTruck1, fetchMachineData,
  updateTruck1PublicationStatus, DETAILS_TABLE,
} from "../_shared/truck1.ts";

// Handmatig publiceren/offline halen van dossiers op Truck1.eu.
// body: { dossierIds: string[], testMode?: boolean, action?: 'publish'|'unpublish' }
// testMode gebruikt de ingebouwde Truck1-testvlag: hele keten echt, niets geplaatst.

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

    const { dossierIds, testMode, action } = await req.json();
    const unpublish = action === 'unpublish';
    if (!dossierIds?.length) throw new Error('Geen dossier-IDs opgegeven');

    const { data: dossiers, error: dossiersError } = await supabase
      .from('dossiers').select('*').in('id', dossierIds);
    if (dossiersError) throw new Error(`Dossiers ophalen mislukt: ${dossiersError.message}`);

    const publishable = (dossiers ?? []).filter((d: any) => DETAILS_TABLE[d.equipment_type]);
    if (!publishable.length) throw new Error('Geen van de geselecteerde dossiers heeft een geschikt machinetype');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const machineData = await fetchMachineData(supabase, publishable);

    const ads: Record<string, unknown> = {};
    for (const item of machineData) {
      ads[item.dossier.dossier_number] = unpublish
        ? { action: 'delete' }
        : { action: 'add', ...buildAdPayload(item.dossier, item.details, item.photos, supabaseUrl) };
    }

    const result = await sendToTruck1(ads, { test: !!testMode });

    if (!testMode) {
      for (const item of machineData) {
        await updateTruck1PublicationStatus(
          supabase, item.dossier.id,
          result.ok ? (unpublish ? 'deleted' : 'published') : 'failed',
          result.ok ? null : (result.busy ? 'Truck1 API is bezet — probeer later opnieuw' : `Truck1: ${JSON.stringify(result.errors).slice(0, 300)}`),
          {
            imp_id: item.dossier.dossier_number,
            action: unpublish ? 'unpublish' : 'publish',
            summary: result.summary,
            response: result.raw,
            photo_count: item.photos.length,
          }
        );
      }
    }

    return new Response(JSON.stringify({
      success: result.ok,
      testMode: !!testMode,
      action: unpublish ? 'unpublish' : 'publish',
      machineCount: machineData.length,
      summary: result.summary,
      errors: result.errors,
      warnings: result.warnings,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Fout in publish-to-truck1:', error);
    return new Response(JSON.stringify({ error: error.message || 'Onbekende fout' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
