import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Download, Video as VideoIcon } from 'lucide-react';

interface Video {
  id: string;
  dossier_id: string;
  storage_path: string;
  filename: string;
  file_size_bytes: number;
  display_order: number;
  created_at: string;
}

interface VideoGalleryProps {
  dossierId: string;
  canDelete?: boolean;
}

export function VideoGallery({ dossierId, canDelete = false }: VideoGalleryProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, [dossierId]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVideoUrl = (storagePath: string) => {
    const { data } = supabase.storage
      .from('dossier-videos')
      .getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const handleDelete = async (video: Video) => {
    if (!confirm(`Weet je zeker dat je "${video.filename}" wilt verwijderen?`)) {
      return;
    }

    try {
      setDeletingId(video.id);

      const { error: storageError } = await supabase.storage
        .from('dossier-videos')
        .remove([video.storage_path]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
      }

      const { error: dbError } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id);

      if (dbError) throw dbError;

      await loadVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Fout bij verwijderen van video');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (video: Video) => {
    try {
      const { data, error } = await supabase.storage
        .from('dossier-videos')
        .download(video.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = video.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading video:', error);
      alert('Fout bij downloaden van video');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <VideoIcon className="w-12 h-12 mx-auto mb-2 text-slate-400" />
        <p>Nog geen video's geüpload</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {videos.map((video) => (
        <div key={video.id} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
          <div className="aspect-video bg-black relative">
            <video
              controls
              className="w-full h-full"
              preload="metadata"
            >
              <source src={getVideoUrl(video.storage_path)} type="video/mp4" />
              Uw browser ondersteunt geen video playback.
            </video>
          </div>
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {video.filename}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(video.file_size_bytes)}
                </p>
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0">
                <button
                  onClick={() => handleDownload(video)}
                  className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                  title="Download video"
                >
                  <Download className="w-4 h-4" />
                </button>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(video)}
                    disabled={deletingId === video.id}
                    className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                    title="Verwijder video"
                  >
                    {deletingId === video.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
