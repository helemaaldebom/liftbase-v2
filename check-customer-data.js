import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wcjegvxnojzirwxogesj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjamVndnhub2p6aXJ3eG9nZXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjcxODcsImV4cCI6MjA3Njk0MzE4N30.MpQ1FU4Wmc_kbZnevScMay4sALMN1mPN3sbTn5e3sfk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCustomerData() {
  console.log('Checking customer data...\n');

  // Check dossiers table
  const { data: dossiers, error: dossierError } = await supabase
    .from('dossiers')
    .select('id, customer_name, dossier_number')
    .limit(10);

  console.log('Sample dossiers:');
  console.log(dossiers);
  console.log('');

  // Check customers table
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('*');

  console.log('Customers table:');
  console.log(customers);
  console.log('');

  // Get all unique customer names from dossiers (including null/empty)
  const { data: allDossiers } = await supabase
    .from('dossiers')
    .select('customer_name');

  const customerNames = allDossiers?.map(d => d.customer_name) || [];
  const nonNull = customerNames.filter(n => n !== null && n !== '');

  console.log(`Total dossiers: ${customerNames.length}`);
  console.log(`Dossiers with customer_name: ${nonNull.length}`);
  console.log(`Unique customer names:`, [...new Set(nonNull)]);
}

checkCustomerData().catch(console.error);
