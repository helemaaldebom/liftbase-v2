import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envFile = readFileSync(join(__dirname, '.env'), 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials niet gevonden in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTerbergDuplicates() {
  console.log('🔍 Checken voor dubbele Terberg entries...\n');

  try {
    // Check dossiers
    const { data: dossiersData, error: dossiersError } = await supabase
      .from('dossiers')
      .select('id, merk')
      .not('merk', 'is', null)
      .or('merk.ilike.%terberg%');

    if (dossiersError) {
      console.error('❌ Fout bij ophalen dossiers:', dossiersError.message);
    } else {
      const terbergDossiers = dossiersData?.filter(d =>
        d.merk && d.merk.toLowerCase().includes('terberg')
      ) || [];
      const uniqueMerken = [...new Set(terbergDossiers.map(d => d.merk))];
      console.log('📋 Dossiers - Gevonden Terberg varianten:', uniqueMerken);
      console.log(`   Totaal aantal dossiers: ${terbergDossiers.length}\n`);
    }

    // Check terminal_tractor_details
    const { data: terminalTractorData, error: terminalTractorError } = await supabase
      .from('terminal_tractor_details')
      .select('id, brand, dossier_id')
      .not('brand', 'is', null)
      .or('brand.ilike.%terberg%');

    if (terminalTractorError) {
      console.error('❌ Fout bij ophalen terminal tractor details:', terminalTractorError.message);
    } else {
      const terbergTractors = terminalTractorData?.filter(d =>
        d.brand && d.brand.toLowerCase().includes('terberg')
      ) || [];
      const uniqueBrands = [...new Set(terbergTractors.map(d => d.brand))];
      console.log('🚜 Terminal Tractor Details - Gevonden Terberg varianten:', uniqueBrands);
      console.log(`   Totaal aantal records: ${terbergTractors.length}\n`);
    }

    console.log('🔧 Starten met consolideren naar "Terberg"...\n');

    // Update dossiers - eerst alle varianten ophalen die niet exact "Terberg" zijn
    const { data: dossiersToUpdate } = await supabase
      .from('dossiers')
      .select('id, merk')
      .not('merk', 'is', null);

    const dossiersNeedingUpdate = dossiersToUpdate?.filter(d =>
      d.merk && d.merk.toLowerCase().includes('terberg') && d.merk !== 'Terberg'
    ) || [];

    if (dossiersNeedingUpdate.length > 0) {
      console.log(`📝 Updating ${dossiersNeedingUpdate.length} dossiers...`);

      for (const dossier of dossiersNeedingUpdate) {
        const { error } = await supabase
          .from('dossiers')
          .update({ merk: 'Terberg' })
          .eq('id', dossier.id);

        if (error) {
          console.error(`   ❌ Fout bij updaten dossier ${dossier.id}:`, error.message);
        }
      }
      console.log(`✅ ${dossiersNeedingUpdate.length} dossiers geüpdatet\n`);
    } else {
      console.log('✅ Geen dossiers te updaten\n');
    }

    // Update terminal_tractor_details
    const { data: terminalTractorsToUpdate } = await supabase
      .from('terminal_tractor_details')
      .select('id, brand')
      .not('brand', 'is', null);

    const tractorsNeedingUpdate = terminalTractorsToUpdate?.filter(d =>
      d.brand && d.brand.toLowerCase().includes('terberg') && d.brand !== 'Terberg'
    ) || [];

    if (tractorsNeedingUpdate.length > 0) {
      console.log(`📝 Updating ${tractorsNeedingUpdate.length} terminal tractor details...`);

      for (const tractor of tractorsNeedingUpdate) {
        const { error } = await supabase
          .from('terminal_tractor_details')
          .update({ brand: 'Terberg' })
          .eq('id', tractor.id);

        if (error) {
          console.error(`   ❌ Fout bij updaten terminal tractor ${tractor.id}:`, error.message);
        }
      }
      console.log(`✅ ${tractorsNeedingUpdate.length} terminal tractor details geüpdatet\n`);
    } else {
      console.log('✅ Geen terminal tractor details te updaten\n');
    }

    // Verificatie
    console.log('🔍 Verificatie na update...\n');

    const { data: verifyDossiers } = await supabase
      .from('dossiers')
      .select('merk')
      .not('merk', 'is', null);

    if (verifyDossiers) {
      const terbergDossiers = verifyDossiers.filter(d =>
        d.merk && d.merk.toLowerCase().includes('terberg')
      );
      const uniqueMerken = [...new Set(terbergDossiers.map(d => d.merk))];
      console.log('📋 Dossiers na update:', uniqueMerken);
    }

    const { data: verifyTerminalTractors } = await supabase
      .from('terminal_tractor_details')
      .select('brand')
      .not('brand', 'is', null);

    if (verifyTerminalTractors) {
      const terbergTractors = verifyTerminalTractors.filter(d =>
        d.brand && d.brand.toLowerCase().includes('terberg')
      );
      const uniqueBrands = [...new Set(terbergTractors.map(d => d.brand))];
      console.log('🚜 Terminal Tractor Details na update:', uniqueBrands);
    }

    console.log('\n✅ Klaar! Alle Terberg varianten zijn nu geconsolideerd naar "Terberg"');

  } catch (error) {
    console.error('❌ Onverwachte fout:', error);
  }
}

fixTerbergDuplicates();
