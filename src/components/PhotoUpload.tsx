import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File, maxSizeMB: number = 4.5): Promise<File> => {
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

  const uploadFile = async (file: File, orderIndex: number): Promise<{ success: boolean; error?: string }> => {
    console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    const validationError = validateFile(file);
    if (validationError) {
      console.error(`Validation failed for ${file.name}:`, validationError);
      return { success: false, error: validationError };
    }

    try {
      const { data: existingPhotos, error: selectError } = await supabase
        .from('photos')
        .select('display_order')
        .eq('dossier_id', dossierId)
        .order('display_order', { ascending: false })
        .limit(1);

      if (selectError) {
        console.error(`Error getting existing photos for ${file.name}:`, selectError);
        throw new Error(`Database fout: ${selectError.message}`);
      }

      const maxOrder = existingPhotos && existingPhotos.length > 0 ? existingPhotos[0].display_order : -1;
      const newDisplayOrder = maxOrder + 1 + orderIndex;

      const fileExt = file.name.split('.').pop();
      const fileName = `${dossierId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      console.log(`Uploading ${file.name} to storage as ${fileName}`);
      const { error: uploadError } = await supabase.storage
        .from('dossier-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error(`Storage upload failed for ${file.name}:`, uploadError);
        throw new Error(`Storage fout: ${uploadError.message}`);
      }

      console.log(`Inserting ${file.name} into database`);
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

      if (dbError) {
        console.error(`Database insert failed for ${file.name}:`, dbError);
        throw new Error(`Database fout: ${dbError.message}`);
      }

      console.log(`Successfully uploaded ${file.name}`);
      return { success: true };
    } catch (err: any) {
      console.error(`Upload error for ${file.name}:`, err);
      return { success: false, error: err.message || 'Upload mislukt' };
    }
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
      setCompressionInfo(`${compressedCount} foto's automatisch verkleind naar max. 4.5MB`);
    }

    setProgress(`Uploaden ${compressedFiles.length} foto's...`);

    const uploadPromises = compressedFiles.map((file, index) => uploadFile(file, index));
    const results = await Promise.all(uploadPromises);

    let successCount = 0;
    let failCount = 0;

    results.forEach((result, index) => {
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    });

    setUploading(false);
    setProgress('');

    if (failCount > 0) {
      const failedDetails = results
        .map((r, i) => ({ ...r, file: files[i].name }))
        .filter(r => !r.success)
        .map(r => `${r.file} (${r.error || 'Onbekende fout'})`)
        .join('. ');
      setError(`${failCount} van ${files.length} foto's zijn mislukt: ${failedDetails}`);
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
                Grote foto's worden automatisch verkleind naar 4.5MB
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

      {compressionInfo && (
        <div className="mt-3 flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <ImageIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">{compressionInfo}</p>
        </div>
      )}
    </div>
  );
}
