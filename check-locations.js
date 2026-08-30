import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ouhvgnmxsebomzlcrrvg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aHZnbm14c2Vib216bGNycnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg1NjI5NjksImV4cCI6MjA0NDEzODk2OX0.jLgkkzvAhBMPGUy7fJ_OB1oXK0UkEUxrvGGYdZPJ7Mg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data: soldDossiers, error } = await supabase
  .from('dossiers')
  .select('dossier_number, brand, model, location, latitude, longitude')
  .eq('status', 'sold')
  .order('dossier_number');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('\n=== VERKOCHTE DOSSIERS ===\n');
console.log(`Totaal verkochte dossiers: ${soldDossiers.length}`);

const onMap = soldDossiers.filter(d => d.location && d.location.trim() !== '' && d.latitude && d.longitude);
const missingLocation = soldDossiers.filter(d => !d.location || d.location.trim() === '');

console.log(`Op de kaart (met locatie én coördinaten): ${onMap.length}`);
console.log(`Zonder locatie: ${missingLocation.length}\n`);

if (missingLocation.length > 0) {
  console.log('=== DOSSIERS ZONDER LOCATIE ===');
  missingLocation.forEach(d => {
    console.log(`  ${d.dossier_number} - ${d.brand} ${d.model}`);
  });
}
