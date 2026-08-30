import { useState, useCallback } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MaintenanceUploadProps {
  customerId: string;
  dossierId?: string;
  onUploadComplete?: () => void;
}

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
}

export default function MaintenanceUpload({ customerId, dossierId, onUploadComplete }: MaintenanceUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...uploadFiles]);
    uploadFiles.forEach(uploadFile => processFile(uploadFile));
  };

  const processFile = async (uploadFile: UploadFile) => {
    try {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'application/vnd.ms-excel', // xls
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];

      if (!allowedTypes.includes(uploadFile.file.type)) {
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', error: `File type ${uploadFile.file.type} is not supported. Please upload PDF, Excel, CSV, Word, or Image files.` }
            : f
        ));
        return;
      }

      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
      ));

      const fileBuffer = await uploadFile.file.arrayBuffer();
      const fileHash = await crypto.subtle.digest('SHA-256', fileBuffer);
      const hashArray = Array.from(new Uint8Array(fileHash));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Check for existing documents and ALWAYS delete them
      const { data: existing } = await supabase
        .from('maintenance_documents')
        .select('id')
        .eq('file_hash', hashHex)
        .eq('customer_id', customerId)
        .maybeSingle();

      if (existing) {
        console.log(`Deleting existing document ${existing.id} to allow re-upload...`);
        // Delete the old document and re-upload (temporary fix)
        await supabase
          .from('maintenance_documents')
          .delete()
          .eq('id', existing.id);
      }

      const fileName = `${customerId}/${Date.now()}_${uploadFile.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('maintenance-documents')
        .upload(fileName, uploadFile.file);

      if (uploadError) throw uploadError;

      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, progress: 50 } : f
      ));

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const { data: document, error: insertError } = await supabase
        .from('maintenance_documents')
        .insert({
          customer_id: customerId,
          dossier_id: dossierId || null,
          file_name: uploadFile.file.name,
          storage_path: fileName,
          file_type: uploadFile.file.type,
          file_size: uploadFile.file.size,
          file_hash: hashHex,
          match_status: dossierId ? 'manual' : 'pending',
          extraction_status: 'pending',
          uploaded_by: user?.id || null
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id
          ? { ...f, status: 'processing', progress: 75, documentId: document.id }
          : f
      ));

      // Try to call edge function for AI extraction, but don't fail if it doesn't work
      try {
        const fileBase64 = btoa(
          new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const { data: extractionResult, error: extractionError } = await supabase.functions.invoke(
          'extract-maintenance-document',
          {
            body: {
              document_id: document.id,
              file_base64: fileBase64,
              file_type: uploadFile.file.type,
              customer_id: customerId
            }
          }
        );

        if (extractionError) {
          console.warn('AI extraction skipped due to error:', extractionError);
          // Don't fail - just mark as manual_review_required
          await supabase
            .from('maintenance_documents')
            .update({
              extraction_status: 'manual_review_required',
              extraction_error: 'AI extraction unavailable: ' + (extractionError.message || 'Unknown error')
            })
            .eq('id', document.id);
        } else if (extractionResult && extractionResult.error) {
          console.warn('AI extraction returned error:', extractionResult.error);
          await supabase
            .from('maintenance_documents')
            .update({
              extraction_status: 'manual_review_required',
              extraction_error: 'AI extraction error: ' + extractionResult.error
            })
            .eq('id', document.id);
        }
      } catch (aiError) {
        console.warn('AI extraction failed, continuing without it:', aiError);
        // Update document status but don't fail the upload
        await supabase
          .from('maintenance_documents')
          .update({
            extraction_status: 'manual_review_required',
            extraction_error: 'AI extraction unavailable'
          })
          .eq('id', document.id);
      }

      // Continue with success even if AI extraction fails
      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: 'completed', progress: 100 } : f
      ));

      if (onUploadComplete) {
        onUploadComplete();
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id
          ? { ...f, status: 'error', error: error.message || 'Upload failed' }
          : f
      ));
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusText = (file: UploadFile) => {
    switch (file.status) {
      case 'pending':
        return 'Waiting...';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Extracting data...';
      case 'completed':
        return 'Complete';
      case 'error':
        return file.error || 'Error';
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drop maintenance documents here
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to browse (PDF, Excel, CSV, Word, Images)
        </p>
        <input
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          Select Files
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900">Upload Queue ({files.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {files.map(file => (
              <div
                key={file.id}
                className="bg-white border rounded-lg p-4 flex items-center space-x-4"
              >
                <FileText className="w-8 h-8 text-gray-400 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {file.file.name}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-sm text-gray-500">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <span className="text-gray-300">•</span>
                    <p className="text-sm text-gray-500">{getStatusText(file)}</p>
                  </div>

                  {(file.status === 'uploading' || file.status === 'processing') && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {getStatusIcon(file.status)}

                  {file.status !== 'uploading' && file.status !== 'processing' && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {files.some(f => f.status === 'error') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900">Some files could not be processed</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Files that couldn't be matched to a machine will appear as "Unmatched" in your document list.
                You can manually assign them to a machine later.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
