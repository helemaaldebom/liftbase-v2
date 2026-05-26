import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wcjegvxnojzirwxogesj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjamVndnhub2p6aXJ3eG9nZXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjcxODcsImV4cCI6MjA3Njk0MzE4N30.MpQ1FU4Wmc_kbZnevScMay4sALMN1mPN3sbTn5e3sfk'
);

async function checkDossiers() {
  console.log('Checking dossiers...\n');

  const { data, error } = await supabase
    .from('dossiers')
    .select('id, dossier_number, brand, model, equipment_type, location, is_marktdata, latitude, longitude, status')
    .eq('dossier_number', 'HCL26-003');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} dossiers:\n`);

  data.forEach(d => {
    console.log(`${d.dossier_number}:`);
    console.log(`  - Equipment: ${d.equipment_type}`);
    console.log(`  - Location: ${d.location || 'NO LOCATION'}`);
    console.log(`  - GPS: ${d.latitude && d.longitude ? `${d.latitude}, ${d.longitude}` : 'NO GPS'}`);
    console.log(`  - Status: ${d.status}`);
    console.log('');
  });

  const withLocation = data.filter(d => d.location && d.location.trim() !== '');
  const withGPS = data.filter(d => d.latitude && d.longitude);

  console.log(`\nSummary:`);
  console.log(`- Total dossiers: ${data.length}`);
  console.log(`- With location field: ${withLocation.length}`);
  console.log(`- With GPS coordinates: ${withGPS.length}`);
}

checkDossiers();
