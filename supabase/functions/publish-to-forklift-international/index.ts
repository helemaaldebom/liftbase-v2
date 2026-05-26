import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MachineData {
  dossier: any;
  details: any;
  photos: any[];
}

function getMachineType(equipmentType: string): string {
  const typeMap: Record<string, string> = {
    'forklift': '1',
    'heavy_duty_forklift': '1',
    'reachstacker': '1',
    'terminal_tractor': '1',
    'empty_container_handler': '1',
  };
  return typeMap[equipmentType] || '1';
}

function generateXML(data: MachineData[]): string {
  const machines = data.map(item => generateMachineXML(item)).join('\n');
  
  return `<?xml version="1.0" encoding="utf-8"?>
<machines>
${machines}
</machines>`;
}

function generateMachineXML(data: MachineData): string {
  const { dossier, details, photos } = data;
  
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
  const machineType = getMachineType(dossier.equipment_type);

  const photosXML = photos.map((photo, index) => {
    const url = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/dossier-photos/${photo.storage_path}`;
    return `    <photo>
      <url>${escapeXml(url)}</url>
      <main>${index === 0 ? 'yes' : 'no'}</main>
    </photo>`;
  }).join('\n');

  const xml = `  <machine type="${machineType}">
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

  console.log('=== FORKLIFT INTERNATIONAL API REQUEST ===');
  console.log('URL: https://importapi.forklift-international.com/import.php');
  console.log('Method: POST');
  console.log('Username:', username);
  console.log('Auth header length:', auth.length);
  console.log('XML length:', xml.length, 'characters');
  console.log('XML Preview (first 500 chars):', xml.substring(0, 500));

  const response = await fetch('https://importapi.forklift-international.com/import.php', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/xml; charset=utf-8'
    },
    body: xml
  });

  const responseText = await response.text();

  console.log('=== FORKLIFT INTERNATIONAL API RESPONSE ===');
  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  console.log('Response body:', responseText);
  console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

  return {
    status: response.status,
    statusText: response.statusText,
    response: responseText
  };
}

async function fetchMachineDetails(supabase: any, dossier: any): Promise<any> {
  const tableMap: Record<string, string> = {
    'forklift': 'forklift_details',
    'heavy_duty_forklift': 'forklift_details',
    'reachstacker': 'reachstacker_details',
    'terminal_tractor': 'terminal_tractor_details',
    'empty_container_handler': 'empty_container_handler_details',
  };
  
  const tableName = tableMap[dossier.equipment_type];
  if (!tableName) return null;
  
  const { data } = await supabase
    .from(tableName)
    .select('*')
    .eq('dossier_id', dossier.id)
    .maybeSingle();
  
  return data;
}

