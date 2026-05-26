import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImportResult {
  success: boolean;
  imported?: number;
  errors?: number;
  skipped?: number;
  errorDetails?: string[];
  error?: string;
}

interface MarktdataImportPageProps {
  onNavigate: (page: string) => void;
}

export function MarktdataImportPage({ onNavigate }: MarktdataImportPageProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [csvData, setCsvData] = useState<any[] | null>(null);
  const [marktdataCount, setMarktdataCount] = useState<number | null>(null);

  // Parse CSV line with proper quote handling
  const parseCSVLine = (line: string, separator: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === separator && !inQuotes) {
        // Field separator outside quotes
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    values.push(current.trim());
    return values;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResult(null);
    setCsvData(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      // Detect separator (comma or semicolon) based on first line
      const firstLine = lines[0];
      const separator = firstLine.includes(';') ? ';' : ',';

      // Parse CSV header
      const headers = parseCSVLine(firstLine, separator).map(h => h.replace(/^"|"$/g, ''));

      // Parse CSV rows
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line, separator);
        const row: any = {};

        headers.forEach((header, index) => {
          const value = values[index] || '';
          // Remove surrounding quotes if present
          row[header] = value.replace(/^"|"$/g, '').trim();
        });

        rows.push(row);
      }

      setCsvData(rows);

      // Show preview of first few rows
      const preview = [];
      preview.push(`CSV geladen: ${rows.length} rijen gevonden`);
      preview.push(`Kolomnamen: ${headers.join(', ')}`);

      if (rows.length > 0) {
        preview.push(`\nVoorbeeld eerste rij:`);
        const firstRow = rows[0];
        Object.keys(firstRow).slice(0, 10).forEach(key => {
          preview.push(`  ${key}: "${firstRow[key]}"`);
        });
      }

      setResult({
        success: true,
        imported: 0,
        errors: 0,
        errorDetails: preview
      });
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Fout bij het lezen van CSV'
      });
    }
  };

  const loadMarktdataCount = async () => {
    try {
      const { count } = await supabase
        .from('dossiers')
        .select('id', { count: 'exact', head: true })
        .eq('is_marktdata', true);

      setMarktdataCount(count || 0);
    } catch (error) {
      console.error('Error loading count:', error);
    }
  };

  const handleImport = async () => {
    if (!csvData) return;

    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Niet ingelogd');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-marktdata`;

      console.log('Importing', csvData.length, 'rows');
      console.log('First row:', csvData[0]);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvData }),
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      const data = JSON.parse(responseText);
      console.log('Parsed response:', data);

      setResult(data);
      await loadMarktdataCount();
    } catch (error) {
      console.error('Import error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Import fout'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Weet je zeker dat je ALLE marktdata wilt verwijderen? Dit kan niet ongedaan gemaakt worden!')) {
      return;
    }

    setDeleting(true);
    setResult(null);

    try {
      console.log('Starting delete of all marktdata...');

      const { error, count, data } = await supabase
        .from('dossiers')
        .delete({ count: 'exact' })
        .eq('is_marktdata', true);

      console.log('Delete result:', { error, count, data });

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      setResult({
        success: true,
        imported: 0,
        errors: 0,
        errorDetails: [`Succesvol ${count || 0} marktdata records verwijderd`]
      });

      await loadMarktdataCount();
    } catch (error) {
      console.error('Delete catch error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Verwijder fout'
      });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadMarktdataCount();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Terug
              </button>
              <Upload className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Marktdata Import
              </h1>
            </div>
            {marktdataCount !== null && marktdataCount > 0 && (
              <div className="text-sm text-gray-600">
                {marktdataCount} marktdata records in database
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV Bestand
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                  disabled={loading}
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <FileText className="w-12 h-12 text-gray-400 mb-3" />
                  <span className="text-sm font-medium text-gray-700">
                    Klik om een CSV bestand te selecteren
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    Of sleep het bestand hierheen
                  </span>
                </label>
              </div>
            </div>

            {/* Import Button */}
            {csvData && (
              <button
                onClick={handleImport}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Importeren...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Import Starten ({csvData.length} records)
                  </>
                )}
              </button>
            )}

            {/* Results */}
            {result && (
              <div className={`rounded-lg p-6 ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-2 ${
                      result.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {result.success ? 'Import Resultaat' : 'Import Fout'}
                    </h3>

                    {result.imported !== undefined && (
                      <div className="space-y-1 text-sm">
                        <p className="text-green-800">
                          ✓ Succesvol geïmporteerd: <strong>{result.imported}</strong> records
                        </p>
                        {result.skipped !== undefined && result.skipped > 0 && (
                          <p className="text-yellow-800">
                            ⊘ Overgeslagen: <strong>{result.skipped}</strong> records (lege merk/type)
                          </p>
                        )}
                        {result.errors! > 0 && (
                          <p className="text-red-800">
                            ✗ Fouten: <strong>{result.errors}</strong> records
                          </p>
                        )}
                      </div>
                    )}

                    {result.error && (
                      <p className="text-red-800 text-sm">{result.error}</p>
                    )}

                    {result.errorDetails && result.errorDetails.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Details:
                        </p>
                        <ul className="text-sm text-gray-600 space-y-1 max-h-40 overflow-y-auto">
                          {result.errorDetails.map((detail, index) => (
                            <li key={index} className="font-mono text-xs">
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Delete All Button */}
            {marktdataCount !== null && marktdataCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">
                      Verwijder Alle Marktdata
                    </h3>
                    <p className="text-sm text-red-700">
                      Dit verwijdert alle {marktdataCount} marktdata records uit de database. Deze actie kan niet ongedaan gemaakt worden.
                    </p>
                  </div>
                  <button
                    onClick={handleDeleteAll}
                    disabled={deleting}
                    className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    {deleting ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Verwijderen...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-5 h-5" />
                        Verwijder Alles
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">
                Instructies
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex gap-2">
                  <span className="text-blue-600">1.</span>
                  <span>Upload een CSV bestand met marktdata (comma of semicolon-separated)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">2.</span>
                  <span>Het bestand moet de volgende kolommen bevatten: Merk, Type, Bouwjaar, Type of machine, etc.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">3.</span>
                  <span>Klik op "Import Starten" om de data in de database te laden</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">4.</span>
                  <span>De import kan enkele minuten duren voor grote bestanden</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
