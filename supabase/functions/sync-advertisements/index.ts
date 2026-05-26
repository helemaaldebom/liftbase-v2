import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const syncStartTime = new Date().toISOString();
    let totalDossiers = 0;
    let successfulSyncs = 0;
    let failedSyncs = 0;
    const errorSummary: Record<string, any> = {};

    console.log('Starting nightly advertisement sync...');

    const platforms = ['mascus', 'trucksnl', 'machineseeker', 'truckscout24'];

    for (const platform of platforms) {
      const platformColumn = `publish_to_${platform}`;

      console.log(`Syncing ${platform}...`);

      const { data: dossiers, error: dossierError } = await supabaseClient
        .from('dossiers')
        .select(`
          *,
          forklift_details(*),
          reachstacker_details(*),
          terminal_tractor_details(*),
          empty_container_handler_details(*)
        `)
        .eq(platformColumn, true)
        .eq('is_marktdata', false);

      if (dossierError) {
        console.error(`Error fetching dossiers for ${platform}:`, dossierError);
        errorSummary[platform] = dossierError.message;
        continue;
      }

      if (!dossiers || dossiers.length === 0) {
        console.log(`No dossiers to sync for ${platform}`);
        continue;
      }

      totalDossiers += dossiers.length;

      for (const dossier of dossiers) {
        try {
          console.log(`Syncing dossier ${dossier.dossier_number} to ${platform}...`);

          const { data: photos } = await supabaseClient
            .from('photos')
            .select('file_path')
            .eq('dossier_id', dossier.id)
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

          const adData = {
            dossier_id: dossier.id,
            dossier_number: dossier.dossier_number,
            title: `${dossier.brand} ${dossier.model} - ${dossier.year || 'Year Unknown'}`,
            description: dossier.online_description || dossier.description || '',
            price: dossier.publication_price || dossier.estimated_value || 0,
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

          const xmlFeed = generateXMLFeed(adData, platform);

          const { data: existingPub } = await supabaseClient
            .from('advertisement_publications')
            .select('*')
            .eq('dossier_id', dossier.id)
            .eq('platform', platform)
            .single();

          if (existingPub) {
            await supabaseClient
              .from('advertisement_publications')
              .update({
                status: 'updated',
                last_synced_at: new Date().toISOString(),
                sync_retry_count: 0,
                sync_error_message: null,
                metadata: { xml_feed: xmlFeed, ad_data: adData, synced_at: new Date().toISOString() },
              })
              .eq('id', existingPub.id);
          } else {
            await supabaseClient
              .from('advertisement_publications')
              .insert({
                dossier_id: dossier.id,
                platform,
                status: 'published',
                published_at: new Date().toISOString(),
                last_synced_at: new Date().toISOString(),
                metadata: { xml_feed: xmlFeed, ad_data: adData, synced_at: new Date().toISOString() },
              });
          }

          await supabaseClient
            .from('dossiers')
            .update({
              is_published: true,
              last_publication_sync: new Date().toISOString(),
            })
            .eq('id', dossier.id);

          successfulSyncs++;
          console.log(`Successfully synced ${dossier.dossier_number} to ${platform}`);
        } catch (error) {
          failedSyncs++;
          console.error(`Error syncing dossier ${dossier.dossier_number} to ${platform}:`, error);

          if (!errorSummary[platform]) {
            errorSummary[platform] = [];
          }
          errorSummary[platform].push({
            dossier_number: dossier.dossier_number,
            error: error.message,
          });

          await supabaseClient
            .from('advertisement_publications')
            .upsert({
              dossier_id: dossier.id,
              platform,
              status: 'failed',
              last_synced_at: new Date().toISOString(),
              sync_error_message: error.message,
              sync_retry_count: (await supabaseClient
                .from('advertisement_publications')
                .select('sync_retry_count')
                .eq('dossier_id', dossier.id)
                .eq('platform', platform)
                .single()).data?.sync_retry_count || 0 + 1,
            }, {
              onConflict: 'dossier_id,platform',
            });
        }
      }
    }

    const syncCompletedTime = new Date().toISOString();

    await supabaseClient
      .from('platform_sync_logs')
      .insert({
        sync_started_at: syncStartTime,
        sync_completed_at: syncCompletedTime,
        total_dossiers: totalDossiers,
        successful_syncs: successfulSyncs,
        failed_syncs: failedSyncs,
        error_summary: errorSummary,
        triggered_by: 'scheduled',
      });

    console.log('Nightly sync completed:', {
      totalDossiers,
      successfulSyncs,
      failedSyncs,
      errorSummary,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync completed',
        stats: {
          total_dossiers: totalDossiers,
          successful_syncs: successfulSyncs,
          failed_syncs: failedSyncs,
          error_summary: errorSummary,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fatal error during sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateXMLFeed(adData: any, platform: string): string {
  const escapeXml = (str: string | number): string => {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const photosXml = adData.photos
    .map((url: string, index: number) => `    <image${index + 1}>${escapeXml(url)}</image${index + 1}>`)
    .join('\n');

  const specsXml = Object.entries(adData.specifications)
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `    <${key}>${escapeXml(value as string | number)}</${key}>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<advertisement platform="${platform}">
  <id>${escapeXml(adData.dossier_id)}</id>
  <reference>${escapeXml(adData.dossier_number)}</reference>
  <title>${escapeXml(adData.title)}</title>
  <description>${escapeXml(adData.description)}</description>
  <price currency="EUR">${escapeXml(adData.price)}</price>
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
