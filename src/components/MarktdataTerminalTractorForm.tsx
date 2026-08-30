import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Save, ArrowLeft, AlertCircle, CheckCircle, X, Upload } from 'lucide-react';
import { ScreenshotUpload } from './ScreenshotUpload';

interface TerminalTractorMarktdataFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  editDossierId?: string | null;
}

interface DuplicateRecord {
  id: string;
  merk: string;
  type: string;
  bouwjaar: number;
  serienummer: string | null;
  uren: number | null;
  handelsprijs: number | null;
  eindklantprijs: number | null;
  laatste_prijs_update: string | null;
  marktdata_invoerdatum: string | null;
  created_at: string;
  is_marktdata: boolean;
}

export function MarktdataTerminalTractorForm({ onClose, onSuccess, editDossierId }: TerminalTractorMarktdataFormProps) {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateRecord, setDuplicateRecord] = useState<DuplicateRecord | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    bron: '',
    bron_other: '',
    bron_url: '',
    notities: '',
    handelsprijs: '',
    eindklantprijs: '',
    verkoopdatum: '',
    land: '',
    locatie: '',
    merk: '',
    type: '',
    bouwjaar: '',
    serienummer: '',
    brandstof: '',
    fifth_wheel_height_mm: '',
    wheelbase_mm: '',
    uren: '',
    engine_brand: '',
    engine_type: '',
    engine_remark: '',
    adblue: false,
    front_axle_brand: '',
    front_axle_type: '',
    front_axle_remark: '',
    rear_axle_remark: '',
    trans_brand: '',
    trans_type: '',
    trans_remark: '',
    heater: false,
    airco: false,
    radio: false,
    length_total_mm: '',
    width_total_mm: '',
    drive_through_height_mm: '',
    serviceweight_kg: '',
    central_greasing_chassis: false,
    tire_size_front: '',
    tire_size_back: '',
  });

  useEffect(() => {
    const checkDuplicate = async () => {
      if (editDossierId) return;
      if (!formData.serienummer || formData.serienummer.length < 3) return;

      const { data } = await supabase
        .from('dossiers')
        .select('id, merk, type, bouwjaar, serienummer, uren, handelsprijs, eindklantprijs, laatste_prijs_update, marktdata_invoerdatum, created_at, is_marktdata')
        .eq('serienummer', formData.serienummer)
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
  }, [formData.serienummer, editDossierId]);

  useEffect(() => {
    const loadExistingData = async () => {
      if (!editDossierId) return;

      setLoading(true);
      try {
        const { data: dossier, error: dossierError } = await supabase
          .from('dossiers')
          .select('*')
          .eq('id', editDossierId)
          .maybeSingle();

        if (dossierError) throw dossierError;
        if (!dossier) return;

        const { data: details, error: detailsError } = await supabase
          .from('terminal_tractor_details')
          .select('*')
          .eq('dossier_id', editDossierId)
          .maybeSingle();

        if (detailsError) throw detailsError;

        const { data: photos, error: photosError } = await supabase
          .from('photos')
          .select('storage_path')
          .eq('dossier_id', editDossierId)
          .order('display_order');

        if (photosError) throw photosError;

        const standardSources = ['Forklift International', 'Trucks.nl', 'Mascus', 'Supralift', 'Machinio', 'Machineryzone'];
        const isStandardSource = dossier.marktdata_bron && standardSources.includes(dossier.marktdata_bron);

        setFormData({
          merk: dossier.brand || '',
          type: dossier.model || '',
          bouwjaar: dossier.year?.toString() || '',
          serienummer: dossier.serial_number || '',
          brandstof: dossier.fuel_type || '',
          fifth_wheel_height_mm: dossier.fifth_wheel_height?.toString() || '',
          wheelbase_mm: details?.wheelbase_mm?.toString() || '',
          uren: dossier.hours?.toString() || '',
          engine_brand: details?.engine_brand || '',
          engine_type: details?.engine_type || '',
          engine_remark: details?.engine_remark || '',
          adblue: details?.adblue || false,
          front_axle_brand: details?.front_axle_brand || '',
          front_axle_type: details?.front_axle_type || '',
          front_axle_remark: details?.front_axle_remark || '',
          rear_axle_remark: details?.rear_axle_remark || '',
          trans_brand: details?.trans_brand || '',
          trans_type: details?.trans_type || '',
          trans_remark: details?.trans_remark || '',
          heater: details?.heater || false,
          airco: details?.airco || false,
          radio: details?.radio || false,
          length_total_mm: details?.length_total_mm?.toString() || '',
          width_total_mm: details?.width_total_mm?.toString() || '',
          drive_through_height_mm: details?.drive_through_height_mm?.toString() || '',
          serviceweight_kg: details?.serviceweight_kg?.toString() || '',
          central_greasing_chassis: details?.central_greasing_chassis || false,
          tire_size_front: details?.tire_size_front || '',
          tire_size_back: details?.tire_size_back || '',
          bron: isStandardSource ? dossier.marktdata_bron : (dossier.marktdata_bron ? 'Overige' : ''),
          bron_other: !isStandardSource && dossier.marktdata_bron ? dossier.marktdata_bron : '',
          bron_url: dossier.marktdata_bron_url || '',
          notities: dossier.marktdata_notities || '',
          handelsprijs: dossier.handelsprijs?.toString() || '',
          eindklantprijs: dossier.eindklantprijs?.toString() || '',
          verkoopdatum: dossier.sale_date || '',
          land: dossier.country || '',
          locatie: dossier.location || ''
        });

        if (photos && photos.length > 0) {
          setUploadedPhotos(photos.map(p => p.storage_path));
        }
      } catch (error: any) {
        console.error('Error loading existing data:', error);
        const errorMessage = error?.message || 'Onbekende fout';
        setMessage({ type: 'error', text: `Fout bij het laden van bestaande data: ${errorMessage}` });
      } finally {
        setLoading(false);
      }
    };

    loadExistingData();
  }, [editDossierId]);

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
      if (editDossierId) {
        const { error: dossierError } = await supabase
          .from('dossiers')
          .update({
            brand: formData.merk,
            model: formData.type,
            year: parseInt(formData.bouwjaar),
            serial_number: formData.serienummer || null,
            fuel_type: formData.brandstof || null,
            hours: formData.uren ? parseInt(formData.uren) : null,
            country: formData.land || null,
            location: formData.locatie || null,
            sale_date: formData.verkoopdatum || null,
            handelsprijs: formData.handelsprijs ? parseFloat(parseFloat(formData.handelsprijs).toFixed(2)) : null,
            eindklantprijs: formData.eindklantprijs ? parseFloat(parseFloat(formData.eindklantprijs).toFixed(2)) : null,
            marktdata_bron: formData.bron === 'Overige' ? formData.bron_other : formData.bron || null,
            marktdata_bron_url: formData.bron_url || null,
            marktdata_notities: formData.notities || null,
            marktdata_ingevoerd_door: profile?.id,
            marktdata_invoerdatum: new Date().toISOString(),
            title: `${formData.merk} ${formData.type}`,
            description: formData.notities || ''
          })
          .eq('id', editDossierId);

        if (dossierError) throw dossierError;

        const { error: detailsError } = await supabase
          .from('terminal_tractor_details')
          .upsert({
            dossier_id: editDossierId,
            hours_on_clock: formData.uren ? parseInt(formData.uren) : null,
            fifth_wheel_height_mm: formData.fifth_wheel_height_mm ? parseInt(formData.fifth_wheel_height_mm) : null,
            wheelbase_mm: formData.wheelbase_mm ? parseInt(formData.wheelbase_mm) : null,
            engine_brand: formData.engine_brand || '',
            engine_type: formData.engine_type || '',
            engine_remark: formData.engine_remark || '',
            adblue: formData.adblue,
            front_axle_brand: formData.front_axle_brand || '',
            front_axle_type: formData.front_axle_type || '',
            front_axle_remark: formData.front_axle_remark || '',
            rear_axle_remark: formData.rear_axle_remark || '',
            trans_brand: formData.trans_brand || '',
            trans_type: formData.trans_type || '',
            trans_remark: formData.trans_remark || '',
            heater: formData.heater,
            airco: formData.airco,
            radio: formData.radio,
            length_total_mm: formData.length_total_mm ? parseInt(formData.length_total_mm) : null,
            width_total_mm: formData.width_total_mm ? parseInt(formData.width_total_mm) : null,
            drive_through_height_mm: formData.drive_through_height_mm ? parseInt(formData.drive_through_height_mm) : null,
            serviceweight_kg: formData.serviceweight_kg ? parseInt(formData.serviceweight_kg) : null,
            central_greasing_chassis: formData.central_greasing_chassis,
            tire_size_front: formData.tire_size_front || '',
            tire_size_back: formData.tire_size_back || ''
          }, { onConflict: 'dossier_id' });

        if (detailsError) throw detailsError;

        if (pendingPhotos.length > 0) {
          await uploadPendingPhotos(editDossierId);
        }

        setMessage({ type: 'success', text: 'Marktdata succesvol bijgewerkt!' });
        resetForm();
        if (onSuccess) onSuccess();
        setLoading(false);
        return;
      }

      if (duplicateRecord && !forceNew) {
        if (!duplicateRecord.is_marktdata) {
          forceNew = true;
        } else {
          const recordDate = new Date(duplicateRecord.marktdata_invoerdatum || duplicateRecord.created_at);
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

          if (recordDate <= oneYearAgo) {
            forceNew = true;
          }
        }

        if (!forceNew) {
          const { error: dossierError } = await supabase
            .from('dossiers')
            .update({
              fuel_type: formData.brandstof || null,
              hours: formData.uren ? parseInt(formData.uren) : null,
              country: formData.land || null,
              location: formData.locatie || null,
              handelsprijs: formData.handelsprijs ? parseFloat(parseFloat(formData.handelsprijs).toFixed(2)) : null,
              eindklantprijs: formData.eindklantprijs ? parseFloat(parseFloat(formData.eindklantprijs).toFixed(2)) : null,
              marktdata_bron: formData.bron === 'Overige' ? formData.bron_other : formData.bron || null,
              marktdata_bron_url: formData.bron_url || null,
              marktdata_notities: formData.notities || null,
              marktdata_ingevoerd_door: profile?.id,
              marktdata_invoerdatum: new Date().toISOString()
            })
            .eq('id', duplicateRecord.id);

          if (dossierError) throw dossierError;

          const { error: detailsError } = await supabase
            .from('terminal_tractor_details')
            .upsert({
              dossier_id: duplicateRecord.id,
              hours_on_clock: formData.uren ? parseInt(formData.uren) : null,
              fifth_wheel_height_mm: formData.fifth_wheel_height_mm ? parseInt(formData.fifth_wheel_height_mm) : null,
              wheelbase_mm: formData.wheelbase_mm ? parseInt(formData.wheelbase_mm) : null,
              engine_brand: formData.engine_brand || '',
              engine_type: formData.engine_type || '',
              engine_remark: formData.engine_remark || '',
              adblue: formData.adblue,
              front_axle_brand: formData.front_axle_brand || '',
              front_axle_type: formData.front_axle_type || '',
              front_axle_remark: formData.front_axle_remark || '',
              rear_axle_remark: formData.rear_axle_remark || '',
              trans_brand: formData.trans_brand || '',
              trans_type: formData.trans_type || '',
              trans_remark: formData.trans_remark || '',
              heater: formData.heater,
              airco: formData.airco,
              radio: formData.radio,
              length_total_mm: formData.length_total_mm ? parseInt(formData.length_total_mm) : null,
              width_total_mm: formData.width_total_mm ? parseInt(formData.width_total_mm) : null,
              drive_through_height_mm: formData.drive_through_height_mm ? parseInt(formData.drive_through_height_mm) : null,
              serviceweight_kg: formData.serviceweight_kg ? parseInt(formData.serviceweight_kg) : null,
              central_greasing_chassis: formData.central_greasing_chassis,
              tire_size_front: formData.tire_size_front || '',
              tire_size_back: formData.tire_size_back || ''
            }, { onConflict: 'dossier_id' });

          if (detailsError) throw detailsError;

          // Upload pending photos for duplicate record update
          if (pendingPhotos.length > 0) {
            await uploadPendingPhotos(duplicateRecord.id);
          }

          setMessage({ type: 'success', text: 'Bestaand marktdata record succesvol bijgewerkt!' });
          setShowDuplicateModal(false);
          setDuplicateRecord(null);
          resetForm();
          setLoading(false);
          if (onSuccess) onSuccess();
          return;
        }
      }

      const { data: newDossier, error: dossierError } = await supabase
        .from('dossiers')
        .insert({
          title: `${formData.merk} ${formData.type}`,
          equipment_type: 'terminal_tractor',
          brand: formData.merk,
          model: formData.type,
          year: parseInt(formData.bouwjaar),
          serial_number: formData.serienummer || null,
          fuel_type: formData.brandstof || null,
          hours: formData.uren ? parseInt(formData.uren) : null,
          country: formData.land || null,
          location: formData.locatie || null,
          handelsprijs: formData.handelsprijs ? parseFloat(formData.handelsprijs) : null,
          eindklantprijs: formData.eindklantprijs ? parseFloat(formData.eindklantprijs) : null,
          sale_date: formData.verkoopdatum || null,
          marktdata_bron: formData.bron === 'Overige' ? formData.bron_other : formData.bron || null,
          marktdata_bron_url: formData.bron_url || null,
          marktdata_notities: formData.notities || null,
          marktdata_ingevoerd_door: profile?.id,
          marktdata_invoerdatum: new Date().toISOString(),
          is_marktdata: true,
          status: 'verkocht',
          created_by: profile?.id
        })
        .select()
        .single();

      if (dossierError) throw dossierError;

      const { error: detailsError } = await supabase
        .from('terminal_tractor_details')
        .insert({
          dossier_id: newDossier.id,
          hours_on_clock: formData.uren ? parseInt(formData.uren) : null,
          fifth_wheel_height_mm: formData.fifth_wheel_height_mm ? parseInt(formData.fifth_wheel_height_mm) : null,
          wheelbase_mm: formData.wheelbase_mm ? parseInt(formData.wheelbase_mm) : null,
          engine_brand: formData.engine_brand || '',
          engine_type: formData.engine_type || '',
          engine_remark: formData.engine_remark || '',
          adblue: formData.adblue,
          front_axle_brand: formData.front_axle_brand || '',
          front_axle_type: formData.front_axle_type || '',
          front_axle_remark: formData.front_axle_remark || '',
          rear_axle_remark: formData.rear_axle_remark || '',
          trans_brand: formData.trans_brand || '',
          trans_type: formData.trans_type || '',
          trans_remark: formData.trans_remark || '',
          heater: formData.heater,
          airco: formData.airco,
          radio: formData.radio,
          length_total_mm: formData.length_total_mm ? parseInt(formData.length_total_mm) : null,
          width_total_mm: formData.width_total_mm ? parseInt(formData.width_total_mm) : null,
          drive_through_height_mm: formData.drive_through_height_mm ? parseInt(formData.drive_through_height_mm) : null,
          serviceweight_kg: formData.serviceweight_kg ? parseInt(formData.serviceweight_kg) : null,
          central_greasing_chassis: formData.central_greasing_chassis,
          tire_size_front: formData.tire_size_front || '',
          tire_size_back: formData.tire_size_back || ''
        });

      if (detailsError) throw detailsError;

      // Upload pending photos
      if (pendingPhotos.length > 0 && newDossier) {
        await uploadPendingPhotos(newDossier.id);
      }

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
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error adding marktdata:', error);
      setMessage({ type: 'error', text: 'Er is een fout opgetreden bij het toevoegen van marktdata' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      bron: '',
      bron_other: '',
      bron_url: '',
      notities: '',
      handelsprijs: '',
      eindklantprijs: '',
      verkoopdatum: '',
      land: '',
      locatie: '',
      merk: '',
      type: '',
      bouwjaar: '',
      serienummer: '',
      brandstof: '',
      fifth_wheel_height_mm: '',
      wheelbase_mm: '',
      uren: '',
      engine_brand: '',
      engine_type: '',
      engine_remark: '',
      adblue: false,
      front_axle_brand: '',
      front_axle_type: '',
      front_axle_remark: '',
      rear_axle_remark: '',
      trans_brand: '',
      trans_type: '',
      trans_remark: '',
      heater: false,
      airco: false,
      radio: false,
      length_total_mm: '',
      width_total_mm: '',
      drive_through_height_mm: '',
      serviceweight_kg: '',
      central_greasing_chassis: false,
      tire_size_front: '',
      tire_size_back: '',
    });
    setUploadedPhotos([]);
    setPendingPhotos([]);
  };

  const closeDuplicateModal = () => {
    setShowDuplicateModal(false);
    setDuplicateRecord(null);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleScreenshotCapture = (file: File) => {
    setPendingPhotos((prev) => [...prev, file]);
  };

  const handleScreenshotData = (extractedData: any) => {
    console.log('📥 Received data in handleScreenshotData:', extractedData);
    console.log('📥 Data types:', {
      merk: typeof extractedData.merk,
      type: typeof extractedData.type,
      bouwjaar: typeof extractedData.bouwjaar,
      uren: typeof extractedData.uren,
      handelsprijs: typeof extractedData.handelsprijs
    });

    setFormData((prev) => {
      const newData = {
        ...prev,
        merk: extractedData.merk || prev.merk,
        type: extractedData.type || prev.type,
        bouwjaar: extractedData.bouwjaar?.toString() || prev.bouwjaar,
        serienummer: extractedData.serienummer || prev.serienummer,
        brandstof: extractedData.brandstof || prev.brandstof,
        uren: extractedData.uren?.toString() || prev.uren,
        land: extractedData.land || prev.land,
        locatie: extractedData.locatie || prev.locatie,
        handelsprijs: extractedData.handelsprijs?.toString() || prev.handelsprijs,
        eindklantprijs: extractedData.eindklantprijs?.toString() || prev.eindklantprijs,
        bron: extractedData.bron || prev.bron,
        bron_url: extractedData.bron_url || prev.bron_url,
        notities: extractedData.notities || prev.notities
      };
      console.log('📝 Setting form data to:', newData);
      return newData;
    });

    setMessage({ type: 'success', text: 'Screenshot data succesvol ingevuld! Controleer en pas indien nodig aan.' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Terug
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{t('marktdata.entry')}</h1>
                <p className="text-sm text-slate-500">Terminal Tractors</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <ScreenshotUpload
            onDataExtracted={handleScreenshotData}
            equipmentType="terminal_tractor"
            onScreenshotCaptured={handleScreenshotCapture}
          />

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Bron Informatie</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bron</label>
                <select
                  value={formData.bron}
                  onChange={(e) => {
                    handleChange('bron', e.target.value);
                    if (e.target.value !== 'Overige') {
                      handleChange('bron_other', '');
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecteer een bron</option>
                  <option value="Forklift International">Forklift International</option>
                  <option value="Trucks.nl">Trucks.nl</option>
                  <option value="Mascus">Mascus</option>
                  <option value="Supralift">Supralift</option>
                  <option value="Machinio">Machinio</option>
                  <option value="Machineryzone">Machineryzone</option>
                  <option value="Overige">Overige</option>
                </select>
              </div>

              {formData.bron === 'Overige' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Andere bron</label>
                  <input
                    type="text"
                    value={formData.bron_other}
                    onChange={(e) => handleChange('bron_other', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Specificeer de bron"
                  />
                </div>
              )}

              <div className={formData.bron === 'Overige' ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bron URL</label>
                <input
                  type="url"
                  value={formData.bron_url}
                  onChange={(e) => handleChange('bron_url', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Land</label>
                <input
                  type="text"
                  value={formData.land}
                  onChange={(e) => handleChange('land', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijv. Nederland"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Locatie</label>
                <input
                  type="text"
                  value={formData.locatie}
                  onChange={(e) => handleChange('locatie', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijv. Rotterdam"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Notities</label>
              <textarea
                value={formData.notities}
                onChange={(e) => handleChange('notities', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Aanvullende informatie over de bron of observatie..."
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Basisgegevens</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Merk *</label>
                <input
                  type="text"
                  required
                  value={formData.merk}
                  onChange={(e) => handleChange('merk', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijv. Kalmar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type *</label>
                <input
                  type="text"
                  required
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijv. TT612D"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bouwjaar *</label>
                <input
                  type="number"
                  required
                  value={formData.bouwjaar}
                  onChange={(e) => handleChange('bouwjaar', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijv. 2020"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Serienummer</label>
                <input
                  type="text"
                  value={formData.serienummer}
                  onChange={(e) => handleChange('serienummer', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijv. 12345ABC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Brandstof / Aandrijving</label>
                <select
                  value={formData.brandstof}
                  onChange={(e) => handleChange('brandstof', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecteer...</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Schotelhoogte (mm)</label>
                <input
                  type="number"
                  value={formData.fifth_wheel_height_mm}
                  onChange={(e) => handleChange('fifth_wheel_height_mm', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijv. 1150"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Wielbasis (mm)</label>
                <input
                  type="number"
                  value={formData.wheelbase_mm}
                  onChange={(e) => handleChange('wheelbase_mm', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijv. 3600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Afgelezen urenstand</label>
                <input
                  type="number"
                  value={formData.uren}
                  onChange={(e) => handleChange('uren', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijv. 5000"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Prijsinformatie</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Handelsprijs (EUR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.handelsprijs}
                  onChange={(e) => handleChange('handelsprijs', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dealer prijs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Eindklantprijs (EUR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.eindklantprijs}
                  onChange={(e) => handleChange('eindklantprijs', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Klant prijs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Verkoopdatum</label>
                <input
                  type="date"
                  value={formData.verkoopdatum}
                  onChange={(e) => handleChange('verkoopdatum', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Aandrijflijn</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Motor merk</label>
                <input
                  type="text"
                  value={formData.engine_brand}
                  onChange={(e) => handleChange('engine_brand', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Motor type</label>
                <input
                  type="text"
                  value={formData.engine_type}
                  onChange={(e) => handleChange('engine_type', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">AdBlue</label>
                <select
                  value={formData.adblue ? 'yes' : 'no'}
                  onChange={(e) => handleChange('adblue', e.target.value === 'yes')}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="no">Nee</option>
                  <option value="yes">Ja</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Motor opmerkingen</label>
                <input
                  type="text"
                  value={formData.engine_remark}
                  onChange={(e) => handleChange('engine_remark', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Vooras merk</label>
                <input
                  type="text"
                  value={formData.front_axle_brand}
                  onChange={(e) => handleChange('front_axle_brand', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Vooras type</label>
                <input
                  type="text"
                  value={formData.front_axle_type}
                  onChange={(e) => handleChange('front_axle_type', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Vooras opmerkingen</label>
                <input
                  type="text"
                  value={formData.front_axle_remark}
                  onChange={(e) => handleChange('front_axle_remark', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Achteras opmerkingen</label>
                <input
                  type="text"
                  value={formData.rear_axle_remark}
                  onChange={(e) => handleChange('rear_axle_remark', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Transmissie merk</label>
                <input
                  type="text"
                  value={formData.trans_brand}
                  onChange={(e) => handleChange('trans_brand', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Transmissie type</label>
                <input
                  type="text"
                  value={formData.trans_type}
                  onChange={(e) => handleChange('trans_type', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Transmissie opmerkingen</label>
                <input
                  type="text"
                  value={formData.trans_remark}
                  onChange={(e) => handleChange('trans_remark', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Cabine</h2>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.heater}
                  onChange={(e) => handleChange('heater', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Verwarming</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.airco}
                  onChange={(e) => handleChange('airco', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Airco</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.radio}
                  onChange={(e) => handleChange('radio', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Radio</span>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Afmetingen en gewicht</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Lengte totaal (mm)</label>
                <input
                  type="number"
                  value={formData.length_total_mm}
                  onChange={(e) => handleChange('length_total_mm', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Breedte totaal (mm)</label>
                <input
                  type="number"
                  value={formData.width_total_mm}
                  onChange={(e) => handleChange('width_total_mm', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Gesloten hoogte (mm)</label>
                <input
                  type="number"
                  value={formData.drive_through_height_mm}
                  onChange={(e) => handleChange('drive_through_height_mm', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Servicegewicht (kg)</label>
                <input
                  type="number"
                  value={formData.serviceweight_kg}
                  onChange={(e) => handleChange('serviceweight_kg', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Central greasing</h2>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.central_greasing_chassis}
                    onChange={(e) => handleChange('central_greasing_chassis', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Central greasing chassis</span>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Banden</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bandenmaat voor</label>
                  <input
                    type="text"
                    value={formData.tire_size_front}
                    onChange={(e) => handleChange('tire_size_front', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bandenmaat achter</label>
                  <input
                    type="text"
                    value={formData.tire_size_back}
                    onChange={(e) => handleChange('tire_size_back', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
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
                id="photo-upload-terminal-tractor"
              />
              <label htmlFor="photo-upload-terminal-tractor" className="cursor-pointer">
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

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('common.save')}...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('common.save')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {showDuplicateModal && duplicateRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-900">Machine Bekend in Database</h3>
                <button onClick={closeDuplicateModal} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className={`border rounded-lg p-4 mb-6 ${
                duplicateRecord.is_marktdata ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm ${duplicateRecord.is_marktdata ? 'text-yellow-800' : 'text-blue-800'}`}>
                  {duplicateRecord.is_marktdata ? (
                    <>Deze machine (serienummer: {duplicateRecord.serienummer}) bestaat al als <strong>marktdata record</strong> in de database.</>
                  ) : (
                    <>Deze machine (serienummer: {duplicateRecord.serienummer}) bestaat al als <strong>actief dossier</strong> in de database. Er wordt automatisch een nieuw marktdata record aangemaakt.</>
                  )}
                </p>
              </div>
              <div className="space-y-4 mb-6">
                <h4 className="font-medium text-slate-900">Bestaande gegevens {duplicateRecord.is_marktdata ? '(Marktdata)' : '(Dossier)'}:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-600">Merk:</span><span className="ml-2 font-medium">{duplicateRecord.merk}</span></div>
                  <div><span className="text-slate-600">Type:</span><span className="ml-2 font-medium">{duplicateRecord.type}</span></div>
                  <div><span className="text-slate-600">Bouwjaar:</span><span className="ml-2 font-medium">{duplicateRecord.bouwjaar}</span></div>
                  <div><span className="text-slate-600">Uren:</span><span className="ml-2 font-medium">{duplicateRecord.uren || '-'}</span></div>
                  <div><span className="text-slate-600">Handelsprijs:</span><span className="ml-2 font-medium">{duplicateRecord.handelsprijs ? `€ ${duplicateRecord.handelsprijs.toLocaleString('nl-NL')}` : '-'}</span></div>
                  <div><span className="text-slate-600">Eindklantprijs:</span><span className="ml-2 font-medium">{duplicateRecord.eindklantprijs ? `€ ${duplicateRecord.eindklantprijs.toLocaleString('nl-NL')}` : '-'}</span></div>
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
