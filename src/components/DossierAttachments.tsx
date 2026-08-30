import { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  uploaded_by: string;
}

interface DossierAttachmentsProps {
  dossierId: string;
  canDelete?: boolean;
}

export function DossierAttachments({ dossierId, canDelete = false }: DossierAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadAttachments();
  }, [dossierId]);

  const loadAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('dossier_attachments')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      setDownloading(attachment.id);

      const { data, error } = await supabase.storage
        .from('dossier-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Fout bij het downloaden van het bestand');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`Weet je zeker dat je "${attachment.file_name}" wilt verwijderen?`)) {
      return;
    }

    try {
      setDeleting(attachment.id);

      const { error: storageError } = await supabase.storage
        .from('dossier-attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('dossier_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      setAttachments(attachments.filter(a => a.id !== attachment.id));
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Fout bij het verwijderen van het bestand');
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
        <p>Geen bijlagen beschikbaar</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <FileText className="w-8 h-8 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {attachment.file_name}
              </p>
              <p className="text-xs text-slate-500">
                {formatFileSize(attachment.file_size)} • {formatDate(attachment.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => handleDownload(attachment)}
              disabled={downloading === attachment.id}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download"
            >
              {downloading === attachment.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>

            {canDelete && (
              <button
                onClick={() => handleDelete(attachment)}
                disabled={deleting === attachment.id}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Verwijderen"
              >
                {deleting === attachment.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
