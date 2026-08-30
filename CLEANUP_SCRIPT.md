# Cleanup Script voor Maintenance Documents

## Instructies:

1. **Open je app** in de browser
2. **Open de Developer Console** (F12 of Ctrl+Shift+J)
3. **Plak het onderstaande script** in de console
4. **Druk op Enter**
5. **Wacht tot je "✓ Cleanup complete!" ziet**
6. **Refresh de pagina** (Ctrl+Shift+R)
7. **Upload de bestanden opnieuw**

## Script:

```javascript
(async () => {
  console.log('🧹 Starting cleanup...');

  // Import Supabase if needed
  const supabaseUrl = 'https://bvpfcbupzjazhjlimmnl.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2cGZjYnVwemp6emhqbGltbW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg1NjEwNDIsImV4cCI6MjA0NDEzNzA0Mn0.fEpBBB-vFzHOiVP8rGv38gD8m5pNWbSA0Tyx3nrXvIM';

  // Get supabase from window (already loaded in your app)
  const supabase = window.supabase || (await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')).createClient(supabaseUrl, supabaseKey);

  try {
    // Step 1: Get all documents
    console.log('📋 Step 1: Fetching all maintenance documents...');
    const { data: docs, error: fetchError } = await supabase
      .from('maintenance_documents')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching documents:', fetchError);
      return;
    }

    console.log(`📊 Found ${docs?.length || 0} documents in database`);

    // Step 2: List all files in storage
    console.log('📁 Step 2: Listing files in storage...');
    const { data: folders, error: listError } = await supabase.storage
      .from('maintenance-documents')
      .list('');

    if (listError) {
      console.warn('⚠️ Error listing storage:', listError.message);
    } else {
      console.log(`📦 Found ${folders?.length || 0} folders in storage`);

      // Step 3: Delete all files from storage
      if (folders && folders.length > 0) {
        console.log('🗑️ Step 3: Deleting files from storage...');
        for (const folder of folders) {
          // List files in each folder
          const { data: files } = await supabase.storage
            .from('maintenance-documents')
            .list(folder.name);

          if (files && files.length > 0) {
            const filePaths = files.map(f => `${folder.name}/${f.name}`);
            const { error: deleteError } = await supabase.storage
              .from('maintenance-documents')
              .remove(filePaths);

            if (deleteError) {
              console.warn(`⚠️ Could not delete files in ${folder.name}:`, deleteError.message);
            } else {
              console.log(`✓ Deleted ${filePaths.length} files from ${folder.name}`);
            }
          }
        }
      }
    }

    // Step 4: Delete all database records
    console.log('🗄️ Step 4: Deleting all database records...');
    const { error: deleteError } = await supabase
      .from('maintenance_documents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('❌ Error deleting records:', deleteError);
    } else {
      console.log('✓ All database records deleted!');
    }

    // Step 5: Verify cleanup
    console.log('🔍 Step 5: Verifying cleanup...');
    const { data: remainingDocs } = await supabase
      .from('maintenance_documents')
      .select('id');

    console.log(`📊 Remaining documents: ${remainingDocs?.length || 0}`);
    console.log('✅ Cleanup complete! Refresh the page and try uploading again.');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
})();
```
