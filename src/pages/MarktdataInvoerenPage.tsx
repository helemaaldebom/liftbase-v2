import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Upload, AlertCircle, CheckCircle, X, Image as ImageIcon } from 'lucide-react';
import { EquipmentTypeSelector } from '../components/EquipmentTypeSelector';
import { MarktdataForkliftForm } from '../components/MarktdataForkliftForm';
import { MarktdataECHForm } from '../components/MarktdataECHForm';
import { MarktdataReachstackerForm } from '../components/MarktdataReachstackerForm';
import { MarktdataTerminalTractorForm } from '../components/MarktdataTerminalTractorForm';

interface MarktdataInvoerenPageProps {
  onNavigate: (page: string) => void;
  initialEquipmentType?: string | null;
  editDossierId?: string | null;
}

interface DuplicateRecord {
  id: string;
  brand: string;
  model: string;
  year: number;
  serial_number: string | null;
  hours: number | null;
  handelsprijs: number | null;
  eindklantprijs: number | null;
  laatste_prijs_update: string | null;
  marktdata_invoerdatum: string | null;
  created_at: string;
  is_marktdata?: boolean;
}

export function MarktdataInvoerenPage({ onNavigate, initialEquipmentType, editDossierId }: MarktdataInvoerenPageProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateRecord, setDuplicateRecord] = useState<DuplicateRecord | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [createdDossierId, setCreatedDossierId] = useState<string | null>(null);
  const [showEquipmentTypeSelector, setShowEquipmentTypeSelector] = useState(!initialEquipmentType);
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string>(initialEquipmentType || '');

  const [formData, setFormData] = useState({
    merk: '',
    type: '',
    bouwjaar: '',
    serienummer: '',
    brandstof: '',
    capaciteit: '',
    lastzwaartepunt: '',
    hefhoogte: '',
    vrije_hef: '',
    uren: '',
    masttype: '',
    aanbouwdeel: '',
    land: '',
    locatie: '',
    handelsprijs: '',
    eindklantprijs: '',
    verkoopdatum: '',
    bron: '',
    bron_url: '',
    notities: ''
  });

  // Check for duplicates when serienummer is entered
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!formData.serienummer || formData.serienummer.length < 3) return;

      // Check for ANY dossier with this serial number (both regular dossiers and marktdata)
      const { data } = await supabase
        .from('dossiers')
        .select('id, brand, model, year, serial_number, hours, handelsprijs, eindklantprijs, laatste_prijs_update, marktdata_invoerdatum, created_at, is_marktdata')
        .eq('serial_number', formData.serienummer)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setDuplicateRecord(data);
        setShowDuplicateModal(true);
      }
    };

    const timeoutId = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.serienummer]);

  const handlePendingPhotoAdd = (files: File[]) => {
    setPendingPhotos([...pendingPhotos, ...files]);
  };

  const handleRemovePendingPhoto = (index: number) => {
    setPendingPhotos(pendingPhotos.filter((_, i) => i !== index));
  };

  const uploadPendingPhotos = async (dossierId: string) => {
    if (pendingPhotos.length === 0) return;

    for (const file of pendingPhotos) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${dossierId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('dossier-photos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('photos')
          .insert({
            dossier_id: dossierId,
            storage_path: fileName,
            filename: file.name,
            file_size_bytes: file.size,
            step_key: 'dossier',
            display_order: 0,
            quality_passed: true,
          });

        if (dbError) throw dbError;
      } catch (err) {
        console.error('Error uploading photo:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent, forceNew = false) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Check if we should update existing record (if less than 1 year old)
      if (duplicateRecord && !forceNew) {
        // Only allow updating if it's a marktdata record (not a regular dossier)
        if (!duplicateRecord.is_marktdata) {
          // If it's a regular dossier, always create new marktdata record
          forceNew = true;
        } else {
          const recordDate = new Date(duplicateRecord.marktdata_invoerdatum || duplicateRecord.created_at);
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

          if (recordDate <= oneYearAgo) {
            // If marktdata record is older than 1 year, create new one
            forceNew = true;
          }
        }

        if (!forceNew) {
          // Update existing record
          const { error } = await supabase
            .from('dossiers')
            .update({
              fuel_type: formData.brandstof || null,
              capacity: formData.capaciteit ? parseFloat(formData.capaciteit) : null,
              load_center: formData.lastzwaartepunt ? parseFloat(formData.lastzwaartepunt) : null,
              lifting_height: formData.hefhoogte ? parseFloat(formData.hefhoogte) : null,
              free_lift: formData.vrije_hef ? parseFloat(formData.vrije_hef) : null,
              hours: formData.uren ? parseFloat(formData.uren) : null,
              mast_type: formData.masttype || null,
              attachment: formData.aanbouwdeel || null,
              country: formData.land || null,
              location: formData.locatie || null,
              handelsprijs: formData.handelsprijs ? parseFloat(parseFloat(formData.handelsprijs).toFixed(2)) : null,
              eindklantprijs: formData.eindklantprijs ? parseFloat(parseFloat(formData.eindklantprijs).toFixed(2)) : null,
              marktdata_bron: formData.bron || null,
              marktdata_bron_url: formData.bron_url || null,
              marktdata_notities: formData.notities || null,
              marktdata_ingevoerd_door: profile?.id,
              marktdata_invoerdatum: new Date().toISOString()
            })
            .eq('id', duplicateRecord.id);

          if (error) throw error;

          setMessage({ type: 'success', text: 'Bestaand marktdata record succesvol bijgewerkt!' });
          setShowDuplicateModal(false);
          setDuplicateRecord(null);
          resetForm();
          setLoading(false);
          return;
        }
      }

      // Create new record
      const { data: newDossier, error: dossierError } = await supabase
        .from('dossiers')
        .insert({
          equipment_type: selectedEquipmentType,
          brand: formData.merk,
          model: formData.type,
          year: parseInt(formData.bouwjaar),
          serial_number: formData.serienummer || null,
          fuel_type: formData.brandstof || null,
          capacity: formData.capaciteit ? parseFloat(formData.capaciteit) : null,
          load_center: formData.lastzwaartepunt ? parseFloat(formData.lastzwaartepunt) : null,
          lifting_height: formData.hefhoogte ? parseFloat(formData.hefhoogte) : null,
          free_lift: formData.vrije_hef ? parseFloat(formData.vrije_hef) : null,
          hours: formData.uren ? parseFloat(formData.uren) : null,
          mast_type: formData.masttype || null,
          attachment: formData.aanbouwdeel || null,
          country: formData.land || null,
          location: formData.locatie || null,
          handelsprijs: formData.handelsprijs ? parseFloat(formData.handelsprijs) : null,
          eindklantprijs: formData.eindklantprijs ? parseFloat(formData.eindklantprijs) : null,
          sale_date: formData.verkoopdatum || null,
          marktdata_bron: formData.bron || null,
          marktdata_bron_url: formData.bron_url || null,
          marktdata_notities: formData.notities || null,
          marktdata_ingevoerd_door: profile?.id,
          marktdata_invoerdatum: new Date().toISOString(),
          is_marktdata: true,
          status: 'verkocht',
          created_by: profile?.id,
          title: `${formData.merk} ${formData.type}`,
          description: formData.notities || ''
        })
        .select()
        .single();

      if (dossierError) throw dossierError;

      // Upload pending photos
      if (pendingPhotos.length > 0 && newDossier) {
        await uploadPendingPhotos(newDossier.id);
      }

      // Link photos to dossier
      if (uploadedPhotos.length > 0 && newDossier) {
        const photoInserts = uploadedPhotos.map((photoUrl, index) => ({
          dossier_id: newDossier.id,
          photo_url: photoUrl,
          display_order: index,
          uploaded_by: profile?.id
        }));

        const { error: photoError } = await supabase
          .from('photos')
          .insert(photoInserts);

        if (photoError) console.error('Error linking photos:', photoError);
      }

      setMessage({ type: 'success', text: 'Marktdata succesvol toegevoegd!' });
      setShowDuplicateModal(false);
      setDuplicateRecord(null);
      resetForm();
    } catch (error) {
      console.error('Error adding marktdata:', error);
      setMessage({ type: 'error', text: 'Er is een fout opgetreden bij het toevoegen van marktdata' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      merk: '',
      type: '',
      bouwjaar: '',
      serienummer: '',
      brandstof: '',
      capaciteit: '',
      lastzwaartepunt: '',
      hefhoogte: '',
      vrije_hef: '',
      uren: '',
      masttype: '',
      aanbouwdeel: '',
      land: '',
      locatie: '',
      handelsprijs: '',
      eindklantprijs: '',
      verkoopdatum: '',
      bron: '',
      bron_url: '',
      notities: ''
    });
    setUploadedPhotos([]);
    setPendingPhotos([]);
    setShowEquipmentTypeSelector(true);
    setSelectedEquipmentType('');
  };

  const closeDuplicateModal = () => {
    setShowDuplicateModal(false);
    setDuplicateRecord(null);
  };

  const handleEquipmentTypeSelect = (type: string) => {
    setSelectedEquipmentType(type);
    setShowEquipmentTypeSelector(false);
  };

  const handleBackToTypeSelection = () => {
    setShowEquipmentTypeSelector(true);
    setSelectedEquipmentType('');
  };

  if (showEquipmentTypeSelector) {
    return (
      <EquipmentTypeSelector
        onSelect={handleEquipmentTypeSelect}
        onClose={() => onNavigate('dashboard')}
        title="Selecteer type equipment"
        description="Kies het type equipment waarvoor je marktdata wilt invoeren."
      />
    );
  }

  if (selectedEquipmentType === 'heavy_duty_forklift') {
    return (
      <MarktdataForkliftForm
        onClose={handleBackToTypeSelection}
        onSuccess={() => {
          setTimeout(() => {
            onNavigate('marktdata-database');
          }, 2000);
        }}
        editDossierId={editDossierId}
      />
    );
  }

  if (selectedEquipmentType === 'empty_container_handler') {
    return (
      <MarktdataECHForm
        onClose={handleBackToTypeSelection}
        onSuccess={() => {
          setTimeout(() => {
            onNavigate('marktdata-database');
          }, 2000);
        }}
        editDossierId={editDossierId}
      />
    );
  }

  if (selectedEquipmentType === 'reachstacker') {
    return (
      <MarktdataReachstackerForm
        onClose={handleBackToTypeSelection}
        onSuccess={() => {
          setTimeout(() => {
            onNavigate('marktdata-database');
          }, 2000);
        }}
        editDossierId={editDossierId}
      />
    );
  }

  if (selectedEquipmentType === 'terminal_tractor') {
    return (
      <MarktdataTerminalTractorForm
        onClose={handleBackToTypeSelection}
        onSuccess={() => {
          setTimeout(() => {
            onNavigate('marktdata-database');
          }, 2000);
        }}
        editDossierId={editDossierId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToTypeSelection}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Terug
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Marktdata Invoeren</h1>
                <p className="text-sm text-slate-500">
                  {selectedEquipmentType === 'heavy_duty_forklift' && 'Heavy Duty Forklifts'}
                  {selectedEquipmentType === 'empty_container_handler' && 'Empty Container Handlers'}
                  {selectedEquipmentType === 'reachstacker' && 'Reachstackers'}
                  {selectedEquipmentType === 'terminal_tractor' && 'Terminal Tractors'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Basisgegevens</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Merk *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.merk}
                    onChange={(e) => setFormData({ ...formData, merk: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. Toyota"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Type *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. 8FBN25"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Bouwjaar *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.bouwjaar}
                    onChange={(e) => setFormData({ ...formData, bouwjaar: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. 2020"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Serienummer
                  </label>
                  <input
                    type="text"
                    value={formData.serienummer}
                    onChange={(e) => setFormData({ ...formData, serienummer: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. 12345ABC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Brandstof / Aandrijving
                  </label>
                  <select
                    value={formData.brandstof}
                    onChange={(e) => setFormData({ ...formData, brandstof: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecteer...</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Elektrisch">Elektrisch</option>
                    <option value="LPG">LPG</option>
                    <option value="Hybride">Hybride</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Capaciteit (kg)
                  </label>
                  <input
                    type="number"
                    value={formData.capaciteit}
                    onChange={(e) => setFormData({ ...formData, capaciteit: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. 2500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Lastzwaartepunt (mm)
                  </label>
                  <input
                    type="number"
                    value={formData.lastzwaartepunt}
                    onChange={(e) => setFormData({ ...formData, lastzwaartepunt: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. 500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Hefhoogte (mm)
                  </label>
                  <input
                    type="number"
                    value={formData.hefhoogte}
                    onChange={(e) => setFormData({ ...formData, hefhoogte: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. 4500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Vrije hef (mm)
                  </label>
                  <input
                    type="number"
                    value={formData.vrije_hef}
                    onChange={(e) => setFormData({ ...formData, vrije_hef: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. 1500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Uren
                  </label>
                  <input
                    type="number"
                    value={formData.uren}
                    onChange={(e) => setFormData({ ...formData, uren: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. 5000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Masttype
                  </label>
                  <input
                    type="text"
                    value={formData.masttype}
                    onChange={(e) => setFormData({ ...formData, masttype: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. Duplex, Triplex"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Aanbouwdeel
                  </label>
                  <input
                    type="text"
                    value={formData.aanbouwdeel}
                    onChange={(e) => setFormData({ ...formData, aanbouwdeel: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. Vorken, Klemmen"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Land
                  </label>
                  <input
                    type="text"
                    value={formData.land}
                    onChange={(e) => setFormData({ ...formData, land: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. Nederland"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Locatie
                  </label>
                  <input
                    type="text"
                    value={formData.locatie}
                    onChange={(e) => setFormData({ ...formData, locatie: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. Rotterdam"
                  />
                </div>
              </div>
            </div>

            {/* Price Info */}
            <div className="pt-4 border-t border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Prijsinformatie</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Handelsprijs (EUR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.handelsprijs}
                    onChange={(e) => setFormData({ ...formData, handelsprijs: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dealer prijs"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Eindklantprijs (EUR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.eindklantprijs}
                    onChange={(e) => setFormData({ ...formData, eindklantprijs: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Klant prijs"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Verkoopdatum
                  </label>
                  <input
                    type="date"
                    value={formData.verkoopdatum}
                    onChange={(e) => setFormData({ ...formData, verkoopdatum: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Source Info */}
            <div className="pt-4 border-t border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Bron Informatie</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Bron
                  </label>
                  <input
                    type="text"
                    value={formData.bron}
                    onChange={(e) => setFormData({ ...formData, bron: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. Marktplaats, Trucksnl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Bron URL
                  </label>
                  <input
                    type="url"
                    value={formData.bron_url}
                    onChange={(e) => setFormData({ ...formData, bron_url: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notities
                </label>
                <textarea
                  value={formData.notities}
                  onChange={(e) => setFormData({ ...formData, notities: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Aanvullende informatie over de bron of observatie..."
                />
              </div>
            </div>

            {/* Photos */}
            <div className="pt-4 border-t border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Foto's</h2>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    handlePendingPhotoAdd(files);
                    e.target.value = '';
                  }}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 mb-1">Sleep foto's hierheen of klik om te uploaden</p>
                  <p className="text-xs text-slate-500">JPEG, PNG, WebP of GIF (max. 5MB)</p>
                </label>
              </div>

              {pendingPhotos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {pendingPhotos.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-32 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePendingPhoto(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded truncate">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleBackToTypeSelection}
                className="px-6 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Marktdata Toevoegen
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Duplicate Detection Modal */}
      {showDuplicateModal && duplicateRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-900">
                  Machine Bekend in Database
                </h3>
                <button
                  onClick={closeDuplicateModal}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className={`border rounded-lg p-4 mb-6 ${
                duplicateRecord.is_marktdata
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm ${
                  duplicateRecord.is_marktdata
                    ? 'text-yellow-800'
                    : 'text-blue-800'
                }`}>
                  {duplicateRecord.is_marktdata ? (
                    <>
                      Deze machine (serienummer: {duplicateRecord.serial_number}) bestaat al als <strong>marktdata record</strong> in de database.
                    </>
                  ) : (
                    <>
                      Deze machine (serienummer: {duplicateRecord.serial_number}) bestaat al als <strong>actief dossier</strong> in de database. Er wordt automatisch een nieuw marktdata record aangemaakt.
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <h4 className="font-medium text-slate-900">
                  Bestaande gegevens {duplicateRecord.is_marktdata ? '(Marktdata)' : '(Dossier)'}:
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Merk:</span>
                    <span className="ml-2 font-medium">{duplicateRecord.brand}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Type:</span>
                    <span className="ml-2 font-medium">{duplicateRecord.model}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Bouwjaar:</span>
                    <span className="ml-2 font-medium">{duplicateRecord.year}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Uren:</span>
                    <span className="ml-2 font-medium">{duplicateRecord.hours || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Handelsprijs:</span>
                    <span className="ml-2 font-medium">
                      {duplicateRecord.handelsprijs ? `€ ${duplicateRecord.handelsprijs.toLocaleString('nl-NL')}` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Eindklantprijs:</span>
                    <span className="ml-2 font-medium">
                      {duplicateRecord.eindklantprijs ? `€ ${duplicateRecord.eindklantprijs.toLocaleString('nl-NL')}` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Laatste update:</span>
                    <span className="ml-2 font-medium">
                      {duplicateRecord.laatste_prijs_update
                        ? new Date(duplicateRecord.laatste_prijs_update).toLocaleDateString('nl-NL')
                        : new Date(duplicateRecord.created_at).toLocaleDateString('nl-NL')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {duplicateRecord.is_marktdata ? (
                  <>
                    <button
                      onClick={(e) => handleSubmit(e, false)}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {(() => {
                        const recordDate = new Date(duplicateRecord.marktdata_invoerdatum || duplicateRecord.created_at);
                        const oneYearAgo = new Date();
                        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                        return recordDate > oneYearAgo ? 'Bestaand Marktdata Bijwerken' : 'Nieuw Marktdata Record Aanmaken';
                      })()}
                    </button>
                    <button
                      onClick={(e) => handleSubmit(e, true)}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
                    >
                      Toch Nieuw Record Aanmaken
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Nieuw Marktdata Record Aanmaken
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
