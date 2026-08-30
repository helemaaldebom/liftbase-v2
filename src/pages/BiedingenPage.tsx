import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Search, Filter, TrendingUp, Building2, FileText, Euro } from 'lucide-react';
import { DossierNavbar } from '../components/DossierNavbar';

interface Bid {
  id: string;
  bedrag: number | null;
  amount: number | null;
  valuta: string;
  voorwaarden: string | null;
  notes: string | null;
  status: string;
  interesse: boolean;
  created_at: string;
  dossier_id: string;
  dealer_id: string;
  dossiers?: {
    dossier_number: string;
    title: string;
    equipment_type: string;
    status: string;
  };
  dealers?: {
    name: string;
  };
}

interface BiedingenPageProps {
  onNavigate: (page: string, id?: string) => void;
}

export function BiedingenPage({ onNavigate }: BiedingenPageProps) {
  const { profile } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadBids();
  }, []);

  const loadBids = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          dossiers (
            dossier_number,
            title,
            equipment_type,
            status
          ),
          dealers (
            name
          )
        `)
        .not('dossier_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBids(data || []);
    } catch (error) {
      console.error('Error loading bids:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'In afwachting',
      submitted: 'Ingediend',
      accepted: 'Geaccepteerd',
      rejected: 'Afgewezen',
      withdrawn: 'Ingetrokken',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      submitted: 'bg-blue-100 text-blue-700',
      accepted: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      withdrawn: 'bg-slate-100 text-slate-600',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const filteredBids = bids.filter((bid) => {
    const matchesSearch = !searchTerm ||
      bid.dossiers?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.dossiers?.dossier_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.dealers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bid.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <DossierNavbar onNavigate={onNavigate} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Biedingen</h1>
              <p className="text-slate-600 mt-1">Overzicht van alle biedingen</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Zoek op dossier of dealer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="text-slate-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle statussen</option>
                <option value="pending">In afwachting</option>
                <option value="submitted">Ingediend</option>
                <option value="accepted">Geaccepteerd</option>
                <option value="rejected">Afgewezen</option>
                <option value="withdrawn">Ingetrokken</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-600 mt-2">Laden...</p>
          </div>
        ) : filteredBids.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">
              {searchTerm || statusFilter !== 'all'
                ? 'Geen biedingen gevonden met deze filters'
                : 'Nog geen biedingen geplaatst'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredBids.map((bid) => (
              <div
                key={bid.id}
                onClick={() => onNavigate('dossier-detail', bid.dossier_id)}
                className="bg-white rounded-lg border border-slate-200 hover:shadow-md transition cursor-pointer"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <FileText className="w-5 h-5 text-slate-500" />
                        <h3 className="text-lg font-semibold text-slate-800">
                          {bid.dossiers?.title || 'Onbekend dossier'}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            bid.status
                          )}`}
                        >
                          {getStatusLabel(bid.status)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {bid.dossiers?.dossier_number}
                      </p>
                    </div>

                    <div className="text-right">
                      {(bid.bedrag !== null || bid.amount !== null) ? (
                        <>
                          <div className="flex items-center space-x-1 text-slate-600">
                            <Euro className="w-5 h-5" />
                            <span className="text-2xl font-bold">
                              {(bid.amount || bid.bedrag || 0).toLocaleString('nl-NL')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{bid.valuta}</p>
                        </>
                      ) : (
                        <div className="text-slate-500 text-sm">
                          Geen bod
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-sm text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4" />
                      <span>{bid.dealers?.name || 'Onbekende dealer'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Geplaatst op:</span>{' '}
                      {new Date(bid.created_at).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    {bid.interesse && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                        Interesse
                      </span>
                    )}
                  </div>

                  {(bid.voorwaarden || bid.notes) && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Opmerkingen:</span> {bid.notes || bid.voorwaarden}
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
