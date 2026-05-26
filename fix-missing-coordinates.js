import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function geocodeAddress(address) {
  try {
    console.log(`  Geocoding: ${address}`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'HC Lifters Taxatie App'
        }
      }
    );

    if (!response.ok) {
      console.log(`  ❌ HTTP error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
      console.log(`  ✅ Found: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
      return coords;
    }

    console.log(`  ❌ No results found`);
    return null;
  } catch (error) {
    console.error(`  ❌ Error:`, error.message);
    return null;
  }
}

async function fixMissingCoordinates() {
  console.log('🔍 Checking for dossiers without GPS coordinates...\n');

  const { data: allDossiers, error: fetchError } = await supabase
    .from('dossiers')
    .select('id, dossier_number, brand, model, location, latitude, longitude, status')
    .or('is_marktdata.is.null,is_marktdata.eq.false')
    .order('dossier_number', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching dossiers:', fetchError);
    return;
  }

  console.log(`📊 Total dossiers: ${allDossiers.length}`);

  const soldDossiers = allDossiers.filter(d => d.status === 'sold');
  console.log(`📊 Sold dossiers: ${soldDossiers.length}`);

  const missingCoords = allDossiers.filter(d =>
    d.location && d.location.trim() !== '' && (!d.latitude || !d.longitude)
  );

  const soldMissingCoords = soldDossiers.filter(d =>
    d.location && d.location.trim() !== '' && (!d.latitude || !d.longitude)
  );

  console.log(`📊 Dossiers with location but no GPS: ${missingCoords.length}`);
  console.log(`📊 SOLD dossiers with location but no GPS: ${soldMissingCoords.length}\n`);

  if (missingCoords.length === 0) {
    console.log('✅ All dossiers with locations already have GPS coordinates!');
    return;
  }

  console.log('🗺️  Starting geocoding process...\n');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < missingCoords.length; i++) {
    const dossier = missingCoords[i];
    const isSold = dossier.status === 'sold';
    const statusTag = isSold ? '🔴 VERKOCHT' : '⚪';

    console.log(`\n[${i + 1}/${missingCoords.length}] ${statusTag} ${dossier.dossier_number}`);
    console.log(`  ${dossier.brand} ${dossier.model}`);
    console.log(`  Location: ${dossier.location}`);

    const coords = await geocodeAddress(dossier.location);

    if (coords) {
      const { error: updateError } = await supabase
        .from('dossiers')
        .update({
          latitude: coords.lat,
          longitude: coords.lng
        })
        .eq('id', dossier.id);

      if (updateError) {
        console.log(`  ❌ Failed to save to database:`, updateError.message);
        failCount++;
      } else {
        console.log(`  ✅ Saved to database`);
        successCount++;
      }
    } else {
      console.log(`  ⚠️  Could not geocode this address`);
      failCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 GEOCODING COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📍 Total processed: ${missingCoords.length}`);
  console.log('='.repeat(60));
}

fixMissingCoordinates().catch(console.error);
