import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Search, Building2, Mail, Edit, Trash2, FileText, ChevronDown, ChevronUp, UserPlus } from 'lucide-react';
import { DossierNavbar } from '../components/DossierNavbar';
import { NewDealerModal } from '../components/NewDealerModal';
import { CreateDealerLoginModal } from '../components/CreateDealerLoginModal';

interface Dealer {
  id: string;
  name: string;
  email: string;
  active: boolean;
  opt_in_email: boolean;
  machine_types: string[];
  age_category: string;
  created_at: string;
  auth_user_id: string | null;
}

interface Bid {
  id: string;
  bedrag: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  dossier: {
    id: string;
    title: string;
    equipment_type: string;
  };
}

interface DealersPageProps {
  onNavigate: (page: string, id?: string) => void;
}

export function DealersPage({ onNavigate }: DealersPageProps) {
  const { profile } = useAuth();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewDealerModal, setShowNewDealerModal] = useState(false);
  const [showCreateLoginModal, setShowCreateLoginModal] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);
  const [expandedDealer, setExpandedDealer] = useState<string | null>(null);
  const [dealerBids, setDealerBids] = useState<Record<string, Bid[]>>({});
  const [loadingBids, setLoadingBids] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadDealers();
  }, []);

  const loadDealers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dealers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setDealers(data || []);
    } catch (error) {
      console.error('Error loading dealers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDealers = dealers.filter((dealer) =>
    dealer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dealer.email && dealer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getAgeCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      jong_gebruikt: '0-5 jaar (jong gebruikt)',
      gebruikt: '5-10 jaar (gebruikt)',
      oude_machines: '10+ jaar (oude machines)',
    };
    return labels[category] || category;
  };

  const handleEdit = (dealer: Dealer) => {
    setEditingDealer(dealer);
    setShowNewDealerModal(true);
  };

  const handleDelete = async (dealerId: string) => {
    if (!confirm('Weet je zeker dat je deze dealer wilt verwijderen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('dealers')
        .delete()
        .eq('id', dealerId);

      if (error) throw error;
      loadDealers();
    } catch (error) {
      console.error('Error deleting dealer:', error);
      alert('Er is een fout opgetreden bij het verwijderen');
    }
  };

  const handleCloseModal = () => {
    setShowNewDealerModal(false);
    setEditingDealer(null);
  };

  const loadDealerBids = async (dealerId: string) => {
    if (dealerBids[dealerId]) {
      return;
    }

    try {
      setLoadingBids({ ...loadingBids, [dealerId]: true });
      const { data, error } = await supabase
        .from('bids')
        .select(`
          id,
          bedrag,
          status,
          notes,
          created_at,
          dossier:dossiers!inner(
            id,
            title,
            equipment_type
          )
        `)
        .eq('dealer_id', dealerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDealerBids({ ...dealerBids, [dealerId]: data || [] });
    } catch (error) {
      console.error('Error loading bids:', error);
    } finally {
      setLoadingBids({ ...loadingBids, [dealerId]: false });
    }
  };

  const toggleDealerExpand = (dealerId: string) => {
    if (expandedDealer === dealerId) {
      setExpandedDealer(null);
    } else {
      setExpandedDealer(dealerId);
      loadDealerBids(dealerId);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'In behandeling',
      accepted: 'Geaccepteerd',
      rejected: 'Afgewezen',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  if (!profile) return null;

  const canManageDealers = profile.role === 'manager';

  return (
    <div className="min-h-screen bg-slate-50">
      <DossierNavbar onNavigate={onNavigate} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Dealers</h1>
              <p className="text-slate-600 mt-1">Beheer handelaren die kunnen bieden</p>
            </div>
            {canManageDealers && (
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowNewDealerModal(true)}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Nieuwe dealer</span>
                </button>
                <button
                  onClick={() => setShowCreateLoginModal(true)}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Nieuw Dealerlogin</span>
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Zoek op naam of email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-600 mt-2">Laden...</p>
          </div>
        ) : filteredDealers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">
              {searchTerm
                ? 'Geen dealers gevonden met deze zoekterm'
                : 'Nog geen dealers toegevoegd'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDealers.map((dealer) => (
              <div
                key={dealer.id}
                className="bg-white rounded-lg border border-slate-200 hover:shadow-md transition"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Building2 className="w-5 h-5 text-slate-500" />
                        <h3 className="text-lg font-semibold text-slate-800">{dealer.name}</h3>
                      </div>
                    {dealer.active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Actief
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                        Inactief
                      </span>
                    )}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => toggleDealerExpand(dealer.id)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Bekijk biedingen"
                      >
                        {expandedDealer === dealer.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                      {canManageDealers && (
                        <>
                          <button
                            onClick={() => handleEdit(dealer)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Bewerken"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dealer.id)}
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                  {dealer.email && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{dealer.email}</span>
                    </div>
                  )}

                  {dealer.machine_types && dealer.machine_types.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-slate-500 mb-1">Geïnteresseerd in:</p>
                      <div className="flex flex-wrap gap-1">
                        {dealer.machine_types.map((type) => (
                          <span
                            key={type}
                            className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {dealer.age_category && (
                    <div className="pt-2 text-xs text-slate-500">
                      Leeftijdscategorie: <span className="font-medium">{getAgeCategoryLabel(dealer.age_category)}</span>
                    </div>
                  )}
                  </div>
                </div>

                {expandedDealer === dealer.id && (
                  <div className="border-t border-slate-200 p-6 bg-slate-50">
                    <div className="flex items-center space-x-2 mb-4">
                      <FileText className="w-5 h-5 text-slate-600" />
                      <h4 className="font-semibold text-slate-800">Biedingen</h4>
                    </div>
                    {loadingBids[dealer.id] ? (
                      <div className="text-center py-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    ) : dealerBids[dealer.id]?.length === 0 ? (
                      <p className="text-slate-500 text-sm">Nog geen biedingen gedaan</p>
                    ) : (
                      <div className="space-y-3">
                        {dealerBids[dealer.id]?.map((bid) => (
                          <div
                            key={bid.id}
                            className="bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition cursor-pointer"
                            onClick={() => onNavigate('dossier-detail', bid.dossier.id)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h5 className="font-medium text-slate-800">{bid.dossier.title}</h5>
                                <p className="text-xs text-slate-500">{bid.dossier.equipment_type}</p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(bid.status)}`}>
                                {getStatusLabel(bid.status)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600">Bedrag:</span>
                              <span className="font-semibold text-slate-800">{formatCurrency(bid.bedrag)}</span>
                            </div>
                            {bid.notes && (
                              <p className="text-xs text-slate-600 mt-2 line-clamp-2">{bid.notes}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-2">
                              {new Date(bid.created_at).toLocaleDateString('nl-NL', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showNewDealerModal && (
          <NewDealerModal
            onClose={handleCloseModal}
            onSuccess={loadDealers}
            dealer={editingDealer || undefined}
          />
        )}

        {showCreateLoginModal && (
          <CreateDealerLoginModal
            onClose={() => setShowCreateLoginModal(false)}
            onSuccess={loadDealers}
            dealers={dealers}
          />
        )}
      </div>
    </div>
  );
}
