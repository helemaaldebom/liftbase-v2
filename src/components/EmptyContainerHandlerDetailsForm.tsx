import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, X } from 'lucide-react';
import { PhotoGallery } from './PhotoGallery';
import { useLanguage } from '../contexts/LanguageContext';

interface EmptyContainerHandlerDetails {
  id?: string;
  dossier_id: string;
  order_no: string;
  date: string | null;
  brand: string;
  type: string;
  power: string;
  capacity_kg: number | null;
  load_center_mm: number | null;
  year_of_manufacture: number | null;
  hours_on_clock: number | null;
  customer_fleet_number: string;
  mast: string;
  mast_type: string;
  free_lift: string;
  lift_height_mm: number | null;
  serial_no: string;
  attachment: string;
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
  double_box_type: string;
  double_box: boolean;
}

interface EmptyContainerHandlerDetailsFormProps {
  dossierId: string;
  dossierNumber?: string;
  dossierBrand?: string;
  dossierModel?: string;
  dossierYear?: number;
  dossierDescription?: string;
  onClose: () => void;
  onSave: () => void;
}

export function EmptyContainerHandlerDetailsForm({ dossierId, dossierNumber, dossierBrand, dossierModel, dossierYear, dossierDescription, onClose, onSave }: EmptyContainerHandlerDetailsFormProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<EmptyContainerHandlerDetails>({
    dossier_id: dossierId,
    order_no: dossierNumber || '',
    date: null,
    brand: dossierBrand || '',
    type: dossierModel || '',
    power: '',
    capacity_kg: null,
    load_center_mm: null,
    year_of_manufacture: dossierYear || null,
    hours_on_clock: null,
    customer_fleet_number: '',
    mast: '',
    mast_type: '',
    free_lift: '',
    lift_height_mm: null,
    serial_no: '',
    attachment: 'No attachment',
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
    double_box_type: '',
    double_box: false,
  });

  useEffect(() => {
    loadDetails();
  }, [dossierId]);

  const loadDetails = async () => {
    try {
      setLoading(true);

      // Load dossier data first
      const { data: dossier, error: dossierError } = await supabase
        .from('dossiers')
        .select('*')
        .eq('id', dossierId)
        .single();

      if (dossierError) throw dossierError;

      // Load ECH details
      const { data: details, error: detailsError } = await supabase
        .from('empty_container_handler_details')
        .select('*')
        .eq('dossier_id', dossierId)
        .maybeSingle();

      if (detailsError && detailsError.code !== 'PGRST116') throw detailsError;

      // Merge dossier and details data
      setFormData({
        id: details?.id,
        dossier_id: dossierId,
        order_no: dossier.dossier_number || dossierNumber || '',
        date: details?.date || null,
        brand: dossier.brand || dossierBrand || '',
        type: dossier.model || dossierModel || '',
        power: dossier.power || '',
        capacity_kg: dossier.capacity || null,
        load_center_mm: dossier.load_center || null,
        year_of_manufacture: dossier.year || dossierYear || null,
        hours_on_clock: dossier.hours || null,
        customer_fleet_number: details?.customer_fleet_number || '',
        mast: dossier.mast || '',
        mast_type: dossier.mast_type || '',
        free_lift: dossier.free_lift || '',
        lift_height_mm: dossier.lifting_height || null,
        serial_no: dossier.serial_number || '',
        attachment: dossier.attachment || '',
        remark: details?.remark || dossier.description || dossierDescription || '',
        length_total_mm: details?.length_total_mm || null,
        width_total_mm: details?.width_total_mm || null,
        drive_through_height_mm: details?.drive_through_height_mm || null,
        serviceweight_kg: details?.serviceweight_kg || null,
        cabin_type: details?.cabin_type || '',
        heater: details?.heater || false,
        airco: details?.airco || false,
        radio: details?.radio || false,
        seat_brand: details?.seat_brand || '',
        seat_type_suspension: details?.seat_type_suspension || '',
        headrest: details?.headrest || '',
        seat_options: details?.seat_options || '',
        engine_brand: details?.engine_brand || '',
        engine_type: details?.engine_type || '',
        engine_remark: details?.engine_remark || '',
        front_axle_brand: details?.front_axle_brand || '',
        front_axle_type: details?.front_axle_type || '',
        front_axle_remark: details?.front_axle_remark || '',
        rear_axle_remark: details?.rear_axle_remark || '',
        trans_brand: details?.trans_brand || '',
        trans_type: details?.trans_type || '',
        trans_remark: details?.trans_remark || '',
        adblue: details?.adblue || false,
        fork_length_mm: details?.fork_length_mm || null,
        fork_width_mm: details?.fork_width_mm || null,
        fork_height_mm: details?.fork_height_mm || null,
        hydraulic_lines: details?.hydraulic_lines || null,
        no_forks: details?.no_forks || false,
        central_greasing_chassis: details?.central_greasing_chassis || false,
        central_greasing_spreader: details?.central_greasing_spreader || false,
        tire_size_front: details?.tire_size_front || '',
        tire_size_back: details?.tire_size_back || '',
        tire_type: details?.tire_type || '',
        double_box_type: details?.double_box_type || '',
        double_box: !!(details?.double_box_type),
      });
    } catch (error) {
      console.error('Error loading empty container handler details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      const { double_box, id, ...dataToSave } = formData;
      if (!double_box) {
        dataToSave.double_box_type = '';
      }

      const { error } = id
        ? await supabase
            .from('empty_container_handler_details')
            .update(dataToSave)
            .eq('id', id)
        : await supabase.from('empty_container_handler_details').insert([dataToSave]);

      if (error) throw error;

      await supabase
        .from('dossiers')
        .update({
          // Basis equipment details
          brand: formData.brand,
          model: formData.type,
          year: formData.year_of_manufacture,
          // Nederlandse velden (nieuw)
          capaciteit: formData.capacity_kg,
          lastzwaartepunt: formData.load_center_mm,
          hefhoogte: formData.lift_height_mm,
          uren: formData.hours_on_clock,
          masttype: formData.mast_type,
          mast_type: formData.mast_type,
          // Engelse velden (voor backward compatibility met marktdata)
          capacity: formData.capacity_kg,
          load_center: formData.load_center_mm,
          lifting_height: formData.lift_height_mm,
          hours: formData.hours_on_clock
        })
        .eq('id', dossierId);

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving empty container handler details:', error);
      const errorMessage = error?.message || JSON.stringify(error);
      alert(`Er is een fout opgetreden bij het opslaan van ECH details:\n\n${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof EmptyContainerHandlerDetails, value: any) => {
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
          <h2 className="text-2xl font-bold text-slate-800">Empty Container Handler Details</h2>
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
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('formFields.emptyContainerHandler')}</h3>
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
                      Capacity (kg)
                    </label>
                    <input
                      type="number"
                      value={formData.capacity_kg || ''}
                      onChange={(e) => handleChange('capacity_kg', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Load center (mm)
                    </label>
                    <input
                      type="number"
                      value={formData.load_center_mm || ''}
                      onChange={(e) => handleChange('load_center_mm', e.target.value ? parseInt(e.target.value) : null)}
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
                      Mast type
                    </label>
                    <select
                      value={formData.mast_type}
                      onChange={(e) => handleChange('mast_type', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="duplex">Duplex</option>
                      <option value="duplex FFL">Duplex FFL</option>
                      <option value="triplex">Triplex</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Lift Height
                    </label>
                    <select
                      value={formData.lift_height_mm || ''}
                      onChange={(e) => handleChange('lift_height_mm', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="3">3 high</option>
                      <option value="4">4 high</option>
                      <option value="5">5 high</option>
                      <option value="6">6 high</option>
                      <option value="7">7 high</option>
                      <option value="8">8 high</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.double_box}
                        onChange={(e) => handleChange('double_box', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Double box</span>
                    </label>
                  </div>
                  {formData.double_box && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Double box type
                      </label>
                      <select
                        value={formData.double_box_type}
                        onChange={(e) => handleChange('double_box_type', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        <option value="hook and side clamp">Hook and side clamp</option>
                        <option value="horizontal twistlock">Horizontal twistlock</option>
                        <option value="hook and wedge clamp">Hook and wedge clamp</option>
                      </select>
                    </div>
                  )}
                  {(formData.mast_type === 'duplex FFL' || formData.mast_type === 'triplex') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Free lift
                      </label>
                      <input
                        type="text"
                        value={formData.free_lift}
                        onChange={(e) => handleChange('free_lift', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
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
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('formFields.typeOfTire')}
                    </label>
                    <select
                      value={formData.tire_type}
                      onChange={(e) => handleChange('tire_type', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="solid">Solid</option>
                      <option value="air_suspended">Air suspended</option>
                    </select>
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
