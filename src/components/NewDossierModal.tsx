import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { CustomerSelector } from './CustomerSelector';

interface NewDossierModalProps {
  onClose: () => void;
  onSuccess: (newDossierId?: string) => void;
}

type EquipmentType = 'heavy_duty_forklift' | 'empty_container_handler' | 'reachstacker' | 'terminal_tractor' | 'general_equipment';

export function NewDossierModal({ onClose, onSuccess }: NewDossierModalProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<'select-type' | 'form'>('select-type');
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<EquipmentType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    equipment_type: '',
    brand: '',
    model: '',
    year: '',
    condition: 'good',
    location: '',
    estimated_value: '',
  });
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);

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
        created_by: user.id,
        status: 'open',
      }).select().single();

      if (insertError) throw insertError;

      if (!newDossier?.id) {
        throw new Error('Dossier aangemaakt maar geen ID ontvangen');
      }

      // First trigger the navigation, then close modal to prevent race condition
      onSuccess(newDossier.id);
      onClose();
    } catch (err: any) {
      console.error('Error creating dossier:', err);
      const msg = err?.message || err?.error_description || JSON.stringify(err);
      setError(msg || t('common.error'));
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEquipmentTypeSelect = (type: EquipmentType) => {
    setSelectedEquipmentType(type);
    setFormData({ ...formData, equipment_type: type });
    setStep('form');
  };

  const equipmentTypes = [
    {
      id: 'heavy_duty_forklift' as EquipmentType,
      iconPath: '/icons_2024_tekengebied_1_kopie_6.png',
    },
    {
      id: 'empty_container_handler' as EquipmentType,
      iconPath: '/ICONS_2024_Tekengebied 1 kopie 8.png',
    },
    {
      id: 'reachstacker' as EquipmentType,
      iconPath: '/icons_2024_tekengebied_1_kopie_5.png',
    },
    {
      id: 'terminal_tractor' as EquipmentType,
      iconPath: '/ICONS_2024_Tekengebied 1 kopie 7.png',
    },
    {
      id: 'general_equipment' as EquipmentType,
      iconPath: '/icons_2024_tekengebied_1_kopie_6.png',
    },
  ];

  const getEquipmentTypeLabel = (type: string) => {
    return t(`equipmentTypes.${type}`);
  };

  if (step === 'select-type') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">{t('dossiers.selectEquipmentType')}</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <p className="text-slate-600 mb-6">
              {t('dossiers.selectEquipmentTypeDesc')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipmentTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleEquipmentTypeSelect(type.id)}
                  className="group relative p-8 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div className="p-6 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition flex items-center justify-center">
                    <img
                      src={type.iconPath}
                      alt={type.label}
                      className="w-20 h-20 object-contain"
                    />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800">
                    {t(`equipmentTypes.${type.id}`)}
                  </h3>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all absolute top-4 right-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{t('dossiers.createNewDossier')}</h2>
            <p className="text-sm text-slate-600 mt-1">{getEquipmentTypeLabel(formData.equipment_type)}</p>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-slate-700 mb-2">
                {t('dossiers.brand')}
              </label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('dossiers.brandPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-slate-700 mb-2">
                {t('dossiers.type')}
              </label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('dossiers.modelPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-slate-700 mb-2">
                {t('dossiers.year')}
              </label>
              <input
                type="number"
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('dossiers.yearPlaceholder')}
              />
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

          <div className="flex justify-between space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setStep('select-type')}
              className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              disabled={loading}
            >
              {t('common.back')}
            </button>
            <div className="flex space-x-3">
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? t('dossiers.creating') : t('dossiers.createDossier')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
