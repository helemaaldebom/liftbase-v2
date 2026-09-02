import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, Loader2, Image as ImageIcon, ChevronDown, ChevronUp, Copy, AlertCircle } from 'lucide-react';

interface UploadAttempt {
  attempt: number;
  error: string;
  type: string;
  timestamp: string;
}

interface UploadErrorEntry {
  filename: string;
  filesize: number;
  attempts: UploadAttempt[];
}

interface PhotoUploadProps {
  dossierId: string;
  onUploadComplete: () => void;
}

export function PhotoUpload({ dossierId, onUploadComplete }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<string>('');
  const [compressionInfo, setCompressionInfo] = useState<string>('');
  const [uploadErrorLog, setUploadErrorLog] = useState<UploadErrorEntry[]>([]);
  const [errorLogExpanded, setErrorLogExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classifyError = (err: any): { message: string; type: string } => {
    const msg = err?.message || err?.toString() || 'Onbekende fout';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
      return { message: msg, type: 'network' };
    }
    if (err?.statusCode || err?.status) {
      return { message: `HTTP ${err.statusCode || err.status}: ${msg}`, type: 'storage' };
    }
    if (msg.includes('duplicate') || msg.includes('violates') || msg.includes('unique')) {
      return { message: msg, type: 'database' };
    }
    return { message: msg, type: 'unknown' };
  };

  const compressImage = async (file: File, maxSizeMB: number = 2): Promise<File> => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.size <= maxSizeBytes) {
      return file;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onerror = () => {
        console.error('Error reading file for compression:', file.name);
        resolve(file);
      };

      reader.onload = (e) => {
        const img = new Image();

        img.onerror = () => {
          console.error('Error loading image for compression:', file.name);
          resolve(file);
        };

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          let quality = 0.9;
          const ratio = file.size / maxSizeBytes;

          if (ratio > 2) {
            const scale = Math.sqrt(2 / ratio);
            width = Math.floor(width * scale);
            height = Math.floor(height * scale);
            quality = 0.85;
          } else if (ratio > 1.5) {
            quality = 0.8;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
          }

          const tryCompress = (q: number) => {
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  if (blob.size <= maxSizeBytes || q <= 0.5) {
                    const compressedFile = new File([blob], file.name, {
                      type: 'image/jpeg',
                      lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                  } else {
                    tryCompress(q - 0.1);
                  }
                } else {
                  resolve(file);
                }
              },
              'image/jpeg',
              q
            );
          };

          tryCompress(quality);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return 'Alleen afbeeldingen (JPEG, PNG, WebP, GIF) zijn toegestaan';
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'Bestand is te groot. Maximaal 5MB toegestaan';
    }

    return null;
  };

  const uploadFile = async (file: File, orderIndex: number): Promise<{ success: boolean; errorEntry?: UploadErrorEntry }> => {
    console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    const validationError = validateFile(file);
    if (validationError) {
      return { success: false, errorEntry: { filename: file.name, filesize: file.size, attempts: [{ attempt: 0, error: validationError, type: 'validation', timestamp: new Date().toISOString() }] } };
    }

    const maxRetries = 5;
    const fileExt = file.name.split('.').pop();
    const fileName = `${dossierId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const attemptLog: UploadAttempt[] = [];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Uploading ${file.name} — poging ${attempt}/${maxRetries}`);

        const { data: existingPhotos, error: selectError } = await supabase
          .from('photos')
          .select('display_order')
          .eq('dossier_id', dossierId)
          .order('display_order', { ascending: false })
          .limit(1);

        if (selectError) throw new Error(`Database fout: ${selectError.message}`);

        const maxOrder = existingPhotos && existingPhotos.length > 0 ? existingPhotos[0].display_order : -1;
        const newDisplayOrder = maxOrder + 1 + orderIndex;

        const { error: uploadError } = await supabase.storage
          .from('dossier-photos')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          if (uploadError.message?.includes('already exists') || (uploadError as any).statusCode === '409') {
            console.log(`✓ Bestand bestaat al: ${file.name}`);
          } else {
            throw new Error(`Storage fout: ${uploadError.message}`);
          }
        }

        const { error: dbError } = await supabase
          .from('photos')
          .insert({
            dossier_id: dossierId,
            storage_path: fileName,
            filename: file.name,
            file_size_bytes: file.size,
            step_key: 'dossier',
            display_order: newDisplayOrder,
            quality_passed: true,
          });

        if (dbError) throw new Error(`Database fout: ${dbError.message}`);

        console.log(`✓ Upload succesvol: ${file.name}`);
        return { success: true };
      } catch (err: any) {
        const classified = classifyError(err);
        console.error(`Poging ${attempt} mislukt voor ${file.name}:`, err);
        attemptLog.push({ attempt, error: classified.message, type: classified.type, timestamp: new Date().toISOString() });
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        }
      }
    }

    console.error(`✗ Upload definitief mislukt na ${maxRetries} pogingen: ${file.name}`);
    return { success: false, errorEntry: { filename: file.name, filesize: file.size, attempts: attemptLog } };
  };

  const uploadMultipleFiles = async (files: File[]) => {
    setUploading(true);
    setError('');
    setCompressionInfo('');
    setProgress(`Voorbereiden van ${files.length} foto's...`);

    const compressedFiles: File[] = [];
    let compressedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const originalSize = files[i].size;
      const compressedFile = await compressImage(files[i]);
      compressedFiles.push(compressedFile);

      if (compressedFile.size < originalSize) {
        compressedCount++;
      }
    }

    if (compressedCount > 0) {
      setCompressionInfo(`${compressedCount} foto's automatisch verkleind naar max. 2 MB`);
    }

    setUploadErrorLog([]);
    setErrorLogExpanded(false);

    let successCount = 0;
    const errorEntries: UploadErrorEntry[] = [];

    for (let i = 0; i < compressedFiles.length; i++) {
      setProgress(`Uploaden ${i + 1} van ${compressedFiles.length} foto's...`);
      const result = await uploadFile(compressedFiles[i], i);
      if (result.success) {
        successCount++;
      } else if (result.errorEntry) {
        errorEntries.push(result.errorEntry);
      }
    }

    setUploading(false);
    setProgress('');

    if (errorEntries.length > 0) {
      setUploadErrorLog(errorEntries);
      setError(`${errorEntries.length} van ${compressedFiles.length} foto's zijn mislukt — zie details hieronder`);
    }

    if (successCount > 0) {
      onUploadComplete();
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      await uploadMultipleFiles(files);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadMultipleFiles(Array.from(files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-slate-400 bg-white'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-600">{progress || 'Uploaden...'}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            {dragActive ? (
              <ImageIcon className="w-12 h-12 text-blue-600" />
            ) : (
              <Upload className="w-12 h-12 text-slate-400" />
            )}
            <div>
              <p className="text-base font-medium text-slate-700">
                Sleep foto's hierheen of klik om te uploaden
              </p>
              <p className="text-sm text-slate-500 mt-1">
                JPEG, PNG, WebP of GIF
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Grote foto's worden automatisch verkleind naar 2 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {uploadErrorLog.length > 0 && (
        <div className="mt-2 border border-red-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setErrorLogExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {uploadErrorLog.length} foto{uploadErrorLog.length !== 1 ? "'s" : ''} mislukt — klik voor details
            </span>
            {errorLogExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {errorLogExpanded && (
            <div className="bg-white p-3 space-y-3 max-h-72 overflow-y-auto text-xs font-mono">
              <button
                onClick={() => {
                  const lines = uploadErrorLog.map(e => {
                    const attemptLines = e.attempts.map(a =>
                      `  poging ${a.attempt} [${a.timestamp}] (${a.type}): ${a.error}`
                    ).join('\n');
                    return `${e.filename} (${(e.filesize / 1024).toFixed(1)} KB)\n${attemptLines}`;
                  }).join('\n\n');
                  const header = `Upload error log — ${new Date().toLocaleString('nl-NL')}\nURL: ${window.location.href}\nUser-Agent: ${navigator.userAgent}\n\n`;
                  navigator.clipboard.writeText(header + lines);
                }}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-2"
              >
                <Copy className="w-3 h-3" /> Kopieer log voor support
              </button>

              {uploadErrorLog.map((entry, i) => (
                <div key={i} className="border-l-2 border-red-300 pl-3">
                  <div className="font-semibold text-gray-800">
                    {entry.filename} <span className="text-gray-400 font-normal">({(entry.filesize / 1024).toFixed(1)} KB)</span>
                  </div>
                  {entry.attempts.map((a, j) => (
                    <div key={j} className={`mt-1 ${a.type === 'network' ? 'text-orange-600' : a.type === 'storage' ? 'text-red-600' : a.type === 'database' ? 'text-purple-600' : 'text-gray-600'}`}>
                      poging {a.attempt} — <span className="bg-gray-100 px-1 rounded">{a.type}</span> — {a.error}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {compressionInfo && (
        <div className="mt-3 flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <ImageIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">{compressionInfo}</p>
        </div>
      )}
    </div>
  );
}
