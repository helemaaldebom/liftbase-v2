import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { wcConfigFromEnv, processDossiersToWC, buildProductPayload, DETAILS_TABLE } from "../_shared/wc.ts";

// Handmatig publiceren/offline halen van dossiers op heavycargolifters.com.
// Aanroep vanuit de UI (alleen managers). Zie ../_shared/wc.ts voor de logica.
// body: { dossierIds: string[], testMode?: boolean, action?: 'publish'|'unpublish',
//         productStatus?: 'draft'|'publish' }  (default 'publish')

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

    // Alleen ingelogde managers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Geen autorisatie-header');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Niet geautoriseerd');
    const { data: profile } = await supabase
      .from('user_profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'manager') throw new Error('Alleen managers kunnen publiceren');

    const body = await req.json();
    const { dossierIds, testMode, action, productStatus = 'publish' } = body;
    const unpublish = action === 'unpublish';
    if (!dossierIds?.length) throw new Error('Geen dossier-IDs opgegeven');

    const { data: dossiers, error: dossiersError } = await supabase
      .from('dossiers').select('*').in('id', dossierIds);
    if (dossiersError) throw new Error(`Dossiers ophalen mislukt: ${dossiersError.message}`);
    if (!dossiers?.length) throw new Error('Geen dossiers gevonden');

    if (testMode) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const results = [];
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
        results.push({
          dossier: dossier.dossier_number,
          testMode: true,
          payload: buildProductPayload(dossier, details, photos ?? [], supabaseUrl, null, unpublish ? 'draft' : productStatus),
        });
      }
      return new Response(JSON.stringify({ success: true, testMode: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cfg = wcConfigFromEnv();
    if (!cfg.key || !cfg.secret) throw new Error('WooCommerce-secrets ontbreken (WC_CONSUMER_KEY, WC_CONSUMER_SECRET)');

    const results = await processDossiersToWC(supabase, cfg, dossiers, { unpublish, productStatus });
    const success = results.every((r) => r.success !== false);

    return new Response(JSON.stringify({ success, action: unpublish ? 'unpublish' : 'publish', results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Fout in publish-to-hcl-website:', error);
    return new Response(JSON.stringify({ error: error.message || 'Onbekende fout' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
