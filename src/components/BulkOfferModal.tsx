import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Send, Users, FileText } from 'lucide-react';

interface BulkOfferModalProps {
  onClose: () => void;
  selectedDossierIds: string[];
  onSuccess: () => void;
}

interface Dealer {
  id: string;
  name: string;
  email: string;
  active: boolean;
  opt_in_email: boolean;
}

interface Dossier {
  id: string;
  dossier_number: string;
  title: string;
  equipment_type: string;
}

export function BulkOfferModal({ onClose, selectedDossierIds, onSuccess }: BulkOfferModalProps) {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [selectedDealers, setSelectedDealers] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [dealersResponse, dossiersResponse] = await Promise.all([
        supabase
          .from('dealers')
          .select('id, name, email, active, opt_in_email')
          .eq('active', true)
          .order('name'),
        supabase
          .from('dossiers')
          .select('id, dossier_number, title, equipment_type')
          .in('id', selectedDossierIds)
      ]);

      if (dealersResponse.error) throw dealersResponse.error;
      if (dossiersResponse.error) throw dossiersResponse.error;

      setDealers(dealersResponse.data || []);
      setDossiers(dossiersResponse.data || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDealerSelection = (dealerId: string) => {
    const newSelection = new Set(selectedDealers);
    if (newSelection.has(dealerId)) {
      newSelection.delete(dealerId);
    } else {
      newSelection.add(dealerId);
    }
    setSelectedDealers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedDealers.size === dealers.length) {
      setSelectedDealers(new Set());
    } else {
      setSelectedDealers(new Set(dealers.map(d => d.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedDealers.size === 0) {
      setError('Selecteer minimaal één dealer');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Niet ingelogd');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-offer-to-dealers`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dossierIds: selectedDossierIds,
            dealerIds: Array.from(selectedDealers),
            message: message.trim() || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send offers');
      }

      alert(`Succesvol aangeboden!\n\n${result.bidsCreated} uitnodigingen verzonden\n${result.emailsSent} emails verstuurd`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error sending bulk offer:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">Dossiers aanbieden aan dealers</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-slate-600">Laden...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">
                      Geselecteerde dossiers ({dossiers.length})
                    </h3>
                    <div className="text-sm text-blue-700 space-y-1">
                      {dossiers.map((dossier) => (
                        <div key={dossier.id}>
                          {dossier.dossier_number} - {dossier.title}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bericht (optioneel)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Voeg een persoonlijk bericht toe aan de uitnodiging..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Selecteer dealers ({selectedDealers.size} van {dealers.length})
                  </label>
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {selectedDealers.size === dealers.length ? 'Deselecteer alles' : 'Selecteer alles'}
                  </button>
                </div>

                {dealers.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg">
                    <Users className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-600">Geen actieve dealers gevonden</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-96 overflow-y-auto">
                    {dealers.map((dealer) => (
                      <label
                        key={dealer.id}
                        className="flex items-center space-x-3 p-4 hover:bg-slate-50 cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDealers.has(dealer.id)}
                          onChange={() => toggleDealerSelection(dealer.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-slate-800">{dealer.name}</div>
                          <div className="text-sm text-slate-500">{dealer.email}</div>
                        </div>
                        {dealer.opt_in_email && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Email opt-in
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 p-6 bg-slate-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
            >
              Annuleren
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedDealers.size === 0 || loading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Versturen...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Aanbieden aan {selectedDealers.size} dealer{selectedDealers.size !== 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
