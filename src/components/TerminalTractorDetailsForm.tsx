import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, X } from 'lucide-react';
import { PhotoGallery } from './PhotoGallery';
import { useLanguage } from '../contexts/LanguageContext';

interface TerminalTractorDetails {
  id?: string;
  dossier_id: string;
  order_no: string;
  date: string | null;
  brand: string;
  type: string;
  power: string;
  capacity_1st_row: number | null;
  year_of_manufacture: number | null;
  hours_on_clock: number | null;
  customer_fleet_number: string;
  fifth_wheel_height_mm: number | null;
  wheelbase_mm: number | null;
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
  central_greasing_chassis: boolean;
  tire_size_front: string;
  tire_size_back: string;
  battery_capacity_kwh: number | null;
  has_charger: boolean;
  charger_capacity_kw: number | null;
}

interface TerminalTractorDetailsFormProps {
  dossierId: string;
  dossierNumber?: string;
  dossierBrand?: string;
  dossierModel?: string;
  dossierYear?: number;
  dossierDescription?: string;
  onClose: () => void;
  onSave: () => void;
}

export function TerminalTractorDetailsForm({ dossierId, dossierNumber, dossierBrand, dossierModel, dossierYear, dossierDescription, onClose, onSave }: TerminalTractorDetailsFormProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<TerminalTractorDetails>({
    dossier_id: dossierId,
    order_no: dossierNumber || '',
    date: null,
    brand: dossierBrand || '',
    type: dossierModel || '',
    power: '',
    capacity_1st_row: null,
    year_of_manufacture: dossierYear || null,
    hours_on_clock: null,
    customer_fleet_number: '',
    fifth_wheel_height_mm: null,
    wheelbase_mm: null,
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
    central_greasing_chassis: false,
    tire_size_front: '',
    tire_size_back: '',
    battery_capacity_kwh: null,
    has_charger: false,
    charger_capacity_kw: null,
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

      // Load terminal tractor details
      const { data: details, error: detailsError } = await supabase
        .from('terminal_tractor_details')
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
        power: dossier.power || details?.power || '',
        capacity_1st_row: details?.capacity_1st_row || null,
        year_of_manufacture: dossier.year || dossierYear || null,
        hours_on_clock: dossier.hours || details?.hours_on_clock || null,
        customer_fleet_number: details?.customer_fleet_number || '',
        fifth_wheel_height_mm: details?.fifth_wheel_height_mm || null,
        wheelbase_mm: details?.wheelbase_mm || null,
        serial_no: dossier.serial_number || details?.serial_no || '',
        attachment: dossier.attachment || details?.attachment || '',
        remark: details?.remark || dossier.description || dossierDescription || '',
        external_remarks: details?.external_remarks || '',
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
        central_greasing_chassis: details?.central_greasing_chassis || false,
        tire_size_front: details?.tire_size_front || '',
        tire_size_back: details?.tire_size_back || '',
        battery_capacity_kwh: details?.battery_capacity_kwh || null,
        has_charger: details?.has_charger || false,
        charger_capacity_kw: details?.charger_capacity_kw || null,
      });
    } catch (error) {
      console.error('Error loading terminal tractor details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      const { id, ...dataToSave } = formData;

      const { error } = id
        ? await supabase
            .from('terminal_tractor_details')
            .update(dataToSave)
            .eq('id', id)
        : await supabase.from('terminal_tractor_details').insert([dataToSave]);

      if (error) throw error;

      await supabase
        .from('dossiers')
        .update({
          // Basis equipment details
          brand: formData.brand,
          model: formData.type,
          year: formData.year_of_manufacture,
          // Nederlandse veld (nieuw)
          uren: formData.hours_on_clock,
          // Engels veld (voor backward compatibility met marktdata)
          hours: formData.hours_on_clock
        })
        .eq('id', dossierId);

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving terminal tractor details:', error);
      const errorMessage = error?.message || JSON.stringify(error);
      alert(`Er is een fout opgetreden bij het opslaan van terminal tractor details:\n\n${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof TerminalTractorDetails, value: any) => {
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
          <h2 className="text-2xl font-bold text-slate-800">Terminal Tractor Details</h2>
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
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('formFields.terminalTractor')}</h3>
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

                  {formData.power === 'Electric' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Battery Capacity (kWh)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.battery_capacity_kwh || ''}
                          onChange={(e) => handleChange('battery_capacity_kwh', e.target.value ? parseFloat(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Charger?
                        </label>
                        <select
                          value={formData.has_charger ? 'yes' : 'no'}
                          onChange={(e) => handleChange('has_charger', e.target.value === 'yes')}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>

                      {formData.has_charger && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Charger Capacity (kW/h)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.charger_capacity_kw || ''}
                            onChange={(e) => handleChange('charger_capacity_kw', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Fifth Wheel Capacity (kg)
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
                      Axle Configuration
                    </label>
                    <select
                      value={formData.cabin_type}
                      onChange={(e) => handleChange('cabin_type', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="4x2">4x2</option>
                      <option value="4x4">4x4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Fifth wheel height (mm)
                    </label>
                    <input
                      type="number"
                      value={formData.fifth_wheel_height_mm || ''}
                      onChange={(e) => handleChange('fifth_wheel_height_mm', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Wielbasis (mm)
                    </label>
                    <input
                      type="number"
                      value={formData.wheelbase_mm || ''}
                      onChange={(e) => handleChange('wheelbase_mm', e.target.value ? parseInt(e.target.value) : null)}
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
                      <span className="text-sm font-medium text-slate-700">Central greasing chassis</span>
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
