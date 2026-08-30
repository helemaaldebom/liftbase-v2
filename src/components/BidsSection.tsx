import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Building2, Euro, Calendar, Plus, Check, X as XIcon, Pencil } from 'lucide-react';
import { NewBidModal } from './NewBidModal';

interface BidsSectionProps {
  dossierId: string;
  bidId?: string | null;
  canManageBids: boolean;
}

interface Bid {
  id: string;
  amount?: number;
  bedrag?: number;
  sales_price?: number;
  valuta: string;
  notes?: string;
  voorwaarden?: string | null;
  status: string;
  interesse: boolean;
  created_at: string;
  dealer_id: string;
  dealers?: {
    name: string;
    email: string;
  };
}

export function BidsSection({ dossierId, bidId, canManageBids }: BidsSectionProps) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBidModal, setShowNewBidModal] = useState(false);
  const [editingSalesPrice, setEditingSalesPrice] = useState<string | null>(null);
  const [salesPriceValue, setSalesPriceValue] = useState<string>('');
  const [dealerBid, setDealerBid] = useState<Bid | null>(null);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidNotes, setBidNotes] = useState<string>('');
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);

  useEffect(() => {
    loadBids();
    if (bidId) {
      loadDealerBid();
    }
  }, [dossierId, bidId]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (showStatusDropdown) {
        setShowStatusDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showStatusDropdown]);

  const loadDealerBid = async () => {
    if (!bidId) return;
    try {
      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          dealers!inner (
            name,
            email
          )
        `)
        .eq('id', bidId)
        .maybeSingle();

      if (error) throw error;
      setDealerBid(data);
      if (data?.bedrag || data?.amount) {
        setBidAmount(String(data.bedrag || data.amount || ''));
      }
      if (data?.voorwaarden || data?.notes) {
        setBidNotes(data.voorwaarden || data.notes || '');
      }
    } catch (error) {
      console.error('Error loading dealer bid:', error);
    }
  };

  const loadBids = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          dealers!inner (
            name,
            email
          )
        `)
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Loaded bids:', data);
      setBids(data || []);
    } catch (error) {
      console.error('Error loading bids:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bidId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bids')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bidId);

      if (error) {
        console.error('Error updating bid status:', error);
        alert(`Er is een fout opgetreden bij het bijwerken: ${error.message}`);
        throw error;
      }
      await loadBids();
    } catch (error: any) {
      console.error('Error updating bid status:', error);
      if (!error.message?.includes('Er is een fout')) {
        alert(`Er is een fout opgetreden bij het bijwerken: ${error.message || 'Onbekende fout'}`);
      }
    }
  };

  const handleSalesPriceUpdate = async (bidId: string) => {
    try {
      const price = parseFloat(salesPriceValue);
      if (isNaN(price) || price < 0) {
        alert('Voer een geldig bedrag in');
        return;
      }

      const { error } = await supabase
        .from('bids')
        .update({
          sales_price: price,
          updated_at: new Date().toISOString()
        })
        .eq('id', bidId);

      if (error) throw error;
      setEditingSalesPrice(null);
      setSalesPriceValue('');
      loadBids();
    } catch (error) {
      console.error('Error updating sales price:', error);
      alert('Er is een fout opgetreden bij het bijwerken');
    }
  };

  const startEditingSalesPrice = (bidId: string, currentPrice?: number) => {
    setEditingSalesPrice(bidId);
    setSalesPriceValue(currentPrice?.toString() || '');
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'Uitnodiging verstuurd',
      'submitted': 'Ingediend',
      'accepted': 'Geaccepteerd',
      'rejected': 'Geweigerd',
      'Ingediend': 'Ingediend',
      'Geüpdatet': 'Geüpdatet',
      'Geweigerd': 'Geweigerd',
      'Geaccepteerd': 'Geaccepteerd',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-blue-100 text-blue-700',
      'submitted': 'bg-yellow-100 text-yellow-700',
      'accepted': 'bg-green-100 text-green-700',
      'rejected': 'bg-red-100 text-red-700',
      'Ingediend': 'bg-yellow-100 text-yellow-700',
      'Geüpdatet': 'bg-blue-100 text-blue-700',
      'Geweigerd': 'bg-red-100 text-red-700',
      'Geaccepteerd': 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Biedingen</h3>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const handleDealerBidSubmit = async () => {
    if (!bidId || !dealerBid) return;

    try {
      setSubmittingBid(true);
      const { error } = await supabase
        .from('bids')
        .update({
          bedrag: bidAmount ? parseFloat(bidAmount) : null,
          voorwaarden: bidNotes,
          status: 'submitted',
          updated_at: new Date().toISOString()
        })
        .eq('id', bidId);

      if (error) throw error;
      alert('Uw bieding is succesvol ingediend!');
      loadDealerBid();
    } catch (error) {
      console.error('Error submitting bid:', error);
      alert('Er is een fout opgetreden bij het indienen van uw bieding.');
    } finally {
      setSubmittingBid(false);
    }
  };

  if (bidId && dealerBid) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-800">
              Bieding indienen
            </h3>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm text-slate-600 mb-4">
              Welkom <strong>{dealerBid.dealers?.name}</strong>. U bent uitgenodigd om een bieding te plaatsen voor dit dossier.
            </p>
            {dealerBid.status === 'submitted' || dealerBid.status === 'Ingediend' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">Uw bieding is ingediend en wordt beoordeeld.</p>
                {(dealerBid.bedrag || dealerBid.amount) && (
                  <p className="text-green-700 mt-2">
                    Bedrag: € {(dealerBid.bedrag || dealerBid.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            ) : dealerBid.status === 'accepted' || dealerBid.status === 'Geaccepteerd' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">Gefeliciteerd! Uw bieding is geaccepteerd.</p>
              </div>
            ) : dealerBid.status === 'rejected' || dealerBid.status === 'Afgewezen' ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Helaas, uw bieding is niet geaccepteerd.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Biedbedrag (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Opmerkingen / Voorwaarden (optioneel)
                  </label>
                  <textarea
                    value={bidNotes}
                    onChange={(e) => setBidNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Voeg hier eventuele opmerkingen of voorwaarden toe..."
                  />
                </div>

                <button
                  onClick={handleDealerBidSubmit}
                  disabled={submittingBid || !bidAmount}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingBid ? 'Bezig met indienen...' : 'Bieding indienen'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-slate-500" />
              <h3 className="text-lg font-semibold text-slate-800">
                Biedingen ({bids.length})
              </h3>
            </div>
            {canManageBids && (
              <button
                onClick={() => setShowNewBidModal(true)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Bieding toevoegen</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {bids.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Nog geen biedingen geplaatst</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bids.map((bid) => (
                <div
                  key={bid.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Building2 className="w-5 h-5 text-slate-500" />
                        <h4 className="font-semibold text-slate-800">
                          {bid.dealers?.name || 'Onbekende dealer'}
                        </h4>
                        {canManageBids ? (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowStatusDropdown(showStatusDropdown === bid.id ? null : bid.id);
                              }}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                bid.status
                              )} hover:opacity-80 transition-opacity cursor-pointer`}
                            >
                              {getStatusLabel(bid.status)} ▼
                            </button>
                            {showStatusDropdown === bid.id && (
                              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                                <button
                                  onClick={() => {
                                    handleStatusUpdate(bid.id, 'pending');
                                    setShowStatusDropdown(null);
                                  }}
                                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors first:rounded-t-lg ${
                                    bid.status === 'pending' ? 'bg-slate-100 font-medium' : ''
                                  }`}
                                >
                                  Uitnodiging verstuurd
                                </button>
                                <button
                                  onClick={() => {
                                    handleStatusUpdate(bid.id, 'submitted');
                                    setShowStatusDropdown(null);
                                  }}
                                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors ${
                                    bid.status === 'submitted' || bid.status === 'Ingediend' ? 'bg-slate-100 font-medium' : ''
                                  }`}
                                >
                                  Ingediend
                                </button>
                                <button
                                  onClick={() => {
                                    handleStatusUpdate(bid.id, 'accepted');
                                    setShowStatusDropdown(null);
                                  }}
                                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors ${
                                    bid.status === 'accepted' || bid.status === 'Geaccepteerd' ? 'bg-slate-100 font-medium' : ''
                                  }`}
                                >
                                  Geaccepteerd
                                </button>
                                <button
                                  onClick={() => {
                                    handleStatusUpdate(bid.id, 'rejected');
                                    setShowStatusDropdown(null);
                                  }}
                                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors last:rounded-b-lg ${
                                    bid.status === 'rejected' || bid.status === 'Afgewezen' ? 'bg-slate-100 font-medium' : ''
                                  }`}
                                >
                                  Afgewezen
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              bid.status
                            )}`}
                          >
                            {getStatusLabel(bid.status)}
                          </span>
                        )}
                        {bid.interesse && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                            Interessant
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{bid.dealers?.email}</p>
                    </div>

                    <div className="text-right">
                      {(bid.bedrag !== null && bid.bedrag !== undefined) ? (
                        <>
                          <div className="flex items-center space-x-1 text-slate-600">
                            <Euro className="w-5 h-5" />
                            <span className="text-xl font-bold">
                              {bid.bedrag.toLocaleString('nl-NL', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{bid.valuta}</p>
                        </>
                      ) : (
                        <span className="text-sm text-slate-500 italic">Nog niet ingevuld</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center text-sm text-slate-600 mb-3">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>
                      {new Date(bid.created_at).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {(bid.voorwaarden || bid.notes) && (
                    <div className="mb-3 p-3 bg-slate-50 rounded-md">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Opmerkingen:</span> {bid.notes || bid.voorwaarden}
                      </p>
                    </div>
                  )}

                  {canManageBids && (bid.status === 'accepted' || bid.status === 'Geaccepteerd') && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Verkoopprijs naar handel:</span>
                        {editingSalesPrice === bid.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              step="0.01"
                              value={salesPriceValue}
                              onChange={(e) => setSalesPriceValue(e.target.value)}
                              className="w-32 px-2 py-1 border border-slate-300 rounded text-sm"
                              placeholder="0.00"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSalesPriceUpdate(bid.id)}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingSalesPrice(null);
                                setSalesPriceValue('');
                              }}
                              className="px-2 py-1 bg-slate-600 text-white rounded text-xs hover:bg-slate-700"
                            >
                              <XIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            {bid.sales_price ? (
                              <span className="text-lg font-bold text-slate-800">
                                € {bid.sales_price.toLocaleString('nl-NL', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-500 italic">Niet ingevuld</span>
                            )}
                            <button
                              onClick={() => startEditingSalesPrice(bid.id, bid.sales_price)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                              title="Bewerk verkoopprijs"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {canManageBids && (bid.status === 'submitted' || bid.status === 'Ingediend') && (
                    <div className="flex space-x-2 pt-3 border-t border-slate-200">
                      <button
                        onClick={() => handleStatusUpdate(bid.id, 'accepted')}
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition text-sm font-medium"
                      >
                        <Check className="w-4 h-4" />
                        <span>Accepteren</span>
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(bid.id, 'rejected')}
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition text-sm font-medium"
                      >
                        <XIcon className="w-4 h-4" />
                        <span>Afwijzen</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showNewBidModal && (
        <NewBidModal
          dossierId={dossierId}
          onClose={() => setShowNewBidModal(false)}
          onSuccess={loadBids}
        />
      )}
    </>
  );
}
