import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

interface DocumentListProps {
  dossierId: string;
  onDocumentsChange?: () => void;
}

export function DocumentList({ dossierId, onDocumentsChange }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [dossierId, onDocumentsChange]);

  const loadDocuments = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('dossier_attachments')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error loading documents:', fetchError);
        throw fetchError;
      }
      setDocuments(data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err instanceof Error ? err.message : 'Fout bij laden documenten');
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const { data, error: downloadError } = await supabase.storage
        .from('dossier-attachments')
        .download(doc.file_path);

      if (downloadError) throw downloadError;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Fout bij downloaden document');
    }
  };

  const deleteDocument = async (doc: Document) => {
    if (!confirm(`Weet je zeker dat je "${doc.file_name}" wilt verwijderen?`)) {
      return;
    }

    setDeletingId(doc.id);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('dossier-attachments')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('dossier_attachments')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      setDocuments(documents.filter(d => d.id !== doc.id));
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Fout bij verwijderen document');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('outlook')) return '📧';
    return '📎';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
        <p>Nog geen documenten geüpload</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">{getFileIcon(doc.file_type)}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate">{doc.file_name}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString('nl-NL')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => downloadDocument(doc)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={() => deleteDocument(doc)}
              disabled={deletingId === doc.id}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Verwijderen"
            >
              {deletingId === doc.id ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
