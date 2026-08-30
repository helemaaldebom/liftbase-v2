import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { Image as ImageIcon, Trash2, X, Loader2, ZoomIn, Download, ChevronLeft, ChevronRight, PackageOpen, Eye, EyeOff, XCircle, Sparkles, CheckSquare, Square, RotateCw } from 'lucide-react';
import JSZip from 'jszip';

interface PhotoGalleryProps {
  dossierId: string;
  canDelete: boolean;
  disableZoom?: boolean;
  dossierNumber?: string;
}

interface Photo {
  id: string;
  storage_path: string;
  filename: string;
  file_size_bytes: number;
  created_at: string;
  display_order: number;
  visible_online: boolean;
  rotation_degrees: number;
}

export function PhotoGallery({ dossierId, canDelete, disableZoom = false, dossierNumber }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [draggedPhoto, setDraggedPhoto] = useState<Photo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [blockClicks, setBlockClicks] = useState(false);
  const [sortingWithAI, setSortingWithAI] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (dossierId) {
      loadPhotos();
    }
  }, [dossierId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading photos:', error);
        setPhotos([]);
        setLoadError(true);
        return;
      }

      setPhotos(data || []);
    } catch (error) {
      console.error('Error loading photos:', error);
      setPhotos([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const getPhotoUrl = (storagePath: string, options?: { width?: number; height?: number }) => {
    const { data } = supabase.storage
      .from('dossier-photos')
      .getPublicUrl(storagePath, {
        transform: options ? {
          width: options.width,
          height: options.height,
          resize: 'contain',
          quality: 80
        } : undefined
      });
    return data.publicUrl;
  };

  const handlePhotoClick = (photo: Photo, index: number, e: React.MouseEvent) => {
    if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const newSelected = new Set(selectedPhotoIds);
      for (let i = start; i <= end; i++) {
        newSelected.add(photos[i].id);
      }
      setSelectedPhotoIds(newSelected);
    } else {
      const newSelected = new Set(selectedPhotoIds);
      if (newSelected.has(photo.id)) {
        newSelected.delete(photo.id);
      } else {
        newSelected.add(photo.id);
      }
      setSelectedPhotoIds(newSelected);
      setLastSelectedIndex(index);
    }
  };

  const toggleSelectAll = () => {
    if (selectedPhotoIds.size === photos.length) {
      setSelectedPhotoIds(new Set());
      setLastSelectedIndex(null);
    } else {
      setSelectedPhotoIds(new Set(photos.map(p => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedPhotoIds(new Set());
    setLastSelectedIndex(null);
  };

  const handleToggleVisibility = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVisibility = !photo.visible_online;

    try {
      const { error } = await supabase
        .from('photos')
        .update({ visible_online: newVisibility })
        .eq('id', photo.id);

      if (error) throw error;

      setPhotos(photos.map(p =>
        p.id === photo.id ? { ...p, visible_online: newVisibility } : p
      ));
    } catch (error: any) {
      console.error('Error updating visibility:', error);
      alert('Er is een fout opgetreden bij het wijzigen van de zichtbaarheid');
    }
  };

  const handleBulkToggleVisibility = async (makeVisible: boolean) => {
    if (selectedPhotoIds.size === 0) return;

    try {
      const photoIdsArray = Array.from(selectedPhotoIds);

      const { error } = await supabase
        .from('photos')
        .update({ visible_online: makeVisible })
        .in('id', photoIdsArray);

      if (error) throw error;

      setPhotos(photos.map(p =>
        selectedPhotoIds.has(p.id) ? { ...p, visible_online: makeVisible } : p
      ));

      alert(`${selectedPhotoIds.size} foto's zijn ${makeVisible ? 'online gezet' : 'offline gezet'}`);
      clearSelection();
    } catch (error: any) {
      console.error('Error updating visibility:', error);
      alert('Er is een fout opgetreden bij het wijzigen van de zichtbaarheid');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPhotoIds.size === 0) return;

    const confirmed = confirm(
      `Weet je zeker dat je ${selectedPhotoIds.size} geselecteerde foto's wilt verwijderen?\n\nDeze actie kan niet ongedaan worden gemaakt.`
    );

    if (!confirmed) return;

    try {
      const selectedPhotos = photos.filter(p => selectedPhotoIds.has(p.id));
      const storagePaths = selectedPhotos.map(p => p.storage_path);

      const { error: storageError } = await supabase.storage
        .from('dossier-photos')
        .remove(storagePaths);

      if (storageError) {
        console.error('Error deleting storage files:', storageError);
      }

      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .in('id', Array.from(selectedPhotoIds));

      if (dbError) throw dbError;

      setPhotos(photos.filter(p => !selectedPhotoIds.has(p.id)));
      alert(`${selectedPhotoIds.size} foto's zijn verwijderd`);
      clearSelection();
    } catch (error: any) {
      console.error('Error deleting photos:', error);
      alert('Er is een fout opgetreden bij het verwijderen van de foto\'s');
      loadPhotos();
    }
  };

  const handleRotate = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    const newRotation = (photo.rotation_degrees + 90) % 360;

    try {
      const { error } = await supabase
        .from('photos')
        .update({ rotation_degrees: newRotation })
        .eq('id', photo.id);

      if (error) throw error;

      setPhotos(photos.map(p =>
        p.id === photo.id ? { ...p, rotation_degrees: newRotation } : p
      ));
    } catch (error: any) {
      console.error('Error rotating photo:', error);
      alert('Er is een fout opgetreden bij het draaien van de foto');
    }
  };

  const handleBulkRotate = async () => {
    if (selectedPhotoIds.size === 0) return;

    try {
      const photoIdsArray = Array.from(selectedPhotoIds);
      const updates = photos
        .filter(p => selectedPhotoIds.has(p.id))
        .map(p => ({
          id: p.id,
          rotation_degrees: (p.rotation_degrees + 90) % 360
        }));

      const updatePromises = updates.map(update =>
        supabase
          .from('photos')
          .update({ rotation_degrees: update.rotation_degrees })
          .eq('id', update.id)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error('Failed to rotate some photos');
      }

      setPhotos(photos.map(p => {
        const update = updates.find(u => u.id === p.id);
        return update ? { ...p, rotation_degrees: update.rotation_degrees } : p;
      }));

      alert(`${selectedPhotoIds.size} foto's zijn gedraaid`);
    } catch (error: any) {
      console.error('Error rotating photos:', error);
      alert('Er is een fout opgetreden bij het draaien van de foto\'s');
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm('Weet je zeker dat je deze foto wilt verwijderen?')) {
      return;
    }

    try {
      setDeleting(photo.id);

      const { error: storageError } = await supabase.storage
        .from('dossier-photos')
        .remove([photo.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;

      setPhotos(photos.filter(p => p.id !== photo.id));
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      alert('Er is een fout opgetreden bij het verwijderen');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (photo: Photo) => {
    try {
      const { data, error } = await supabase.storage
        .from('dossier-photos')
        .download(photo.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading photo:', error);
      alert('Er is een fout opgetreden bij het downloaden');
    }
  };

  const handleDownloadAll = async () => {
    if (photos.length === 0) {
      alert('Er zijn geen foto\'s om te downloaden');
      return;
    }

    try {
      setDownloadingAll(true);
      const zip = new JSZip();

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        try {
          const { data, error } = await supabase.storage
            .from('dossier-photos')
            .download(photo.storage_path);

          if (error) {
            console.error(`Error downloading ${photo.filename}:`, error);
            continue;
          }

          zip.file(photo.filename, data);
        } catch (error) {
          console.error(`Error processing ${photo.filename}:`, error);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = dossierNumber ? `${dossierNumber}_fotos.zip` : `dossier_${dossierId}_fotos.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating zip:', error);
      alert('Er is een fout opgetreden bij het maken van het zip-bestand');
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedPhotoIds.size === 0) {
      alert('Geen foto\'s geselecteerd');
      return;
    }

    const selectedPhotos = photos.filter(p => selectedPhotoIds.has(p.id));

    if (selectedPhotos.length === 1) {
      await handleDownload(selectedPhotos[0]);
      clearSelection();
      return;
    }

    try {
      setDownloadingAll(true);
      const zip = new JSZip();

      for (const photo of selectedPhotos) {
        try {
          const { data, error } = await supabase.storage
            .from('dossier-photos')
            .download(photo.storage_path);

          if (error) {
            console.error(`Error downloading ${photo.filename}:`, error);
            continue;
          }

          zip.file(photo.filename, data);
        } catch (error) {
          console.error(`Error processing ${photo.filename}:`, error);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = dossierNumber ? `${dossierNumber}_${selectedPhotos.length}_fotos.zip` : `dossier_${dossierId}_${selectedPhotos.length}_fotos.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      clearSelection();
    } catch (error) {
      console.error('Error creating zip:', error);
      alert('Er is een fout opgetreden bij het maken van het zip-bestand');
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDeleteAll = async () => {
    if (photos.length === 0) {
      alert('Er zijn geen foto\'s om te verwijderen');
      return;
    }

    const confirmed = confirm(
      `Weet je zeker dat je alle ${photos.length} foto's wilt verwijderen?\n\nDeze actie kan niet ongedaan worden gemaakt.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingAll(true);

      const storagePaths = photos.map(p => p.storage_path);
      const { error: storageError } = await supabase.storage
        .from('dossier-photos')
        .remove(storagePaths);

      if (storageError) {
        console.error('Error deleting storage files:', storageError);
      }

      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('dossier_id', dossierId);

      if (dbError) throw dbError;

      setPhotos([]);
      alert(`Alle ${photos.length} foto's zijn verwijderd`);
    } catch (error: any) {
      console.error('Error deleting all photos:', error);
      alert('Er is een fout opgetreden bij het verwijderen van de foto\'s');
      loadPhotos();
    } finally {
      setDeletingAll(false);
    }
  };

  const handleDragStart = (photo: Photo) => {
    if (!selectedPhotoIds.has(photo.id)) {
      setSelectedPhotoIds(new Set([photo.id]));
    }
    setDraggedPhoto(photo);
    setIsDragging(true);
    setBlockClicks(true);
  };

  const handleDragEnd = () => {
    setDraggedPhoto(null);
    setIsDragging(false);
    setTimeout(() => setBlockClicks(false), 100);
  };

  const handleDragOver = (e: React.DragEvent, targetPhoto: Photo) => {
    e.preventDefault();
    if (!draggedPhoto || selectedPhotoIds.has(targetPhoto.id)) return;

    const newPhotos = [...photos];
    const selectedPhotosArray = photos.filter(p => selectedPhotoIds.has(p.id));
    const nonSelectedPhotos = photos.filter(p => !selectedPhotoIds.has(p.id));

    const targetIndex = newPhotos.findIndex(p => p.id === targetPhoto.id);
    if (targetIndex === -1) return;

    const result = [...nonSelectedPhotos];
    result.splice(targetIndex, 0, ...selectedPhotosArray);

    setPhotos(result);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedPhoto) return;

    const currentOrder = [...photos];

    try {
      const updatePromises = photos.map((photo, index) =>
        supabase
          .from('photos')
          .update({ display_order: index })
          .eq('id', photo.id)
      );

      const results = await Promise.all(updatePromises);

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error('Failed to update some photos');
      }
    } catch (error) {
      console.error('Error updating photo order:', error);
      setPhotos(currentOrder);
      await loadPhotos();
    }
  };

  const handleAISort = async () => {
    if (!confirm('Weet je zeker dat je de foto\'s automatisch wilt sorteren met AI? De huidige volgorde wordt overschreven.')) {
      return;
    }

    try {
      setSortingWithAI(true);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuratie niet gevonden. Controleer .env bestand.');
      }

      const apiUrl = `${supabaseUrl}/functions/v1/sort-photos-with-ai`;
      console.log('Calling AI sort function:', apiUrl);
      console.log('Dossier ID:', dossierId);
      console.log('Number of photos:', photos.length);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dossierId }),
      });

      console.log('Response status:', response.status);
      console.log('Response OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI sort error response:', errorText);
        console.error('Full response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        const errorMessage = errorData.error || errorData.message || `Failed to sort photos (${response.status})`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('AI sorting result:', result);

      await loadPhotos();
      alert(`${photos.length} foto's succesvol gesorteerd met AI!`);
    } catch (error: any) {
      console.error('Error sorting photos with AI:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      let userMessage = 'Er is een fout opgetreden bij het sorteren met AI:\n\n';
      userMessage += error.message || 'Onbekende fout';

      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        userMessage += '\n\nMogelijke oorzaken:\n';
        userMessage += '- De edge function is niet bereikbaar\n';
        userMessage += '- Er is een probleem met de netwerkverbinding\n';
        userMessage += '- De CORS headers zijn niet correct ingesteld';
      }

      alert(userMessage);
    } finally {
      setSortingWithAI(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="w-16 h-16 text-red-300 mx-auto mb-4" />
        <p className="text-slate-600">Fout bij het laden van foto's</p>
        <button
          onClick={loadPhotos}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600">Nog geen foto's toegevoegd</p>
        <p className="text-sm text-slate-500 mt-1">Upload foto's om ze hier te zien</p>
      </div>
    );
  }

  return (
    <>
      {selectedPhotoIds.size > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">
                {selectedPhotoIds.size} foto's geselecteerd
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-slate-600 hover:text-slate-900 underline"
              >
                Selectie wissen
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSelected}
                disabled={downloadingAll}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download geselecteerde foto's"
              >
                {downloadingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloaden...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Downloaden
                  </>
                )}
              </button>
              <button
                onClick={handleBulkRotate}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                title="Draai geselecteerde foto's 90° rechtsom"
              >
                <RotateCw className="w-4 h-4" />
                Draaien
              </button>
              <button
                onClick={() => handleBulkToggleVisibility(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                title="Zet geselecteerde foto's online"
              >
                <Eye className="w-4 h-4" />
                Online zetten
              </button>
              <button
                onClick={() => handleBulkToggleVisibility(false)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700 transition"
                title="Zet geselecteerde foto's offline"
              >
                <EyeOff className="w-4 h-4" />
                Offline zetten
              </button>
              {canDelete && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                  title="Verwijder geselecteerde foto's"
                >
                  <Trash2 className="w-4 h-4" />
                  Verwijderen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {canDelete && photos.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition"
              title={selectedPhotoIds.size === photos.length ? 'Deselecteer alles' : 'Selecteer alles'}
            >
              {selectedPhotoIds.size === photos.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedPhotoIds.size === photos.length ? 'Deselecteer alles' : 'Selecteer alles'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {canDelete && (
            <button
              onClick={handleDeleteAll}
              disabled={deletingAll || photos.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Verwijder alle foto's"
            >
              {deletingAll ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Bezig met verwijderen...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  <span>Verwijder alle foto's</span>
                </>
              )}
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleAISort}
              disabled={sortingWithAI || photos.length < 2}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sorteer foto's automatisch met AI"
            >
              {sortingWithAI ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>AI sorteert...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>AI Sorteren</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={handleDownloadAll}
            disabled={downloadingAll || photos.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download alle foto's als ZIP"
          >
            {downloadingAll ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Bezig met downloaden...</span>
              </>
            ) : (
              <>
                <PackageOpen className="w-5 h-5" />
                <span>Download alle foto's ({photos.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {photos.map((photo, index) => {
          const isSelected = selectedPhotoIds.has(photo.id);
          return (
            <div
              key={photo.id}
              draggable={canDelete}
              onDragStart={() => handleDragStart(photo)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, photo)}
              onDrop={handleDrop}
              className={`group relative aspect-square bg-slate-100 rounded-lg overflow-hidden transition border-2 hover:shadow-md ${
                canDelete ? 'cursor-move' : ''
              } ${isDragging && isSelected ? 'opacity-40' : ''} ${
                isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-slate-200'
              }`}
            >
              {canDelete && (
                <div
                  className={`absolute top-2 left-2 z-20 ${isSelected || selectedPhotoIds.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePhotoClick(photo, index, e);
                  }}
                >
                  <div className="bg-white rounded p-1 shadow-md cursor-pointer hover:bg-slate-50">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                </div>
              )}

              {!photo.visible_online && (
                <div
                  className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded px-2 py-1 text-xs font-medium flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EyeOff className="w-3 h-3" />
                  Niet online
                </div>
              )}

              {isDragging && isSelected && selectedPhotoIds.size > 1 && photo.id === draggedPhoto?.id && (
                <div
                  className="absolute inset-0 z-30 bg-blue-600 bg-opacity-90 flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-white text-center">
                    <div className="text-4xl font-bold">{selectedPhotoIds.size}</div>
                    <div className="text-sm mt-1">foto's</div>
                  </div>
                </div>
              )}

            <img
              src={getPhotoUrl(photo.storage_path, { width: 400, height: 400 })}
              alt={photo.filename}
              loading="lazy"
              className={`w-full h-full object-cover ${!disableZoom ? 'cursor-pointer' : ''}`}
              style={{
                transform: `rotate(${photo.rotation_degrees || 0}deg)`,
                transition: 'transform 0.3s ease'
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!disableZoom && !blockClicks) {
                  setSelectedPhoto(photo);
                }
              }}
              onError={(e) => {
                console.error('Failed to load image:', photo.storage_path);
                e.currentTarget.src = getPhotoUrl(photo.storage_path);
                e.currentTarget.style.backgroundColor = '#fee2e2';
              }}
              draggable={false}
            />

            <div
              className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              {!disableZoom && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedPhoto(photo);
                  }}
                  className="p-2 bg-white rounded-full hover:bg-slate-100 transition"
                  title="Bekijk volledig"
                >
                  <ZoomIn className="w-5 h-5 text-slate-700" />
                </button>
              )}

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isDragging && !blockClicks) {
                    handleRotate(photo, e);
                  }
                }}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
                title="Draai 90° rechtsom"
              >
                <RotateCw className="w-5 h-5" />
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isDragging && !blockClicks) {
                    handleToggleVisibility(photo, e);
                  }
                }}
                className={`p-2 rounded-full transition ${
                  photo.visible_online
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-slate-600 text-white hover:bg-slate-700'
                }`}
                title={photo.visible_online ? 'Online zichtbaar - klik om te verbergen' : 'Niet online zichtbaar - klik om te tonen'}
              >
                {photo.visible_online ? (
                  <Eye className="w-5 h-5" />
                ) : (
                  <EyeOff className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isDragging && !blockClicks) {
                    handleDownload(photo);
                  }
                }}
                className="p-2 bg-white rounded-full hover:bg-slate-100 transition"
                title="Download"
              >
                <Download className="w-5 h-5 text-slate-700" />
              </button>

              {canDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isDragging && !blockClicks) {
                      handleDelete(photo);
                    }
                  }}
                  disabled={deleting === photo.id}
                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition disabled:opacity-50"
                  title="Verwijder"
                >
                  {deleting === photo.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>

            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white text-xs truncate" title={photo.filename}>
                {photo.filename}
              </p>
              <p className="text-white text-xs opacity-75">
                {formatFileSize(photo.file_size_bytes)}
              </p>
            </div>
          </div>
          );
        })}
      </div>

      {selectedPhoto && (() => {
        const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
        const hasPrevious = currentIndex > 0;
        const hasNext = currentIndex < photos.length - 1;

        const goToPrevious = () => {
          if (hasPrevious) {
            setSelectedPhoto(photos[currentIndex - 1]);
          }
        };

        const goToNext = () => {
          if (hasNext) {
            setSelectedPhoto(photos[currentIndex + 1]);
          }
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (e.key === 'ArrowLeft' && hasPrevious) {
            goToPrevious();
          } else if (e.key === 'ArrowRight' && hasNext) {
            goToNext();
          } else if (e.key === 'Escape') {
            setSelectedPhoto(null);
          }
        };

        return createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-[200] flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPhoto(null);
              }}
              className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-slate-100 transition z-10"
            >
              <X className="w-6 h-6 text-slate-700" />
            </button>

            {hasPrevious && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full hover:bg-slate-100 transition shadow-lg z-10"
                title="Vorige foto"
              >
                <ChevronLeft className="w-8 h-8 text-slate-700" />
              </button>
            )}

            {hasNext && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full hover:bg-slate-100 transition shadow-lg z-10"
                title="Volgende foto"
              >
                <ChevronRight className="w-8 h-8 text-slate-700" />
              </button>
            )}

            <div className="relative max-w-7xl max-h-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={getPhotoUrl(selectedPhoto.storage_path, { width: 2000, height: 2000 })}
                alt={selectedPhoto.filename}
                loading="eager"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                style={{
                  transform: `rotate(${selectedPhoto.rotation_degrees || 0}deg)`,
                  transition: 'transform 0.3s ease'
                }}
                onError={(e) => {
                  e.currentTarget.src = getPhotoUrl(selectedPhoto.storage_path);
                }}
              />

              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4 rounded-b-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{selectedPhoto.filename}</p>
                    <p className="text-sm opacity-75 mt-1">
                      {formatFileSize(selectedPhoto.file_size_bytes)} •{' '}
                      {new Date(selectedPhoto.created_at).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-sm opacity-75">
                    {currentIndex + 1} / {photos.length}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </>
  );
}
