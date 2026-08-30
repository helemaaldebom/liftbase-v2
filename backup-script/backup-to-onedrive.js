import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURATIE - PAS DIT AAN!
const CONFIG = {
  // Jouw OneDrive pad - bijvoorbeeld: 'C:\\Users\\JouwNaam\\OneDrive\\Backups'
  onedriveBackupPath: 'C:\\Users\\GEBRUIKERSNAAM\\OneDrive\\HC-Lifters-Backups',

  // Hoeveel oude backups wil je bewaren?
  keepBackups: 6, // 6 maanden

  // Supabase credentials (lees uit .env of zet hier)
  supabaseUrl: process.env.VITE_SUPABASE_URL || 'VITE_SUPABASE_URL',
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || 'VITE_SUPABASE_ANON_KEY'
};

// Check of configuratie geldig is
if (!fs.existsSync(CONFIG.onedriveBackupPath)) {
  console.error(`❌ OneDrive pad bestaat niet: ${CONFIG.onedriveBackupPath}`);
  console.error('Pas CONFIG.onedriveBackupPath aan in dit script!');
  process.exit(1);
}

const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

async function fetchAllData() {
  console.log('📥 Data ophalen van Supabase...');

  const data = {};

  // Dossiers
  const { data: dossiers, error: dossiersError } = await supabase
    .from('dossiers')
    .select('*')
    .order('created_at', { ascending: false });
  if (dossiersError) throw dossiersError;
  data.dossiers = dossiers;
  console.log(`   ✓ ${dossiers.length} dossiers`);

  // Bids
  const { data: bids, error: bidsError } = await supabase
    .from('bids')
    .select('*')
    .order('created_at', { ascending: false });
  if (bidsError) throw bidsError;
  data.bids = bids;
  console.log(`   ✓ ${bids.length} bids`);

  // Dealers
  const { data: dealers, error: dealersError } = await supabase
    .from('dealers')
    .select('*')
    .order('created_at', { ascending: false });
  if (dealersError) throw dealersError;
  data.dealers = dealers;
  console.log(`   ✓ ${dealers.length} dealers`);

  // Marktdata
  const { data: marktdata, error: marktdataError } = await supabase
    .from('marktdata')
    .select('*')
    .order('created_at', { ascending: false });
  if (marktdataError) throw marktdataError;
  data.marktdata = marktdata;
  console.log(`   ✓ ${marktdata.length} marktdata records`);

  // Detail tables
  const detailTables = [
    'forklift_details',
    'empty_container_handler_details',
    'reachstacker_details',
    'terminal_tractor_details'
  ];

  for (const table of detailTables) {
    const { data: details, error } = await supabase
      .from(table)
      .select('*');
    if (error) throw error;
    data[table] = details;
    console.log(`   ✓ ${details.length} ${table}`);
  }

  // Photos metadata
  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('*');
  if (photosError) throw photosError;
  data.photos = photos;
  console.log(`   ✓ ${photos.length} photos`);

  // User profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('*');
  if (profilesError) throw profilesError;
  data.user_profiles = profiles;
  console.log(`   ✓ ${profiles.length} user profiles`);

  // Advertisements
  const { data: ads, error: adsError } = await supabase
    .from('advertisements')
    .select('*');
  if (adsError) throw adsError;
  data.advertisements = ads;
  console.log(`   ✓ ${ads.length} advertisements`);

  return data;
}

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupName = `hclifters-backup-${timestamp}`;
  const tempDir = path.join(__dirname, 'temp', backupName);
  const zipPath = path.join(CONFIG.onedriveBackupPath, `${backupName}.zip`);

  console.log('\n🔧 HC-Lifters Database Backup');
  console.log(`📅 Datum: ${new Date().toLocaleString('nl-NL')}`);
  console.log('═'.repeat(50));

  try {
    // Maak temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    // Haal alle data op
    const data = await fetchAllData();

    // Schrijf data naar JSON bestanden
    console.log('\n💾 JSON bestanden maken...');
    for (const [table, records] of Object.entries(data)) {
      const filePath = path.join(tempDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
      console.log(`   ✓ ${table}.json`);
    }

    // Maak metadata bestand
    const metadata = {
      backup_date: new Date().toISOString(),
      backup_timestamp: timestamp,
      record_counts: Object.fromEntries(
        Object.entries(data).map(([table, records]) => [table, records.length])
      ),
      supabase_project: CONFIG.supabaseUrl,
      total_records: Object.values(data).reduce((sum, records) => sum + records.length, 0)
    };

    fs.writeFileSync(
      path.join(tempDir, 'backup-info.json'),
      JSON.stringify(metadata, null, 2)
    );
    console.log('   ✓ backup-info.json');

    // Maak ZIP bestand
    console.log('\n📦 ZIP bestand maken...');
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
        console.log(`   ✓ ${backupName}.zip (${sizeMB} MB)`);
        resolve();
      });

      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(tempDir, false);
      archive.finalize();
    });

    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true });

    // Verwijder oude backups
    cleanOldBackups();

    console.log('\n✅ Backup succesvol!');
    console.log(`📂 Opgeslagen in: ${zipPath}`);
    console.log(`📊 Totaal records: ${metadata.total_records}`);
    console.log('═'.repeat(50));

  } catch (error) {
    console.error('\n❌ Backup mislukt:', error.message);
    process.exit(1);
  }
}

function cleanOldBackups() {
  console.log(`\n🧹 Oude backups opruimen (bewaar ${CONFIG.keepBackups})...`);

  const files = fs.readdirSync(CONFIG.onedriveBackupPath)
    .filter(f => f.startsWith('hclifters-backup-') && f.endsWith('.zip'))
    .map(f => ({
      name: f,
      path: path.join(CONFIG.onedriveBackupPath, f),
      time: fs.statSync(path.join(CONFIG.onedriveBackupPath, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > CONFIG.keepBackups) {
    const toDelete = files.slice(CONFIG.keepBackups);
    for (const file of toDelete) {
      fs.unlinkSync(file.path);
      console.log(`   ✗ Verwijderd: ${file.name}`);
    }
  } else {
    console.log('   ✓ Geen oude backups om te verwijderen');
  }
}

// Start backup
createBackup();
