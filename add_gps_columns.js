import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wcjegvxnojzirwxogesj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjamVndnhub2p6aXJ3eG9nZXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjcxODcsImV4cCI6MjA3Njk0MzE4N30.MpQ1FU4Wmc_kbZnevScMay4sALMN1mPN3sbTn5e3sfk'
);

async function addGPSColumns() {
  console.log('Adding GPS columns to dossiers table...\n');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS latitude decimal(10, 8);
      ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS longitude decimal(11, 8);
    `
  });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Success! GPS columns added.');
}

addGPSColumns();
