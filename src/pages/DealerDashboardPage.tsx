import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Calendar, TrendingUp, LogOut } from 'lucide-react';

interface DossierBid {
  id: string;
  status: string;
  bedrag?: number;
  valuta: string;
  created_at: string;
  dossier: {
    id: string;
    dossier_number: string;
    title: string;
    merk?: string;
    type?: string;
    bouwjaar?: number;
    equipment_type?: string;
  };
}

export function DealerDashboardPage() {
  const [bids, setBids] = useState<DossierBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [dealerName, setDealerName] = useState<string>('');

  useEffect(() => {
    loadDealerBids();
  }, []);

  const loadDealerBids = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/';
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('dealer_id, dealers(name)')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.dealer_id) {
        alert('U heeft geen toegang tot deze pagina.');
        window.location.href = '/';
        return;
      }

      setDealerName(profile.dealers?.name || '');

      const { data, error } = await supabase
        .from('bids')
        .select(`
          id,
          status,
          bedrag,
          valuta,
          created_at,
          dossiers!inner (
            id,
            dossier_number,
            title,
            merk,
            type,
            bouwjaar,
            equipment_type
          )
        `)
        .eq('dealer_id', profile.dealer_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedBids = (data || []).map((bid: any) => ({
        ...bid,
        dossier: bid.dossiers,
      }));

      setBids(formattedBids);
    } catch (error) {
      console.error('Error loading dealer bids:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'Ingediend': 'Ingediend',
      'Geüpdatet': 'Geüpdatet',
      'Geweigerd': 'Geweigerd',
      'Geaccepteerd': 'Geaccepteerd',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Ingediend': 'bg-yellow-100 text-yellow-700',
      'Geüpdatet': 'bg-blue-100 text-blue-700',
      'Geweigerd': 'bg-red-100 text-red-700',
      'Geaccepteerd': 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Dealer Portal</h1>
                <p className="text-sm text-slate-600">{dealerName}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Uitloggen</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Uw Biedingen</h2>
          <p className="text-slate-600">
            Overzicht van alle uitnodigingen en biedingen
          </p>
        </div>

        {bids.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Geen uitnodigingen
            </h3>
            <p className="text-slate-600">
              U heeft momenteel geen openstaande uitnodigingen voor biedingen.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {bids.map((bid) => (
              <div
                key={bid.id}
                onClick={() => window.location.href = `/dealer/dossier/${bid.dossier.id}`}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Package className="w-5 h-5 text-slate-500" />
                      <h3 className="text-lg font-semibold text-slate-800">
                        {bid.dossier.title}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          bid.status
                        )}`}
                      >
                        {getStatusLabel(bid.status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      Dossier #{bid.dossier.dossier_number}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {bid.dossier.merk && (
                    <div>
                      <p className="text-xs text-slate-500">Merk</p>
                      <p className="font-medium text-slate-800">{bid.dossier.merk}</p>
                    </div>
                  )}
                  {bid.dossier.type && (
                    <div>
                      <p className="text-xs text-slate-500">Type</p>
                      <p className="font-medium text-slate-800">{bid.dossier.type}</p>
                    </div>
                  )}
                  {bid.dossier.bouwjaar && (
                    <div>
                      <p className="text-xs text-slate-500">Bouwjaar</p>
                      <p className="font-medium text-slate-800">{bid.dossier.bouwjaar}</p>
                    </div>
                  )}
                  {bid.dossier.equipment_type && (
                    <div>
                      <p className="text-xs text-slate-500">Equipment</p>
                      <p className="font-medium text-slate-800">
                        {bid.dossier.equipment_type}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="flex items-center text-sm text-slate-600">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>
                      {new Date(bid.created_at).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {bid.bedrag && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Uw bieding</p>
                      <p className="font-bold text-slate-800">
                        € {bid.bedrag.toLocaleString('nl-NL', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
