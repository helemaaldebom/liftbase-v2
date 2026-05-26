import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface MascusAdData {
  dossier_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  model: string;
  year: number;
  location: string;
  country: string;
  photos: string[];
  specifications: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'manager') {
      return new Response(
        JSON.stringify({ error: 'Only managers can publish advertisements' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { dossier_id } = await req.json();

    if (!dossier_id) {
      return new Response(
        JSON.stringify({ error: 'Missing dossier_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: dossier, error: dossierError } = await supabaseClient
      .from('dossiers')
      .select(`
        *,
        forklift_details(*),
        reachstacker_details(*),
        terminal_tractor_details(*),
        empty_container_handler_details(*)
      `)
      .eq('id', dossier_id)
      .single();

    if (dossierError || !dossier) {
      return new Response(
        JSON.stringify({ error: 'Dossier not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!dossier.publish_to_mascus) {
      return new Response(
        JSON.stringify({ error: 'Dossier is not enabled for Mascus publication' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: photos } = await supabaseClient
      .from('photos')
      .select('file_path')
      .eq('dossier_id', dossier_id)
      .order('position', { ascending: true });

    const photoUrls = photos?.map(
      (p) => `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/dossier-photos/${p.file_path}`
    ) || [];

    const details =
      (dossier as any).forklift_details?.[0] ||
      (dossier as any).reachstacker_details?.[0] ||
      (dossier as any).terminal_tractor_details?.[0] ||
      (dossier as any).empty_container_handler_details?.[0] ||
      {};

    const mascusCategory = getMascusCategory(dossier.equipment_type);

    const adData: MascusAdData = {
      dossier_id: dossier.id,
      title: `${dossier.brand} ${dossier.model} - ${dossier.year || 'Year Unknown'}`,
      description: dossier.online_description || dossier.description || '',
      price: dossier.publication_price || dossier.estimated_value || 0,
      category: mascusCategory,
      brand: dossier.brand,
      model: dossier.model,
      year: dossier.year || 0,
      location: dossier.location || '',
      country: dossier.land || 'NL',
      photos: photoUrls,
      specifications: {
        capacity_kg: details.capacity_kg || dossier.capaciteit,
        hours: details.hours_on_clock || dossier.uren,
        fuel_type: details.power || dossier.brandstof,
        serial_number: details.serial_no || dossier.serienummer,
        lift_height: dossier.hefhoogte,
        mast_type: dossier.masttype,
        attachment: dossier.aanbouwdeel,
        condition: dossier.condition,
      },
    };

    const xmlFeed = generateMascusXML(adData);

    const { data: existingPub } = await supabaseClient
      .from('advertisement_publications')
      .select('*')
      .eq('dossier_id', dossier_id)
      .eq('platform', 'mascus')
      .single();

    if (existingPub) {
      await supabaseClient
        .from('advertisement_publications')
        .update({
          status: 'updated',
          last_synced_at: new Date().toISOString(),
          sync_retry_count: 0,
          sync_error_message: null,
          metadata: { xml_feed: xmlFeed, ad_data: adData },
        })
        .eq('id', existingPub.id);
    } else {
      await supabaseClient
        .from('advertisement_publications')
        .insert({
          dossier_id,
          platform: 'mascus',
          status: 'published',
          published_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          metadata: { xml_feed: xmlFeed, ad_data: adData },
        });
    }

    await supabaseClient
      .from('dossiers')
      .update({
        is_published: true,
        last_publication_sync: new Date().toISOString(),
      })
      .eq('id', dossier_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully published to Mascus',
        xml_feed: xmlFeed,
        ad_data: adData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error publishing to Mascus:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getMascusCategory(equipmentType: string): string {
  const categoryMap: Record<string, string> = {
    heavy_duty_forklift: 'Forklift Trucks',
    empty_container_handler: 'Container Handlers',
    reachstacker: 'Reach Stackers',
    terminal_tractor: 'Terminal Tractors',
  };
  return categoryMap[equipmentType] || 'Material Handling Equipment';
}

function generateMascusXML(adData: MascusAdData): string {
  const escapeXml = (str: string | number): string => {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const photosXml = adData.photos
    .map((url, index) => `    <image${index + 1}>${escapeXml(url)}</image${index + 1}>`)
    .join('\n');

  const specsXml = Object.entries(adData.specifications)
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `    <${key}>${escapeXml(value)}</${key}>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<advertisement>
  <id>${escapeXml(adData.dossier_id)}</id>
  <title>${escapeXml(adData.title)}</title>
  <description>${escapeXml(adData.description)}</description>
  <price currency="EUR">${escapeXml(adData.price)}</price>
  <category>${escapeXml(adData.category)}</category>
  <brand>${escapeXml(adData.brand)}</brand>
  <model>${escapeXml(adData.model)}</model>
  <year>${escapeXml(adData.year)}</year>
  <location>${escapeXml(adData.location)}</location>
  <country>${escapeXml(adData.country)}</country>
  <images>
${photosXml}
  </images>
  <specifications>
${specsXml}
  </specifications>
</advertisement>`;
}
