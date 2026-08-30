import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, X } from 'lucide-react';
import { PhotoGallery } from './PhotoGallery';
import { useLanguage } from '../contexts/LanguageContext';

interface ReachstackerDetails {
  id?: string;
  dossier_id: string;
  order_no: string;
  date: string | null;
  brand: string;
  type: string;
  power: string;
  capacity_kg: number | null;
  capacity_1st_row: number | null;
  capacity_2nd_row: number | null;
  capacity_3rd_row: number | null;
  year_of_manufacture: number | null;
  hours_on_clock: number | null;
  customer_fleet_number: string;
  stacking_height_8_6: number | null;
  stacking_height_9_6: number | null;
  serial_no: string;
  attachment: string;
  attachment_other: string;
  remark: string;
  external_remarks: string;
  length_total_mm: number | null;
  width_total_mm: number | null;
  drive_through_height_mm: number | null;
  serviceweight_kg: number | null;
  cabin_type: string;
  heater: boolean;
  airco: boolean;
  radio: boolean;
  seat_brand: string;
  seat_type_suspension: string;
  headrest: string;
  seat_options: string;
  engine_brand: string;
  engine_type: string;
  engine_remark: string;
  front_axle_brand: string;
  front_axle_type: string;
  front_axle_remark: string;
  rear_axle_remark: string;
  trans_brand: string;
  trans_type: string;
  trans_remark: string;
  adblue: boolean;
  fork_length_mm: number | null;
  fork_width_mm: number | null;
  fork_height_mm: number | null;
  hydraulic_lines: number | null;
  no_forks: boolean;
  central_greasing_chassis: boolean;
  central_greasing_spreader: boolean;
  tire_size_front: string;
  tire_size_back: string;
  tire_type: string;
}

interface ReachstackerDetailsFormProps {
  dossierId: string;
  dossierNumber?: string;
  dossierBrand?: string;
  dossierModel?: string;
  dossierYear?: number;
  dossierDescription?: string;
  onClose: () => void;
  onSave: () => void;
}

