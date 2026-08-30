import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

interface NewDealerModalProps {
  onClose: () => void;
  onSuccess: () => void;
  dealer?: {
    id: string;
    name: string;
    email: string;
    active: boolean;
    opt_in_email: boolean;
    machine_types: string[];
    age_category: string;
  };
}

export function NewDealerModal({ onClose, onSuccess, dealer }: NewDealerModalProps) {
  const [formData, setFormData] = useState({
    name: dealer?.name || '',
    email: dealer?.email || '',
    active: dealer?.active ?? true,
    opt_in_email: dealer?.opt_in_email ?? true,
    machine_types: dealer?.machine_types || [],
    age_category: dealer?.age_category || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const machineTypeOptions = [
    'Heavy Duty Forklifts',
    'Empty Container Handlers',
    'Reachstackers',
    'Terminal Tractors',
  ];

  const ageCategoryOptions = [
    { value: 'jong_gebruikt', label: '0-5 jaar (jong gebruikt)' },
    { value: 'gebruikt', label: '5-10 jaar (gebruikt)' },
    { value: 'oude_machines', label: '10+ jaar (oude machines)' },
  ];

  const handleMachineTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      machine_types: prev.machine_types.includes(type)
        ? prev.machine_types.filter(t => t !== type)
        : [...prev.machine_types, type],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Naam is verplicht');
      return;
    }

    try {
      setLoading(true);

      if (dealer) {
        const { error: updateError } = await supabase
          .from('dealers')
          .update({
            name: formData.name,
            email: formData.email || null,
            active: formData.active,
            opt_in_email: formData.opt_in_email,
            machine_types: formData.machine_types,
            age_category: formData.age_category || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dealer.id);

        if (updateError) throw updateError;
      } else {
        const { data: newDealer, error: insertError } = await supabase
          .from('dealers')
          .insert([{
            name: formData.name,
            email: formData.email || null,
            active: formData.active,
            opt_in_email: formData.opt_in_email,
            machine_types: formData.machine_types,
            age_category: formData.age_category || null,
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        if (formData.email && formData.email.trim()) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          try {
            const accountResponse = await fetch(`${supabaseUrl}/functions/v1/create-dealer-account`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                dealerId: newDealer.id,
                email: formData.email,
                name: formData.name,
              }),
            });

            if (!accountResponse.ok) {
              console.error('Failed to create dealer account');
            } else {
              const accountData = await accountResponse.json();
              console.log('Dealer account created:', accountData);
            }
          } catch (accountError) {
            console.error('Error creating dealer account:', accountError);
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving dealer:', err);
      setError('Er is een fout opgetreden bij het opslaan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">
            {dealer ? 'Dealer bewerken' : 'Nieuwe dealer toevoegen'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Naam *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email (optioneel)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Alleen nodig voor login account"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Machine types
              </label>
              <div className="space-y-2">
                {machineTypeOptions.map((type) => (
                  <label key={type} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.machine_types.includes(type)}
                      onChange={() => handleMachineTypeToggle(type)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Leeftijdscategorie
              </label>
              <select
                value={formData.age_category}
                onChange={(e) => setFormData({ ...formData, age_category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecteer...</option>
                {ageCategoryOptions.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-6 pt-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Actief</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.opt_in_email}
                  onChange={(e) => setFormData({ ...formData, opt_in_email: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Email opt-in</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition"
              disabled={loading}
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Opslaan...' : dealer ? 'Bijwerken' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
