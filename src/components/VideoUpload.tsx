import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, Loader2, Video as VideoIcon } from 'lucide-react';

interface VideoUploadProps {
  dossierId: string;
  onUploadComplete: () => void;
}

export function VideoUpload({ dossierId, onUploadComplete }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mpeg'];
    if (!validTypes.includes(file.type)) {
      return 'Alleen video bestanden (MP4, MOV, AVI, WebM, MPEG) zijn toegestaan';
    }

    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return 'Bestand is te groot. Maximaal 500MB toegestaan';
    }

    return null;
  };

  const uploadFile = async (file: File, orderIndex: number): Promise<{ success: boolean; error?: string }> => {
    console.log(`Uploading video: ${file.name}, size: ${file.size}, type: ${file.type}`);

    const validationError = validateFile(file);
    if (validationError) {
      console.error(`Validation failed for ${file.name}:`, validationError);
      return { success: false, error: validationError };
    }

    try {
      const { data: existingVideos, error: selectError } = await supabase
        .from('videos')
        .select('display_order')
        .eq('dossier_id', dossierId)
        .order('display_order', { ascending: false })
        .limit(1);

      if (selectError) {
        console.error(`Error getting existing videos for ${file.name}:`, selectError);
        throw new Error(`Database fout: ${selectError.message}`);
      }

      const maxOrder = existingVideos && existingVideos.length > 0 ? existingVideos[0].display_order : -1;
      const newDisplayOrder = maxOrder + 1 + orderIndex;

      const fileExt = file.name.split('.').pop();
      const fileName = `${dossierId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      console.log(`Uploading ${file.name} to storage as ${fileName}`);
      const { error: uploadError } = await supabase.storage
        .from('dossier-videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error(`Storage upload failed for ${file.name}:`, uploadError);
        throw new Error(`Storage fout: ${uploadError.message}`);
      }

      console.log(`Inserting ${file.name} into database`);
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase
        .from('videos')
        .insert({
          dossier_id: dossierId,
          storage_path: fileName,
          filename: file.name,
          file_size_bytes: file.size,
          display_order: newDisplayOrder,
          created_by: user?.id,
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
    setProgress(`Voorbereiden van ${files.length} video's...`);

    setProgress(`Uploaden ${files.length} video's...`);

    const uploadPromises = files.map((file, index) => uploadFile(file, index));
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
      setError(`${failCount} van ${files.length} video's zijn mislukt: ${failedDetails}`);
    }

    if (successCount > 0) {
      onUploadComplete();
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
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
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/mpeg"
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
              <VideoIcon className="w-12 h-12 text-blue-600" />
            ) : (
              <Upload className="w-12 h-12 text-slate-400" />
            )}
            <div>
              <p className="text-base font-medium text-slate-700">
                Sleep video's hierheen of klik om te uploaden
              </p>
              <p className="text-sm text-slate-500 mt-1">
                MP4, MOV, AVI, WebM, MPEG
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Maximaal 500MB per video
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
    </div>
  );
}