export function ReachstackerDetailsForm({ dossierId, dossierNumber, dossierBrand, dossierModel, dossierYear, dossierDescription, onClose, onSave }: ReachstackerDetailsFormProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ReachstackerDetails>({
    dossier_id: dossierId,
    order_no: dossierNumber || '',
    date: null,
    brand: dossierBrand || '',
    type: dossierModel || '',
    power: '',
    capacity_kg: null,
    capacity_1st_row: null,
    capacity_2nd_row: null,
    capacity_3rd_row: null,
    year_of_manufacture: dossierYear || null,
    hours_on_clock: null,
    customer_fleet_number: '',
    stacking_height_8_6: null,
    stacking_height_9_6: null,
    serial_no: '',
    attachment: 'No attachment',
    attachment_other: '',
    remark: '',
    external_remarks: '',
    length_total_mm: null,
    width_total_mm: null,
    drive_through_height_mm: null,
    serviceweight_kg: null,
    cabin_type: '',
    heater: false,
    airco: false,
    radio: false,
    seat_brand: '',
    seat_type_suspension: '',
    headrest: '',
    seat_options: '',
    engine_brand: '',
    engine_type: '',
    engine_remark: '',
    front_axle_brand: '',
    front_axle_type: '',
    front_axle_remark: '',
    rear_axle_remark: '',
    trans_brand: '',
    trans_type: '',
    trans_remark: '',
    adblue: false,
    fork_length_mm: null,
    fork_width_mm: null,
    fork_height_mm: null,
    hydraulic_lines: null,
    no_forks: false,
    central_greasing_chassis: false,
    central_greasing_spreader: false,
    tire_size_front: '',
    tire_size_back: '',
    tire_type: '',
  });

  useEffect(() => {
    loadDetails();
  }, [dossierId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reachstacker_details')
        .select('*')
        .eq('dossier_id', dossierId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setFormData({
          ...data,
          order_no: dossierNumber || data.order_no || '',
        });
      } else {
        setFormData(prev => ({
          ...prev,
          order_no: dossierNumber || '',
          brand: dossierBrand || '',
          type: dossierModel || '',
          year_of_manufacture: dossierYear || null,
          remark: dossierDescription || '',
        }));
      }
    } catch (error) {
      console.error('Error loading reachstacker details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      const dataToSave = {
        ...formData,
        capacity_kg: formData.capacity_1st_row || formData.capacity_kg
      };

      const { error } = formData.id
        ? await supabase
            .from('reachstacker_details')
            .update(dataToSave)
            .eq('id', formData.id)
        : await supabase.from('reachstacker_details').insert([dataToSave]);

      if (error) throw error;

      await supabase
        .from('dossiers')
        .update({
          // Basis equipment details
          brand: formData.brand,
          model: formData.type,
          year: formData.year_of_manufacture,
          // Nederlandse velden (nieuw)
          capaciteit: dataToSave.capacity_kg,
          uren: formData.hours_on_clock,
          // Engelse velden (voor backward compatibility met marktdata)
          capacity: dataToSave.capacity_kg,
          hours: formData.hours_on_clock
        })
        .eq('id', dossierId);

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving reachstacker details:', error);
      const errorMessage = error?.message || JSON.stringify(error);
      alert(`Er is een fout opgetreden bij het opslaan van reachstacker details:\n\n${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ReachstackerDetails, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-600 mt-2">Laden...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-h-screen flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-slate-800">Reachstacker Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">{t('forms.photos')}</h3>
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <PhotoGallery dossierId={dossierId} canDelete={false} disableZoom={false} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('formFields.hcliftersReference')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {formData.order_no?.startsWith('MKT') ? 'Marktdata Referentie' : t('dossiers.dossierNumber')}
                    </label>
                    <input
                      type="text"
                      value={formData.order_no}
                      onChange={(e) => handleChange('order_no', e.target.value)}
                      disabled={formData.order_no?.startsWith('MKT')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('formFields.date')}</label>
                    <input
                      type="date"
                      value={formData.date || ''}
                      onChange={(e) => handleChange('date', e.target.value || null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('formFields.reachstacker')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => handleChange('brand', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={formData.type}
                      onChange={(e) => handleChange('type', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Year of manufacturing
                    </label>
                    <input
                      type="number"
                      value={formData.year_of_manufacture || ''}
                      onChange={(e) => handleChange('year_of_manufacture', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Afgelezen urenstand
                    </label>
                    <input
                      type="number"
                      value={formData.hours_on_clock || ''}
                      onChange={(e) => handleChange('hours_on_clock', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Vlootnummer klant
                    </label>
                    <input
                      type="text"
                      value={formData.customer_fleet_number}
                      onChange={(e) => handleChange('customer_fleet_number', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Serial No.
                    </label>
                    <input
                      type="text"
                      value={formData.serial_no}
                      onChange={(e) => handleChange('serial_no', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Power</label>
                    <select
                      value={formData.power}
                      onChange={(e) => handleChange('power', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Capacity 1st row (kg)
                    </label>
                    <input
                      type="number"
                      value={formData.capacity_1st_row || ''}
                      onChange={(e) => handleChange('capacity_1st_row', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Capacity 2nd row (kg)
                    </label>
                    <input
                      type="number"
                      value={formData.capacity_2nd_row || ''}
                      onChange={(e) => handleChange('capacity_2nd_row', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Capacity 3rd row (kg)
                    </label>
                    <input
                      type="number"
                      value={formData.capacity_3rd_row || ''}
                      onChange={(e) => handleChange('capacity_3rd_row', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('formFields.drivetrain')}</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Engine brand
                      </label>
                      <input
                        type="text"
                        value={formData.engine_brand}
                        onChange={(e) => handleChange('engine_brand', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Engine type
                      </label>
                      <input
                        type="text"
                        value={formData.engine_type}
                        onChange={(e) => handleChange('engine_type', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        AdBlue
                      </label>
                      <select
                        value={formData.adblue ? 'yes' : 'no'}
                        onChange={(e) => handleChange('adblue', e.target.value === 'yes')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Engine remarks
                      </label>
                      <input
                        type="text"
                        value={formData.engine_remark}
                        onChange={(e) => handleChange('engine_remark', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Front axle brand
                      </label>
                      <input
                        type="text"
                        value={formData.front_axle_brand}
                        onChange={(e) => handleChange('front_axle_brand', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Front axle type
                      </label>
                      <input
                        type="text"
                        value={formData.front_axle_type}
                        onChange={(e) => handleChange('front_axle_type', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Front axle remarks
                      </label>
                      <input
                        type="text"
                        value={formData.front_axle_remark}
                        onChange={(e) => handleChange('front_axle_remark', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Rear axle remarks
                    </label>
                    <input
                      type="text"
                      value={formData.rear_axle_remark}
                      onChange={(e) => handleChange('rear_axle_remark', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Transmission brand
                      </label>
                      <input
                        type="text"
                        value={formData.trans_brand}
                        onChange={(e) => handleChange('trans_brand', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Transmission type
                      </label>
                      <input
                        type="text"
                        value={formData.trans_type}
                        onChange={(e) => handleChange('trans_type', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Transmission remarks
                      </label>
                      <input
                        type="text"
                        value={formData.trans_remark}
                        onChange={(e) => handleChange('trans_remark', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('formFields.mast')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Stacking height 8'6"
                    </label>
                    <input
                      type="number"
                      value={formData.stacking_height_8_6 || ''}
                      onChange={(e) => handleChange('stacking_height_8_6', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Stacking height 9'6"
                    </label>
                    <input
                      type="number"
                      value={formData.stacking_height_9_6 || ''}
                      onChange={(e) => handleChange('stacking_height_9_6', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('formFields.attachment')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Type
                    </label>
                    <select
                      value={formData.attachment}
                      onChange={(e) => handleChange('attachment', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="No attachment">No attachment</option>
                      <option value="20-40ft toplift">20-40ft toplift</option>
                      <option value="20-240ft toplift OH legs">20-240ft toplift OH legs</option>
                      <option value="20-40ft piggy back">20-40ft piggy back</option>
                      <option value="Mini spreader">Mini spreader</option>
                      <option value="C-hook">C-hook</option>
                      <option value="Crane hook">Crane hook</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('formFields.cabin')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.heater}
                        onChange={(e) => handleChange('heater', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Heater</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.airco}
                        onChange={(e) => handleChange('airco', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Airco</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-4">
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
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('formFields.dimensionsWeight')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Length total (mm)
                    </label>
                    <input
                      type="number"
                      value={formData.length_total_mm || ''}
                      onChange={(e) => handleChange('length_total_mm', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Width total (mm)
                    </label>
                    <input
                      type="number"
                      value={formData.width_total_mm || ''}
                      onChange={(e) => handleChange('width_total_mm', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Closed height (mm)
                    </label>
                    <input
                      type="number"
                      value={formData.drive_through_height_mm || ''}
                      onChange={(e) => handleChange('drive_through_height_mm', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Serviceweight (kg)
                    </label>
                    <input
                      type="number"
                      value={formData.serviceweight_kg || ''}
                      onChange={(e) => handleChange('serviceweight_kg', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('formFields.centralGreasing')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.central_greasing_chassis}
                        onChange={(e) => handleChange('central_greasing_chassis', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">{t('formFields.centralGreasingChassis')}</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.central_greasing_spreader}
                        onChange={(e) => handleChange('central_greasing_spreader', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">{t('formFields.centralGreasingSpreader')}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('formFields.tires')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('formFields.tireSizeFront')}
                    </label>
                    <input
                      type="text"
                      value={formData.tire_size_front}
                      onChange={(e) => handleChange('tire_size_front', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('formFields.tireSizeBack')}
                    </label>
                    <input
                      type="text"
                      value={formData.tire_size_back}
                      onChange={(e) => handleChange('tire_size_back', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('formFields.remarks')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('formFields.internalRemarks')}
                    </label>
                    <textarea
                      value={formData.remark}
                      onChange={(e) => handleChange('remark', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('formFields.externalRemarks')}
                    </label>
                    <textarea
                      value={formData.external_remarks}
                      onChange={(e) => handleChange('external_remarks', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </form>

        <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? `${t('common.save')}...` : t('common.save')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
