import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wcjegvxnojzirwxogesj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjamVndnhub2p6aXJ3eG9nZXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjcxODcsImV4cCI6MjA3Njk0MzE4N30.MpQ1FU4Wmc_kbZnevScMay4sALMN1mPN3sbTn5e3sfk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeCustomerDuplicates() {
  console.log('Analyzing customer names from dossiers...\n');

  // Get all customer names from dossiers
  const { data: dossiers, error } = await supabase
    .from('dossiers')
    .select('id, customer_name, dossier_number')
    .not('customer_name', 'is', null)
    .neq('customer_name', '');

  if (error) {
    console.error('Error fetching dossiers:', error);
    return;
  }

  // Group by normalized customer name
  const customerGroups = new Map();

  dossiers.forEach(dossier => {
    const normalized = dossier.customer_name.trim().toLowerCase();
    if (!customerGroups.has(normalized)) {
      customerGroups.set(normalized, []);
    }
    customerGroups.get(normalized).push({
      id: dossier.id,
      originalName: dossier.customer_name,
      dossierNumber: dossier.dossier_number
    });
  });

  // Find duplicates (case/whitespace variations)
  const duplicates = [];
  const uniqueCustomers = [];

  customerGroups.forEach((dossiers, normalizedName) => {
    const variants = [...new Set(dossiers.map(d => d.originalName))];

    if (variants.length > 1) {
      // Multiple variants found - this is a duplicate
      duplicates.push({
        normalizedName,
        variants,
        dossierCount: dossiers.length,
        dossiers: dossiers
      });
    } else {
      // Single variant - unique customer
      uniqueCustomers.push({
        name: variants[0],
        normalizedName,
        dossierCount: dossiers.length
      });
    }
  });

  console.log(`Total unique customers (normalized): ${customerGroups.size}`);
  console.log(`Customers with name variations: ${duplicates.length}`);
  console.log(`Clean unique customers: ${uniqueCustomers.length}\n`);

  if (duplicates.length > 0) {
    console.log('=== DUPLICATES FOUND ===\n');
    duplicates.forEach((dup, index) => {
      console.log(`${index + 1}. "${dup.normalizedName}" (${dup.dossierCount} dossiers)`);
      console.log('   Variants:');
      dup.variants.forEach(variant => {
        const count = dup.dossiers.filter(d => d.originalName === variant).length;
        console.log(`     - "${variant}" (${count} dossiers)`);
      });
      console.log('');
    });
  }

  console.log('\n=== ALL UNIQUE CUSTOMERS ===\n');
  const allCustomers = [
    ...uniqueCustomers.map(c => c.name),
    ...duplicates.map(d => d.variants[0]) // Use first variant as canonical
  ].sort();

  allCustomers.forEach((name, index) => {
    console.log(`${index + 1}. ${name}`);
  });

  return { duplicates, uniqueCustomers, allCustomers };
}

async function fixDuplicates() {
  console.log('\n\n=== FIXING DUPLICATES ===\n');

  const { duplicates } = await analyzeCustomerDuplicates();

  if (duplicates.length === 0) {
    console.log('No duplicates to fix!');
    return;
  }

  console.log('Starting to fix duplicates...\n');

  for (const dup of duplicates) {
    // Choose the most common variant, or the first one if tied
    const variantCounts = dup.variants.map(variant => ({
      name: variant,
      count: dup.dossiers.filter(d => d.originalName === variant).length
    }));

    variantCounts.sort((a, b) => b.count - a.count);
    const canonicalName = variantCounts[0].name;

    console.log(`Fixing "${dup.normalizedName}" -> using "${canonicalName}"`);

    // Update all dossiers to use the canonical name
    const dossierIdsToUpdate = dup.dossiers
      .filter(d => d.originalName !== canonicalName)
      .map(d => d.id);

    if (dossierIdsToUpdate.length > 0) {
      const { error } = await supabase
        .from('dossiers')
        .update({ customer_name: canonicalName })
        .in('id', dossierIdsToUpdate);

      if (error) {
        console.error(`  Error updating dossiers:`, error);
      } else {
        console.log(`  Updated ${dossierIdsToUpdate.length} dossiers`);
      }
    }
    console.log('');
  }

  console.log('\n✓ Duplicate fixing complete!');
}

// Run the script
fixDuplicates().catch(console.error);
