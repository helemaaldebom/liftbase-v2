import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wcjegvxnojzirwxogesj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjamVndnhub2p6aXJ3eG9nZXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjcxODcsImV4cCI6MjA3Njk0MzE4N30.MpQ1FU4Wmc_kbZnevScMay4sALMN1mPN3sbTn5e3sfk';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSalePriceColumn() {
  console.log('Adding sale_price column to dossiers table...');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS sale_price numeric'
  });

  if (error) {
    console.error('Error adding column:', error);
    console.log('\nTrying alternative method...');

    // Try to check if column exists
    const { data: checkData, error: checkError } = await supabase
      .from('dossiers')
      .select('sale_price')
      .limit(1);

    if (checkError) {
      if (checkError.message.includes('column') && checkError.message.includes('does not exist')) {
        console.error('\nColumn does not exist yet. Please run this SQL manually in Supabase Dashboard:');
        console.log('\nALTER TABLE dossiers ADD COLUMN sale_price numeric;\n');
      } else {
        console.error('Check error:', checkError);
      }
    } else {
      console.log('✓ Column already exists or was added successfully!');
    }
  } else {
    console.log('✓ Column added successfully!');
  }
}

addSalePriceColumn();
