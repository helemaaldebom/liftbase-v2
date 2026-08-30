import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wcjegvxnojzirwxogesj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjamVndnhub2p6aXJ3eG9nZXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjcxODcsImV4cCI6MjA3Njk0MzE4N30.MpQ1FU4Wmc_kbZnevScMay4sALMN1mPN3sbTn5e3sfk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixGeneralEquipment() {
  console.log('=== FIXING GENERAL EQUIPMENT DUPLICATES ===\n');

  // Step 1: Find all customers with "General Equipment" in the name
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .ilike('company_name', '%General Equipment%')
    .order('created_at'); // Keep the oldest one

  if (error) {
    console.error('Error fetching customers:', error);
    return;
  }

  if (!customers || customers.length === 0) {
    console.log('No "General Equipment" customers found in customers table.');
  } else {
    console.log(`Found ${customers.length} customer(s) with "General Equipment":`);
    customers.forEach((c, i) => {
      console.log(`  ${i + 1}. ID: ${c.id}, Name: "${c.company_name}"`);
    });

    if (customers.length > 1) {
      console.log('\nMerging duplicates...');

      // Keep the first (oldest) customer
      const keepCustomer = customers[0];
      const duplicateCustomers = customers.slice(1);

      // Update the name of the customer we're keeping to "General Equipmet Ltd"
      const { error: updateError } = await supabase
        .from('customers')
        .update({ company_name: 'General Equipmet Ltd' })
        .eq('id', keepCustomer.id);

      if (updateError) {
        console.error('Error updating customer name:', updateError);
        return;
      }

      console.log(`✓ Updated "${keepCustomer.company_name}" to "General Equipmet Ltd"`);

      // Update all related records
      for (const duplicate of duplicateCustomers) {
        console.log(`\nProcessing duplicate: ${duplicate.company_name} (ID: ${duplicate.id})`);

        // Update maintenance_documents
        const { data: docs } = await supabase
          .from('maintenance_documents')
          .select('id')
          .eq('customer_id', duplicate.id);

        if (docs && docs.length > 0) {
          const { error: docError } = await supabase
            .from('maintenance_documents')
            .update({ customer_id: keepCustomer.id })
            .eq('customer_id', duplicate.id);

          if (docError) {
            console.error('  Error updating maintenance documents:', docError);
          } else {
            console.log(`  ✓ Updated ${docs.length} maintenance document(s)`);
          }
        }

        // Update temporary_dossier_access
        const { data: accesses } = await supabase
          .from('temporary_dossier_access')
          .select('id')
          .eq('customer_id', duplicate.id);

        if (accesses && accesses.length > 0) {
          const { error: accessError } = await supabase
            .from('temporary_dossier_access')
            .update({ customer_id: keepCustomer.id })
            .eq('customer_id', duplicate.id);

          if (accessError) {
            console.error('  Error updating temporary access:', accessError);
          } else {
            console.log(`  ✓ Updated ${accesses.length} temporary access record(s)`);
          }
        }

        // Delete the duplicate customer
        const { error: deleteError } = await supabase
          .from('customers')
          .delete()
          .eq('id', duplicate.id);

        if (deleteError) {
          console.error('  Error deleting duplicate customer:', deleteError);
        } else {
          console.log(`  ✓ Deleted duplicate customer`);
        }
      }

      console.log(`\n✓ Merged ${duplicateCustomers.length} duplicate(s) into one customer`);
    } else {
      console.log('\nOnly one customer found, updating name to "General Equipmet Ltd"...');

      const { error: updateError } = await supabase
        .from('customers')
        .update({ company_name: 'General Equipmet Ltd' })
        .eq('id', customers[0].id);

      if (updateError) {
        console.error('Error updating customer name:', updateError);
      } else {
        console.log('✓ Updated customer name');
      }
    }
  }

  // Step 2: Also update any dossiers with General Equipment variations
  console.log('\nChecking dossiers...');

  const { data: dossiers } = await supabase
    .from('dossiers')
    .select('id, customer_name')
    .ilike('customer_name', '%General Equipment%')
    .neq('customer_name', 'General Equipmet Ltd');

  if (dossiers && dossiers.length > 0) {
    console.log(`Found ${dossiers.length} dossier(s) with General Equipment variations`);

    const { error: dossierError } = await supabase
      .from('dossiers')
      .update({ customer_name: 'General Equipmet Ltd' })
      .ilike('customer_name', '%General Equipment%')
      .neq('customer_name', 'General Equipmet Ltd');

    if (dossierError) {
      console.error('Error updating dossiers:', dossierError);
    } else {
      console.log('✓ Updated all dossiers to use "General Equipmet Ltd"');
    }
  } else {
    console.log('No dossiers need updating');
  }

  console.log('\n=== COMPLETE ===');
}

fixGeneralEquipment().catch(console.error);
