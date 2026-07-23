import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Copy } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { CustomerSelector } from './CustomerSelector';

interface CopyDossierModalProps {
  dossier: any;
  onClose: () => void;
  onSuccess: (newDossierId?: string) => void;
}

export function CopyDossierModal({ dossier, onClose, onSuccess }: CopyDossierModalProps) {
  console.log('=== COPY DOSSIER MODAL OPENED ===');
  console.log('Dossier received:', dossier.dossier_number);
  console.log('Equipment type:', dossier.equipment_type);
  console.log('Has forklift_details?', !!dossier.forklift_details);
  if (dossier.forklift_details) {
    const fd = Array.isArray(dossier.forklift_details) ? dossier.forklift_details[0] : dossier.forklift_details;
    console.log('Forklift details preview:', {
      serial_no: fd?.serial_no,
      capacity_kg: fd?.capacity_kg,
      engine_brand: fd?.engine_brand,
      engine_type: fd?.engine_type
    });
  }

  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(dossier.customer_id || null);
  const [customerName, setCustomerName] = useState<string | null>(dossier.customer_name || null);
  const [formData, setFormData] = useState({
    title: dossier.title || '',
    description: dossier.description || '',
    equipment_type: dossier.equipment_type || '',
    brand: dossier.brand || '',
    model: dossier.model || '',
    year: dossier.year?.toString() || '',
    condition: dossier.condition || 'good',
    location: dossier.location || '',
    estimated_value: dossier.estimated_value?.toString() || '',
    latitude: dossier.latitude?.toString() || '',
    longitude: dossier.longitude?.toString() || '',
    purchase_price: dossier.purchase_price?.toString() || '',
    merk: dossier.merk || '',
    type: dossier.type || '',
    bouwjaar: dossier.bouwjaar?.toString() || '',
    serienummer: dossier.serienummer || '',
    uren: dossier.uren?.toString() || '',
    capaciteit: dossier.capaciteit?.toString() || '',
    hefhoogte: dossier.hefhoogte?.toString() || '',
    land: dossier.land || '',
    locatie: dossier.locatie || '',
    brandstof: dossier.brandstof || '',
    lastzwaartepunt: dossier.lastzwaartepunt?.toString() || '',
    vrije_hef: dossier.vrije_hef?.toString() || '',
    masttype: dossier.masttype || '',
    aanbouwdeel: dossier.aanbouwdeel || '',
    handelsprijs: dossier.handelsprijs?.toString() || '',
    eindklantprijs: dossier.eindklantprijs?.toString() || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('common.notLoggedIn'));

      const { data: newDossier, error: insertError } = await supabase.from('dossiers').insert({
        title: formData.title,
        description: formData.description,
        equipment_type: formData.equipment_type,
        brand: formData.brand,
        model: formData.model,
        year: formData.year ? parseInt(formData.year) : null,
        condition: formData.condition,
        location: formData.location,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        customer_id: customerId,
        customer_name: customerName,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        merk: formData.merk || null,
        type: formData.type || null,
        bouwjaar: formData.bouwjaar ? parseInt(formData.bouwjaar) : null,
        serienummer: formData.serienummer || null,
        uren: formData.uren ? parseInt(formData.uren) : null,
        capaciteit: formData.capaciteit ? parseFloat(formData.capaciteit) : null,
        hefhoogte: formData.hefhoogte ? parseFloat(formData.hefhoogte) : null,
        land: formData.land || null,
        locatie: formData.locatie || null,
        brandstof: formData.brandstof || null,
        lastzwaartepunt: formData.lastzwaartepunt ? parseFloat(formData.lastzwaartepunt) : null,
        vrije_hef: formData.vrije_hef ? parseFloat(formData.vrije_hef) : null,
        masttype: formData.masttype || null,
        aanbouwdeel: formData.aanbouwdeel || null,
        handelsprijs: formData.handelsprijs ? parseFloat(formData.handelsprijs) : null,
        eindklantprijs: formData.eindklantprijs ? parseFloat(formData.eindklantprijs) : null,
        created_by: user.id,
        status: 'open',
      }).select().single();

      if (insertError) throw insertError;

      if (newDossier) {
        // Wait for trigger to complete and details to be created
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch the newly created details to ensure they exist
        const { data: newDossierWithDetails } = await supabase
          .from('dossiers')
          .select(`
            *,
            forklift_details(*),
            ech_details:empty_container_handler_details(*),
            reachstacker_details(*),
            terminal_tractor_details(*)
          `)
          .eq('id', newDossier.id)
          .single();

        console.log('New dossier with details:', newDossierWithDetails);

        if (dossier.equipment_type === 'heavy_duty_forklift' && dossier.forklift_details) {
          const details = Array.isArray(dossier.forklift_details)
            ? dossier.forklift_details[0]
            : dossier.forklift_details;

          if (details) {
            console.log('=== FORKLIFT DETAILS FROM ORIGINAL DOSSIER ===');
            console.log('Full details object:', JSON.stringify(details, null, 2));
            console.log('Key fields:');
            console.log('- serial_no:', details.serial_no);
            console.log('- power:', details.power);
            console.log('- capacity_kg:', details.capacity_kg);
            console.log('- load_center_mm:', details.load_center_mm);
            console.log('- engine_brand:', details.engine_brand);
            console.log('- engine_type:', details.engine_type);
            console.log('- trans_brand:', details.trans_brand);
            console.log('- trans_type:', details.trans_type);
            console.log('- adblue:', details.adblue);
            console.log('- hydraulic_lines:', details.hydraulic_lines);
            console.log('- attachment:', details.attachment);
            console.log('- cabin_type:', details.cabin_type);
            console.log('- radio:', details.radio);
            const updateData = {
            order_no: details.order_no || '',
            date: details.date || null,
            brand: details.brand || '',
            type: details.type || '',
            power: details.power || '',
            capacity_kg: details.capacity_kg || null,
            load_center_mm: details.load_center_mm || null,
            year_of_manufacture: details.year_of_manufacture || null,
            hours_on_clock: details.hours_on_clock || null,
            mast: details.mast || '',
            mast_type: details.mast_type || '',
            free_lift: details.free_lift || '',
            lift_height_mm: details.lift_height_mm || null,
            serial_no: details.serial_no || '',
            attachment: details.attachment || '',
            remark: details.remark || '',
            external_remarks: details.external_remarks || '',
            length_total_mm: details.length_total_mm || null,
            width_total_mm: details.width_total_mm || null,
            drive_through_height_mm: details.drive_through_height_mm || null,
            serviceweight_kg: details.serviceweight_kg || null,
            cabin_type: details.cabin_type || '',
            heater: details.heater || false,
            airco: details.airco || false,
            radio: details.radio || false,
            seat_brand: details.seat_brand || '',
            seat_type_suspension: details.seat_type_suspension || '',
            headrest: details.headrest || '',
            seat_options: details.seat_options || '',
            engine_brand: details.engine_brand || '',
            engine_type: details.engine_type || '',
            engine_remark: details.engine_remark || '',
            front_axle_brand: details.front_axle_brand || '',
            front_axle_type: details.front_axle_type || '',
            front_axle_remark: details.front_axle_remark || '',
            rear_axle_remark: details.rear_axle_remark || '',
            trans_brand: details.trans_brand || '',
            trans_type: details.trans_type || '',
            trans_remark: details.trans_remark || '',
            adblue: details.adblue || false,
            fork_length_mm: details.fork_length_mm || null,
            fork_width_mm: details.fork_width_mm || null,
            fork_height_mm: details.fork_height_mm || null,
            hydraulic_lines: details.hydraulic_lines || null,
            no_forks: details.no_forks || false,
            tire_size_front: details.tire_size_front || '',
            tire_size_back: details.tire_size_back || '',
            tire_type: details.tire_type || '',
            central_greasing_chassis: details.central_greasing_chassis || false,
          };
          console.log('Inserting forklift_details directly:', updateData);

          const { error: detailsError, data: insertResult } = await supabase
            .from('forklift_details')
            .insert({
              dossier_id: newDossier.id,
              ...updateData
            })
            .select();

          if (detailsError) {
            console.error('Error copying forklift details:', detailsError);
            throw new Error('Failed to copy forklift details: ' + detailsError.message);
          }

          console.log('Forklift details insert result:', insertResult);
          console.log('Forklift details copied successfully');

          const { data: verifyData, error: verifyError } = await supabase
            .from('forklift_details')
            .select('*')
            .eq('dossier_id', newDossier.id)
            .single();

          if (verifyError) {
            console.error('Error verifying forklift details:', verifyError);
          } else {
            console.log('Verified forklift details after copy:', verifyData);
          }
          }
        }

        if (dossier.equipment_type === 'empty_container_handler' && dossier.ech_details) {
          const details = Array.isArray(dossier.ech_details)
            ? dossier.ech_details[0]
            : dossier.ech_details;

          if (details) {
            const { error: detailsError } = await supabase.from('empty_container_handler_details')
            .insert({
            dossier_id: newDossier.id,
            order_no: details.order_no || '',
            date: details.date || null,
            brand: details.brand || '',
            type: details.type || '',
            power: details.power || '',
            capacity_kg: details.capacity_kg || null,
            load_center_mm: details.load_center_mm || null,
            year_of_manufacture: details.year_of_manufacture || null,
            hours_on_clock: details.hours_on_clock || null,
            serial_no: details.serial_no || '',
            mast: details.mast || '',
            mast_type: details.mast_type || '',
            free_lift: details.free_lift || '',
            lift_height_mm: details.lift_height_mm || null,
            remark: details.remark || '',
            engine_brand: details.engine_brand || '',
            engine_type: details.engine_type || '',
            engine_remark: details.engine_remark || '',
            front_axle_brand: details.front_axle_brand || '',
            front_axle_type: details.front_axle_type || '',
            front_axle_remark: details.front_axle_remark || '',
            rear_axle_remark: details.rear_axle_remark || '',
            trans_brand: details.trans_brand || '',
            trans_type: details.trans_type || '',
            trans_remark: details.trans_remark || '',
            adblue: details.adblue || false,
            hydraulic_lines: details.hydraulic_lines || null,
            attachment: details.attachment || 'No attachment',
            attachment_other: details.attachment_other || '',
            fork_length_mm: details.fork_length_mm || null,
            fork_width_mm: details.fork_width_mm || null,
            fork_height_mm: details.fork_height_mm || null,
            no_forks: details.no_forks || false,
            cabin_type: details.cabin_type || '',
            heater: details.heater || false,
            airco: details.airco || false,
            radio: details.radio || false,
            seat_brand: details.seat_brand || '',
            seat_type_suspension: details.seat_type_suspension || '',
            headrest: details.headrest || '',
            seat_options: details.seat_options || '',
            length_total_mm: details.length_total_mm || null,
            width_total_mm: details.width_total_mm || null,
            drive_through_height_mm: details.drive_through_height_mm || null,
            serviceweight_kg: details.serviceweight_kg || null,
            tire_size_front: details.tire_size_front || '',
            tire_size_back: details.tire_size_back || '',
            tire_type: details.tire_type || '',
            central_greasing_chassis: details.central_greasing_chassis || false,
            central_greasing_spreader: details.central_greasing_spreader || false,
          })
          .select();
          if (detailsError) {
            console.error('Error copying ECH details:', detailsError);
            throw new Error('Failed to copy ECH details');
          }
          console.log('ECH details copied successfully');
          }
        }

        if (dossier.equipment_type === 'reachstacker' && dossier.reachstacker_details) {
          const details = Array.isArray(dossier.reachstacker_details)
            ? dossier.reachstacker_details[0]
            : dossier.reachstacker_details;

          if (details) {
            const { error: detailsError } = await supabase.from('reachstacker_details')
            .insert({
            dossier_id: newDossier.id,
            order_no: details.order_no || '',
            date: details.date || null,
            brand: details.brand || '',
            type: details.type || '',
            power: details.power || '',
            capacity_1st_row: details.capacity_1st_row || null,
            capacity_2nd_row: details.capacity_2nd_row || null,
            capacity_3rd_row: details.capacity_3rd_row || null,
            year_of_manufacture: details.year_of_manufacture || null,
            hours_on_clock: details.hours_on_clock || null,
            serial_no: details.serial_no || '',
            mast: details.mast || '',
            free_lift: details.free_lift || '',
            lift_height_mm: details.lift_height_mm || null,
            stacking_height_8_6: details.stacking_height_8_6 || null,
            stacking_height_9_6: details.stacking_height_9_6 || null,
            remark: details.remark || '',
            engine_brand: details.engine_brand || '',
            engine_type: details.engine_type || '',
            engine_remark: details.engine_remark || '',
            front_axle_brand: details.front_axle_brand || '',
            front_axle_type: details.front_axle_type || '',
            front_axle_remark: details.front_axle_remark || '',
            rear_axle_remark: details.rear_axle_remark || '',
            trans_brand: details.trans_brand || '',
            trans_type: details.trans_type || '',
            trans_remark: details.trans_remark || '',
            adblue: details.adblue || false,
            hydraulic_lines: details.hydraulic_lines || null,
            attachment: details.attachment || 'No attachment',
            attachment_other: details.attachment_other || '',
            fork_length_mm: details.fork_length_mm || null,
            fork_width_mm: details.fork_width_mm || null,
            fork_height_mm: details.fork_height_mm || null,
            no_forks: details.no_forks || false,
            cabin_type: details.cabin_type || '',
            heater: details.heater || false,
            airco: details.airco || false,
            radio: details.radio || false,
            seat_brand: details.seat_brand || '',
            seat_type_suspension: details.seat_type_suspension || '',
            headrest: details.headrest || '',
            seat_options: details.seat_options || '',
            length_total_mm: details.length_total_mm || null,
            width_total_mm: details.width_total_mm || null,
            drive_through_height_mm: details.drive_through_height_mm || null,
            serviceweight_kg: details.serviceweight_kg || null,
            tire_size_front: details.tire_size_front || '',
            tire_size_back: details.tire_size_back || '',
            central_greasing_chassis: details.central_greasing_chassis || false,
            central_greasing_spreader: details.central_greasing_spreader || false,
          })
          .select();
          if (detailsError) {
            console.error('Error copying reachstacker details:', detailsError);
            throw new Error('Failed to copy reachstacker details');
          }
          console.log('Reachstacker details copied successfully');
          }
        }

        if (dossier.equipment_type === 'terminal_tractor' && dossier.terminal_tractor_details) {
          const details = Array.isArray(dossier.terminal_tractor_details)
            ? dossier.terminal_tractor_details[0]
            : dossier.terminal_tractor_details;

          if (details) {
            const { error: detailsError } = await supabase.from('terminal_tractor_details')
            .insert({
            dossier_id: newDossier.id,
            order_no: details.order_no || '',
            date: details.date || null,
            brand: details.brand || '',
            type: details.type || '',
            power: details.power || '',
            capacity_1st_row: details.capacity_1st_row || null,
            capacity_2nd_row: details.capacity_2nd_row || null,
            capacity_3rd_row: details.capacity_3rd_row || null,
            year_of_manufacture: details.year_of_manufacture || null,
            hours_on_clock: details.hours_on_clock || null,
            serial_no: details.serial_no || '',
            mast: details.mast || '',
            free_lift: details.free_lift || '',
            lift_height_mm: details.lift_height_mm || null,
            remark: details.remark || '',
            engine_brand: details.engine_brand || '',
            engine_type: details.engine_type || '',
            engine_remark: details.engine_remark || '',
            front_axle_brand: details.front_axle_brand || '',
            front_axle_type: details.front_axle_type || '',
            front_axle_remark: details.front_axle_remark || '',
            rear_axle_remark: details.rear_axle_remark || '',
            trans_brand: details.trans_brand || '',
            trans_type: details.trans_type || '',
            trans_remark: details.trans_remark || '',
            adblue: details.adblue || false,
            hydraulic_lines: details.hydraulic_lines || null,
            attachment: details.attachment || 'No attachment',
            attachment_other: details.attachment_other || '',
            fork_length_mm: details.fork_length_mm || null,
            fork_width_mm: details.fork_width_mm || null,
            fork_height_mm: details.fork_height_mm || null,
            no_forks: details.no_forks || false,
            cabin_type: details.cabin_type || '',
            heater: details.heater || false,
            airco: details.airco || false,
            radio: details.radio || false,
            seat_brand: details.seat_brand || '',
            seat_type_suspension: details.seat_type_suspension || '',
            headrest: details.headrest || '',
            seat_options: details.seat_options || '',
            length_total_mm: details.length_total_mm || null,
            width_total_mm: details.width_total_mm || null,
            drive_through_height_mm: details.drive_through_height_mm || null,
            serviceweight_kg: details.serviceweight_kg || null,
            tire_size_front: details.tire_size_front || '',
            tire_size_back: details.tire_size_back || '',
            central_greasing_chassis: details.central_greasing_chassis || false,
            fifth_wheel_height_mm: details.fifth_wheel_height_mm || null,
          })
          .select();
          if (detailsError) {
            console.error('Error copying terminal tractor details:', detailsError);
            throw new Error('Failed to copy terminal tractor details');
          }
          console.log('Terminal tractor details copied successfully');
          }
        }
      }

      onSuccess(newDossier.id);
      onClose();
    } catch (err) {
      console.error('Error copying dossier:', err);
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getEquipmentTypeLabel = (type: string) => {
    return t(`equipmentTypes.${type}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Dossier kopiëren
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {getEquipmentTypeLabel(formData.equipment_type)} - Origineel: {dossier.dossier_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            <p className="text-sm">
              Alle gegevens worden gekopieerd. Geef eventueel een nieuwe titel op en maak het dossier aan —
              de overige velden pas je daarna in het dossier zelf aan. Het serienummer wordt automatisch gegenereerd.
            </p>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
              {t('dossiers.titleField')} *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('dossiers.titlePlaceholder')}
            />
          </div>

          {/* Overige velden zijn verborgen tijdens kopiëren — alle gegevens worden
              wel meegekopieerd en zijn na aanmaken in het dossier zelf aan te passen. */}
          {false && (
          <>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
              {t('dossiers.description')}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('dossiers.descriptionPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-slate-700 mb-2">
                {t('dossiers.condition')}
              </label>
              <select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="excellent">{t('dossiers.conditionExcellent')}</option>
                <option value="good">{t('dossiers.conditionGood')}</option>
                <option value="fair">{t('dossiers.conditionFair')}</option>
                <option value="poor">{t('dossiers.conditionPoor')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-2">
                {t('dossiers.location')}
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('dossiers.locationPlaceholder')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Klantnaam
            </label>
            <CustomerSelector
              value={customerName}
              customerId={customerId}
              onChange={(id, name) => {
                setCustomerId(id);
                setCustomerName(name);
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="purchase_price" className="block text-sm font-medium text-slate-700 mb-2">
                Inkoopprijs (€)
              </label>
              <input
                type="number"
                id="purchase_price"
                name="purchase_price"
                value={formData.purchase_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="estimated_value" className="block text-sm font-medium text-slate-700 mb-2">
                {t('dossiers.estimatedValue')}
              </label>
              <input
                type="number"
                id="estimated_value"
                name="estimated_value"
                value={formData.estimated_value}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('dossiers.estimatedValuePlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="merk" className="block text-sm font-medium text-slate-700 mb-2">
                Merk
              </label>
              <input
                type="text"
                id="merk"
                name="merk"
                value={formData.merk}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Merk"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-2">
                Type
              </label>
              <input
                type="text"
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bouwjaar" className="block text-sm font-medium text-slate-700 mb-2">
                Bouwjaar
              </label>
              <input
                type="number"
                id="bouwjaar"
                name="bouwjaar"
                value={formData.bouwjaar}
                onChange={handleChange}
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Bouwjaar"
              />
            </div>

            <div>
              <label htmlFor="serienummer" className="block text-sm font-medium text-slate-700 mb-2">
                Serienummer
              </label>
              <input
                type="text"
                id="serienummer"
                name="serienummer"
                value={formData.serienummer}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Serienummer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="uren" className="block text-sm font-medium text-slate-700 mb-2">
                Urenstand
              </label>
              <input
                type="number"
                id="uren"
                name="uren"
                value={formData.uren}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Urenstand"
              />
            </div>

            <div>
              <label htmlFor="brandstof" className="block text-sm font-medium text-slate-700 mb-2">
                Brandstof/Aandrijving
              </label>
              <input
                type="text"
                id="brandstof"
                name="brandstof"
                value={formData.brandstof}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brandstof"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="capaciteit" className="block text-sm font-medium text-slate-700 mb-2">
                Capaciteit (ton)
              </label>
              <input
                type="number"
                id="capaciteit"
                name="capaciteit"
                value={formData.capaciteit}
                onChange={handleChange}
                min="0"
                step="0.1"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Capaciteit"
              />
            </div>

            <div>
              <label htmlFor="lastzwaartepunt" className="block text-sm font-medium text-slate-700 mb-2">
                Lastzwaartepunt (mm)
              </label>
              <input
                type="number"
                id="lastzwaartepunt"
                name="lastzwaartepunt"
                value={formData.lastzwaartepunt}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Lastzwaartepunt"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="hefhoogte" className="block text-sm font-medium text-slate-700 mb-2">
                Hefhoogte (mm)
              </label>
              <input
                type="number"
                id="hefhoogte"
                name="hefhoogte"
                value={formData.hefhoogte}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Hefhoogte"
              />
            </div>

            <div>
              <label htmlFor="vrije_hef" className="block text-sm font-medium text-slate-700 mb-2">
                Vrije hef (mm)
              </label>
              <input
                type="number"
                id="vrije_hef"
                name="vrije_hef"
                value={formData.vrije_hef}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Vrije hef"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="masttype" className="block text-sm font-medium text-slate-700 mb-2">
                Masttype
              </label>
              <input
                type="text"
                id="masttype"
                name="masttype"
                value={formData.masttype}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Masttype"
              />
            </div>

            <div>
              <label htmlFor="aanbouwdeel" className="block text-sm font-medium text-slate-700 mb-2">
                Aanbouwdeel
              </label>
              <input
                type="text"
                id="aanbouwdeel"
                name="aanbouwdeel"
                value={formData.aanbouwdeel}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Aanbouwdeel"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="land" className="block text-sm font-medium text-slate-700 mb-2">
                Land
              </label>
              <input
                type="text"
                id="land"
                name="land"
                value={formData.land}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Land"
              />
            </div>

            <div>
              <label htmlFor="locatie" className="block text-sm font-medium text-slate-700 mb-2">
                Locatie
              </label>
              <input
                type="text"
                id="locatie"
                name="locatie"
                value={formData.locatie}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Locatie"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="handelsprijs" className="block text-sm font-medium text-slate-700 mb-2">
                Handelsprijs (€)
              </label>
              <input
                type="number"
                id="handelsprijs"
                name="handelsprijs"
                value={formData.handelsprijs}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Handelsprijs"
              />
            </div>

            <div>
              <label htmlFor="eindklantprijs" className="block text-sm font-medium text-slate-700 mb-2">
                Eindklantprijs (€)
              </label>
              <input
                type="number"
                id="eindklantprijs"
                name="eindklantprijs"
                value={formData.eindklantprijs}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Eindklantprijs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="block text-sm font-medium text-slate-700 mb-2">
                GPS Breedtegraad
              </label>
              <input
                type="number"
                id="latitude"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                step="any"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="51.5074"
              />
            </div>

            <div>
              <label htmlFor="longitude" className="block text-sm font-medium text-slate-700 mb-2">
                GPS Lengtegraad
              </label>
              <input
                type="number"
                id="longitude"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                step="any"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="4.3061"
              />
            </div>
          </div>
          </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              disabled={loading}
            >
              <Copy className="w-4 h-4" />
              {loading ? 'Kopiëren...' : 'Dossier kopiëren'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
