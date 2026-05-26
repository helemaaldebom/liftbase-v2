import React, { useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DocumentUploadProps {
  dossierId: string;
  onUploadComplete: () => void;
}

const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.ms-outlook': '.msg',
};

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.msg'];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function DocumentUpload({ dossierId, onUploadComplete }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const validateFile = (file: File): string | null => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidMimeType = Object.keys(ACCEPTED_TYPES).includes(file.type);
    const isValidExtension = ACCEPTED_EXTENSIONS.includes(fileExtension);

    if (!isValidMimeType && !isValidExtension) {
      return 'Alleen PDF, Word, Excel en Outlook e-mail bestanden zijn toegestaan';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Bestand is te groot (max 50MB)';
    }
    return null;
  };

  const uploadMultipleDocuments = async (files: FileList | File[]) => {
    setUploading(true);
    setError(null);

    const filesArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate all files first
    for (const file of filesArray) {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      setError(errors.join(', '));
      if (validFiles.length === 0) {
        setUploading(false);
        return;
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Niet ingelogd');

      // Upload all valid files
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress(`Uploaden ${i + 1} van ${validFiles.length}...`);

        // Create unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${dossierId}/${Date.now()}_${i}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('dossier-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create database record
        const { error: dbError } = await supabase
          .from('dossier_attachments')
          .insert({
            dossier_id: dossierId,
            file_name: file.name,
            file_path: fileName,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user.id,
          });

        if (dbError) throw dbError;
      }

      setUploadProgress('');
      onUploadComplete();
    } catch (err) {
      console.error('Error uploading documents:', err);
      setError(err instanceof Error ? err.message : 'Fout bij uploaden');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadMultipleDocuments(files);
    }
    // Reset input so same files can be uploaded again if needed
    e.target.value = '';
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadMultipleDocuments(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <label className="cursor-pointer">
            <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {uploading ? (
                <>
                  <Upload className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  {uploadProgress || 'Uploaden...'}
                </>
              ) : (
                <>
                  <Upload className="-ml-1 mr-2 h-4 w-4" />
                  Selecteer bestand(en)
                </>
              )}
            </span>
            <input
              type="file"
              className="hidden"
              accept={Object.values(ACCEPTED_TYPES).join(',')}
              onChange={handleFileInput}
              disabled={uploading}
              multiple
            />
          </label>
          <p className="text-sm text-gray-500">
            of sleep bestanden hierheen
          </p>
          <p className="text-xs text-gray-400">
            Meerdere bestanden mogelijk - PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Outlook e-mail (.msg) tot 50MB per bestand
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
