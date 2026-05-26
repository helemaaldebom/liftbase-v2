import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wcjegvxnojzirwxogesj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjamVndnhub2p6aXJ3eG9nZXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjcxODcsImV4cCI6MjA3Njk0MzE4N30.MpQ1FU4Wmc_kbZnevScMay4sALMN1mPN3sbTn5e3sfk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findAllCustomers() {
  console.log('=== ALL CUSTOMERS ===\n');

  // Check customers table
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('company_name');

  console.log(`Customers table (${customers?.length || 0} records):`);
  customers?.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.company_name} (ID: ${c.id})`);
  });

  // Check for duplicates
  if (customers && customers.length > 0) {
    const nameMap = new Map();

    customers.forEach(c => {
      const normalized = c.company_name.trim().toLowerCase();
      if (!nameMap.has(normalized)) {
        nameMap.set(normalized, []);
      }
      nameMap.get(normalized).push(c);
    });

    console.log('\n=== DUPLICATES ===\n');
    let foundDuplicates = false;

    nameMap.forEach((records, normalizedName) => {
      if (records.length > 1) {
        foundDuplicates = true;
        console.log(`"${normalizedName}" appears ${records.length} times:`);
        records.forEach(r => {
          console.log(`  - ID: ${r.id}, Name: "${r.company_name}"`);
        });
        console.log('');
      }
    });

    if (!foundDuplicates) {
      console.log('No exact duplicates found in customers table.');
    }
  }

  console.log('\n=== CUSTOMER NAMES IN DOSSIERS ===\n');

  const { data: dossierCustomers } = await supabase
    .from('dossiers')
    .select('customer_name')
    .not('customer_name', 'is', null)
    .neq('customer_name', '');

  if (dossierCustomers && dossierCustomers.length > 0) {
    const uniqueNames = [...new Set(dossierCustomers.map(d => d.customer_name))].sort();
    console.log(`Unique customer names in dossiers (${uniqueNames.length}):`);
    uniqueNames.forEach((name, i) => {
      console.log(`  ${i + 1}. ${name}`);
    });
  } else {
    console.log('No customer names found in dossiers.');
  }

  console.log('\n=== EINDGEBRUIKERS ===\n');

  const { data: eindgebruikers } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, active')
    .eq('role', 'eindgebruiker')
    .eq('active', true);

  console.log(`Eindgebruikers (${eindgebruikers?.length || 0}):`);
  eindgebruikers?.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.full_name || u.email} (ID: ${u.id})`);
  });
}

findAllCustomers().catch(console.error);
