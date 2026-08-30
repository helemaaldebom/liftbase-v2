import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

interface NewBidModalProps {
  dossierId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Dealer {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

export function NewBidModal({ dossierId, onClose, onSuccess }: NewBidModalProps) {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [formData, setFormData] = useState({
    dealer_id: '',
    bedrag: '',
    valuta: 'EUR',
    voorwaarden: '',
    interesse: false,
  });
  const [loading, setLoading] = useState(false);
  const [loadingDealers, setLoadingDealers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);

  useEffect(() => {
    loadDealers();
  }, []);

  const loadDealers = async () => {
    try {
      setLoadingDealers(true);
      const { data, error } = await supabase
        .from('dealers')
        .select('id, name, email, active')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setDealers(data || []);
    } catch (error) {
      console.error('Error loading dealers:', error);
      setError('Kon dealers niet laden');
    } finally {
      setLoadingDealers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.dealer_id) {
      setError('Selecteer een dealer');
      return;
    }

    if (formData.bedrag && parseFloat(formData.bedrag) <= 0) {
      setError('Voer een geldig bedrag in');
      return;
    }

    try {
      setLoading(true);

      const bidAmount = formData.bedrag ? parseFloat(formData.bedrag) : null;

      const bidInsertData = {
        dossier_id: dossierId,
        dealer_id: formData.dealer_id,
        bedrag: bidAmount,
        valuta: formData.valuta,
        voorwaarden: formData.voorwaarden || null,
        interesse: formData.interesse,
        status: 'Ingediend',
      };

      console.log('Inserting bid with data:', bidInsertData);

      const { data: bidData, error: insertError } = await supabase
        .from('bids')
        .insert([bidInsertData])
        .select();

      console.log('Insert result:', { bidData, insertError });

      if (insertError) {
        console.error('Insert error details:', insertError);
        throw insertError;
      }

      if (bidData && bidData.length > 0) {
        const newBidId = bidData[0].id;
        const bidSubmissionUrl = `${window.location.origin}/submit-bid/${newBidId}`;

        const selectedDealer = dealers.find(d => d.id === formData.dealer_id);
        if (selectedDealer) {
          const { data: dossierData } = await supabase
            .from('dossiers')
            .select('title')
            .eq('id', dossierId)
            .maybeSingle();

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const emailPayload = {
            dealerEmail: selectedDealer.email,
            dealerName: selectedDealer.name,
            dossierTitle: dossierData?.title || 'Dossier',
            dossierId: dossierId,
            bidId: newBidId,
          };

          console.log('Sending email invitation with payload:', emailPayload);

          try {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-bid-invitation`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify(emailPayload),
            });

            console.log('Email response status:', emailResponse.status);

            if (!emailResponse.ok) {
              const errorText = await emailResponse.text();
              console.error('Email service error response:', errorText);
              setInvitationLink(bidSubmissionUrl);
              return;
            }

            const emailResult = await emailResponse.json();
            console.log('Email sent successfully:', emailResult);
          } catch (emailError) {
            console.error('Email service error:', emailError);
            setInvitationLink(bidSubmissionUrl);
            return;
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving bid:', err);
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
            Nieuwe bieding toevoegen
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

          {invitationLink && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Email kon niet worden verzonden. Deel deze link handmatig met de dealer:
              </p>
              <div className="bg-white p-3 rounded border border-blue-200 mb-3">
                <code className="text-sm text-blue-700 break-all">{invitationLink}</code>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(invitationLink);
                  alert('Link gekopieerd!');
                }}
                className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Kopieer Link
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Dealer *
              </label>
              {loadingDealers ? (
                <div className="text-sm text-slate-500">Dealers laden...</div>
              ) : dealers.length === 0 ? (
                <div className="text-sm text-slate-500">Geen actieve dealers beschikbaar</div>
              ) : (
                <select
                  value={formData.dealer_id}
                  onChange={(e) => setFormData({ ...formData, dealer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecteer een dealer...</option>
                  {dealers.map((dealer) => (
                    <option key={dealer.id} value={dealer.id}>
                      {dealer.name} ({dealer.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Bedrag (optioneel)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.bedrag}
                  onChange={(e) => setFormData({ ...formData, bedrag: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Laat leeg als dealer zelf bedrag invult"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valuta
                </label>
                <select
                  value={formData.valuta}
                  onChange={(e) => setFormData({ ...formData, valuta: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Voorwaarden
              </label>
              <textarea
                value={formData.voorwaarden}
                onChange={(e) => setFormData({ ...formData, voorwaarden: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Eventuele voorwaarden of opmerkingen..."
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.interesse}
                  onChange={(e) => setFormData({ ...formData, interesse: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Markeer als interessant</span>
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
              disabled={loading || loadingDealers || dealers.length === 0}
            >
              {loading ? 'Opslaan...' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
