import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ForkliftData {
  dossier: any;
  details: any;
  photos: any[];
}

function generateXML(data: ForkliftData[]): string {
  const machines = data.map(item => generateMachineXML(item)).join('\n');
  
  return `<?xml version="1.0" encoding="utf-8"?>
<machines>
${machines}
</machines>`;
}

function generateMachineXML(data: ForkliftData): string {
  const { dossier, details, photos } = data;
  
  // Map fuel types to FI codes
  const fuelTypeMap: Record<string, string> = {
    'Diesel': 'D',
    'LPG': 'L',
    'Gas': 'G',
    'Elektrisch': 'E',
    'Electric': 'E',
    'Hybride': 'H',
    'Hybrid': 'H'
  };
  
  const fuelType = fuelTypeMap[dossier.fuel_type || ''] || 'D';

  // Generate photos section
  const photosXML = photos.map((photo, index) => {
    const url = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/dossier-photos/${photo.storage_path}`;
    return `    <photo>
      <url>${escapeXml(url)}</url>
      <main>${index === 0 ? 'yes' : 'no'}</main>
    </photo>`;
  }).join('\n');

  // Build machine XML
  const xml = `  <machine type="1">
    <id>${escapeXml(dossier.dossier_number)}</id>
    <changed>${formatDate(dossier.updated_at)}</changed>
    <make>${escapeXml(dossier.brand || '')}</make>
    <model>${escapeXml(dossier.model || '')}</model>
    <year>${dossier.year || ''}</year>
    <hours>${dossier.hours || details?.hours_on_clock || ''}</hours>
    <capacity>${Math.round((dossier.capacity || details?.capacity_kg || 0))}</capacity>
    <loadcenter>${dossier.load_center || details?.load_center_mm || 500}</loadcenter>
    <lift>${dossier.lifting_height || details?.lift_height_mm || ''}</lift>
    <freelift>${dossier.free_lift || 0}</freelift>
    <mast>${escapeXml(dossier.mast_type || details?.mast_type || '')}</mast>
    <power>${fuelType}</power>
    <country>${escapeXml(dossier.country || 'NL')}</country>
    <city>${escapeXml(dossier.location || '')}</city>
    <dealerprice>${dossier.handelsprijs || 0}</dealerprice>
    <customerprice>${dossier.eindklantprijs || 0}</customerprice>
    <description>${escapeXml(dossier.description || '')}</description>
${photosXML ? photosXML + '\n' : ''}  </machine>`;
  
  return xml;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function uploadToForkliftInternational(xml: string, username: string, password: string): Promise<any> {
  const auth = btoa(`${username}:${password}`);

  console.log('=== DAILY SYNC: FI API REQUEST ===');
  console.log('URL: https://importapi.forklift-international.com/import.php');
  console.log('Username:', username);
  console.log('XML length:', xml.length, 'characters');

  const response = await fetch('https://importapi.forklift-international.com/import.php', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/xml; charset=utf-8'
    },
    body: xml
  });

  const responseText = await response.text();

  console.log('=== DAILY SYNC: FI API RESPONSE ===');
  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  console.log('Response body:', responseText);

  return {
    status: response.status,
    statusText: response.statusText,
    response: responseText
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Verify the request has a valid secret key for cron jobs
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET') || 'default-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      throw new Error('Unauthorized: Invalid cron secret');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get FI credentials from environment or settings table
    const fiUsername = Deno.env.get('FI_USERNAME');
    const fiPassword = Deno.env.get('FI_PASSWORD');

    if (!fiUsername || !fiPassword) {
      throw new Error('Forklift International credentials not configured');
    }

    // Fetch all active forklift dossiers that should be synced
    const { data: dossiers, error: dossiersError } = await supabase
      .from('dossiers')
      .select('*')
      .eq('equipment_type', 'forklift')
      .in('status', ['active', 'published'])
      .eq('is_marktdata', false);

    if (dossiersError) {
      throw new Error(`Failed to fetch dossiers: ${dossiersError.message}`);
    }

    if (!dossiers || dossiers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No forklifts to sync',
          machineCount: 0
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Fetch forklift details and photos for each dossier
    const forkliftData: ForkliftData[] = [];

    for (const dossier of dossiers) {
      // Fetch forklift details
      const { data: details } = await supabase
        .from('forklift_details')
        .select('*')
        .eq('dossier_id', dossier.id)
        .maybeSingle();

      // Fetch photos
      const { data: photos } = await supabase
        .from('photos')
        .select('*')
        .eq('dossier_id', dossier.id)
        .order('display_order', { ascending: true });

      forkliftData.push({
        dossier,
        details,
        photos: photos || []
      });
    }

    // Generate XML
    const xml = generateXML(forkliftData);

    // Upload to Forklift International
    const uploadResult = await uploadToForkliftInternational(xml, fiUsername, fiPassword);

    // Log the sync result
    console.log(`Daily FI sync completed: ${forkliftData.length} machines, status: ${uploadResult.status}`);

    return new Response(
      JSON.stringify({
        success: uploadResult.status === 200,
        uploadResult,
        machineCount: forkliftData.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in daily-forklift-international-sync:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