async function updatePublicationStatus(
  supabase: any,
  dossierId: string,
  status: 'published' | 'failed',
  errorMessage: string | null,
  xml: string
): Promise<void> {
  const now = new Date().toISOString();
  
  const { data: existing } = await supabase
    .from('advertisement_publications')
    .select('id')
    .eq('dossier_id', dossierId)
    .eq('platform', 'forklift_international')
    .maybeSingle();
  
  if (existing) {
    await supabase
      .from('advertisement_publications')
      .update({
        status,
        last_synced_at: now,
        sync_error_message: errorMessage,
        metadata: { xml_feed: xml }
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('advertisement_publications')
      .insert({
        dossier_id: dossierId,
        platform: 'forklift_international',
        status,
        published_at: status === 'published' ? now : null,
        last_synced_at: now,
        sync_error_message: errorMessage,
        metadata: { xml_feed: xml }
      });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('=== PUBLISH TO FORKLIFT INTERNATIONAL STARTED ===');
    console.log('Timestamp:', new Date().toISOString());

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('ERROR: No authorization header provided');
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('ERROR: User authentication failed:', userError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.email);

    const body = await req.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));

    const { dossierIds, fiUsername, fiPassword, testMode } = body;

    if (!dossierIds || !Array.isArray(dossierIds) || dossierIds.length === 0) {
      throw new Error('No dossier IDs provided');
    }

    console.log('Fetching dossiers with IDs:', dossierIds);

    const { data: dossiers, error: dossiersError } = await supabase
      .from('dossiers')
      .select('*')
      .in('id', dossierIds);

    console.log('Query result - dossiers:', dossiers?.length || 0);
    console.log('Query error:', dossiersError);

    if (dossiersError) {
      throw new Error(`Failed to fetch dossiers: ${dossiersError.message}`);
    }

    if (!dossiers || dossiers.length === 0) {
      throw new Error(`No dossiers found with IDs: ${dossierIds.join(', ')}`);
    }

    const supportedTypes = ['forklift', 'heavy_duty_forklift', 'reachstacker', 'terminal_tractor', 'empty_container_handler'];
    const publishableDossiers = dossiers.filter(d => supportedTypes.includes(d.equipment_type));

    console.log('Publishable dossiers:', publishableDossiers.length);
    console.log('Equipment types:', publishableDossiers.map(d => d.equipment_type));

    if (publishableDossiers.length === 0) {
      const foundTypes = dossiers.map(d => d.equipment_type).join(', ');
      throw new Error(`None of the selected dossiers can be published to Forklift International. Supported types: ${supportedTypes.join(', ')}. Found: ${foundTypes}`);
    }

    const machineData: MachineData[] = [];

    console.log('Processing', publishableDossiers.length, 'dossiers...');

    for (const dossier of publishableDossiers) {
      console.log(`Processing dossier ${dossier.dossier_number} (${dossier.brand} ${dossier.model})`);

      const details = await fetchMachineDetails(supabase, dossier);
      console.log('Details fetched:', details ? 'Found' : 'Not found');

      const { data: photos } = await supabase
        .from('photos')
        .select('*')
        .eq('dossier_id', dossier.id)
        .order('display_order', { ascending: true });

      console.log('Photos found:', photos?.length || 0);

      machineData.push({
        dossier,
        details,
        photos: photos || []
      });
    }

    console.log('All dossiers processed. Generating XML...');
    const xml = generateXML(machineData);
    console.log('Generated XML for', machineData.length, 'machines');
    console.log('Full XML output:');
    console.log(xml);

    if (testMode) {
      return new Response(
        JSON.stringify({
          success: true,
          testMode: true,
          xml,
          machineCount: machineData.length,
          dossiers: machineData.map(f => ({
            dossier_number: f.dossier.dossier_number,
            equipment_type: f.dossier.equipment_type
          }))
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!fiUsername || !fiPassword) {
      console.error('ERROR: Missing credentials');
      throw new Error('Forklift International credentials are required. Please provide fiUsername and fiPassword.');
    }

    console.log('Uploading to Forklift International API...');
    const uploadResult = await uploadToForkliftInternational(xml, fiUsername, fiPassword);
    const apiStatusCode = uploadResult.status;
    const success = apiStatusCode === 200;

    console.log('=== API RESPONSE STATUS ===');
    console.log('Status Code:', apiStatusCode);
    console.log('Success:', success);

    let statusMessage = '';
    if (apiStatusCode === 200) {
      statusMessage = 'Connectie succesvol - Data gepubliceerd';
    } else if (apiStatusCode >= 400 && apiStatusCode < 500) {
      statusMessage = `Client error - Status ${apiStatusCode}`;
    } else if (apiStatusCode >= 500) {
      statusMessage = `Server error - Status ${apiStatusCode}`;
    } else if (apiStatusCode >= 300 && apiStatusCode < 400) {
      statusMessage = `Redirect - Status ${apiStatusCode}`;
    }
    console.log('Status Message:', statusMessage);

    console.log('Updating publication status in database...');
    for (const item of machineData) {
      console.log(`Updating status for dossier ${item.dossier.dossier_number}`);
      await updatePublicationStatus(
        supabase,
        item.dossier.id,
        success ? 'published' : 'failed',
        success ? null : `${statusMessage}: ${uploadResult.response}`,
        xml
      );
    }

    console.log('=== PUBLISH TO FORKLIFT INTERNATIONAL COMPLETED ===');
    console.log('Success:', success);
    console.log('Machine count:', machineData.length);

    return new Response(
      JSON.stringify({
        success,
        apiStatusCode,
        statusMessage,
        uploadResult,
        machineCount: machineData.length,
        xml: xml,
        debug: {
          timestamp: new Date().toISOString(),
          dossierIds,
          equipmentTypes: machineData.map(m => m.dossier.equipment_type)
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('=== ERROR IN PUBLISH TO FORKLIFT INTERNATIONAL ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Timestamp:', new Date().toISOString());

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
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
