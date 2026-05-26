import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wcjegvxnojzirwxogesj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjamVndnhub2p6aXJ3eG9nZXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjcxODcsImV4cCI6MjA3Njk0MzE4N30.MpQ1FU4Wmc_kbZnevScMay4sALMN1mPN3sbTn5e3sfk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGeneralEquipmentInDossiers() {
  console.log('Checking for General Equipment in dossiers...\n');

  // Find all dossiers with "General Equipment" in customer_name
  const { data: dossiers, error } = await supabase
    .from('dossiers')
    .select('id, dossier_number, customer_name')
    .ilike('customer_name', '%General Equipment%');

  if (error) {
    console.error('Error fetching dossiers:', error);
    return;
  }

  console.log(`Found ${dossiers?.length || 0} dossiers with "General Equipment":\n`);

  if (dossiers && dossiers.length > 0) {
    const variants = new Map();

    dossiers.forEach(d => {
      if (!variants.has(d.customer_name)) {
        variants.set(d.customer_name, []);
      }
      variants.get(d.customer_name).push(d.dossier_number);
    });

    console.log('Name variants:');
    variants.forEach((dossierNumbers, name) => {
      console.log(`  "${name}" - ${dossierNumbers.length} dossier(s): ${dossierNumbers.join(', ')}`);
    });

    console.log('\n=== FIXING DUPLICATES ===\n');

    // Update all to "General Equipmet Ltd"
    const dossierIds = dossiers.map(d => d.id);

    const { error: updateError } = await supabase
      .from('dossiers')
      .update({ customer_name: 'General Equipmet Ltd' })
      .in('id', dossierIds);

    if (updateError) {
      console.error('Error updating dossiers:', updateError);
    } else {
      console.log(`✓ Updated ${dossierIds.length} dossier(s) to "General Equipmet Ltd"`);
    }
  } else {
    console.log('No dossiers found with "General Equipment"');
  }
}

checkGeneralEquipmentInDossiers().catch(console.error);
