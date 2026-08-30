import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wcjegvxnojzirwxogesj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjamVndnhub2p6aXJ3eG9nZXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjcxODcsImV4cCI6MjA3Njk0MzE4N30.MpQ1FU4Wmc_kbZnevScMay4sALMN1mPN3sbTn5e3sfk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function mergeGeneralEquipment() {
  console.log('Finding General Equipment Ltd duplicates...\n');

  // Find all customers with "General Equipment" in the name
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .ilike('company_name', '%General Equipment%');

  if (error) {
    console.error('Error fetching customers:', error);
    return;
  }

  console.log('Found customers:');
  customers?.forEach((c, i) => {
    console.log(`${i + 1}. ID: ${c.id}, Name: "${c.company_name}"`);
  });

  if (!customers || customers.length < 2) {
    console.log('\nNo duplicates found to merge.');
    return;
  }

  console.log('\n=== MERGING DUPLICATES ===\n');

  // Keep the first one and update its name to "General Equipmet Ltd"
  const keepCustomerId = customers[0].id;
  const mergeCustomerIds = customers.slice(1).map(c => c.id);

  console.log(`Keeping customer ID: ${keepCustomerId}`);
  console.log(`Merging customer IDs: ${mergeCustomerIds.join(', ')}`);

  // Update the name of the customer we're keeping
  const { error: updateError } = await supabase
    .from('customers')
    .update({ company_name: 'General Equipmet Ltd' })
    .eq('id', keepCustomerId);

  if (updateError) {
    console.error('Error updating customer name:', updateError);
    return;
  }
  console.log(`✓ Updated customer name to "General Equipmet Ltd"`);

  // Update all maintenance documents that reference the duplicate customers
  const { data: documents } = await supabase
    .from('maintenance_documents')
    .select('id, customer_id')
    .in('customer_id', mergeCustomerIds);

  if (documents && documents.length > 0) {
    const { error: docError } = await supabase
      .from('maintenance_documents')
      .update({ customer_id: keepCustomerId })
      .in('customer_id', mergeCustomerIds);

    if (docError) {
      console.error('Error updating maintenance documents:', docError);
    } else {
      console.log(`✓ Updated ${documents.length} maintenance document(s)`);
    }
  } else {
    console.log('No maintenance documents to update');
  }

  // Update all temporary access records
  const { data: accesses } = await supabase
    .from('temporary_dossier_access')
    .select('id, customer_id')
    .in('customer_id', mergeCustomerIds);

  if (accesses && accesses.length > 0) {
    const { error: accessError } = await supabase
      .from('temporary_dossier_access')
      .update({ customer_id: keepCustomerId })
      .in('customer_id', mergeCustomerIds);

    if (accessError) {
      console.error('Error updating temporary access:', accessError);
    } else {
      console.log(`✓ Updated ${accesses.length} temporary access record(s)`);
    }
  } else {
    console.log('No temporary access records to update');
  }

  // Delete the duplicate customers
  const { error: deleteError } = await supabase
    .from('customers')
    .delete()
    .in('id', mergeCustomerIds);

  if (deleteError) {
    console.error('Error deleting duplicate customers:', deleteError);
  } else {
    console.log(`✓ Deleted ${mergeCustomerIds.length} duplicate customer(s)`);
  }

  console.log('\n✓ Merge complete!');
}

mergeGeneralEquipment().catch(console.error);
