import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DossierNavbar } from '../components/DossierNavbar';
import { useAuth } from '../contexts/AuthContext';
import { Globe, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle, TrendingUp } from 'lucide-react';

interface PublicationDashboardPageProps {
  onNavigate: (page: string, id?: string) => void;
}

interface PublicationWithDossier {
  id: string;
  dossier_id: string;
  platform: string;
  status: string;
  published_at: string | null;
  last_synced_at: string | null;
  sync_error_message: string | null;
  sync_retry_count: number;
  dossier?: {
    dossier_number: string;
    brand: string;
    model: string;
    title: string;
    created_at: string;
    dossier_datum: string | null;
  };
}

interface SyncLog {
  id: string;
  sync_started_at: string;
  sync_completed_at: string | null;
  total_dossiers: number;
  successful_syncs: number;
  failed_syncs: number;
  error_summary: any;
  triggered_by: string;
}

export function PublicationDashboardPage({ onNavigate }: PublicationDashboardPageProps) {
  const { profile } = useAuth();
  const [publications, setPublications] = useState<PublicationWithDossier[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  useEffect(() => {
    if (profile?.role === 'manager') {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    try {
      const [pubsResult, logsResult] = await Promise.all([
        supabase
          .from('advertisement_publications')
          .select('*')
          .order('last_synced_at', { ascending: false }),
        supabase
          .from('platform_sync_logs')
          .select('*')
          .order('sync_started_at', { ascending: false })
          .limit(10)
      ]);

      if (pubsResult.data) {
        const dossierIds = [...new Set(pubsResult.data.map(p => p.dossier_id))];
        const { data: dossiers } = await supabase
          .from('dossiers')
          .select('id, dossier_number, brand, model, title, created_at, dossier_datum')
          .in('id', dossierIds);

        const dossierMap = new Map(dossiers?.map(d => [d.id, d]) || []);

        const pubsWithDossier = pubsResult.data.map(pub => ({
          ...pub,
          dossier: dossierMap.get(pub.dossier_id)
        }));

        setPublications(pubsWithDossier);
      }

      if (logsResult.data) {
        setSyncLogs(logsResult.data);
      }
    } catch (error) {
      console.error('Error loading publication dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Eén knop die ALLE platforms synchroniseert o.b.v. de vinkjes per dossier.
  // Per platform één aanroep: F.I. krijgt sowieso altijd de complete voorraad
  // in één upload (dus geen "nog bezig met vorige import"-fouten meer zoals
  // bij losse per-machine kliks), de andere platforms krijgen alle
  // aangevinkte machines in één batch.
  const handleManualSync = async () => {
    setSyncing(true);
    const uitkomsten: string[] = [];
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Niet ingelogd');

      const KANALEN: { key: string; label: string; fn: string }[] = [
        { key: 'publish_to_hcl', label: 'Website', fn: 'publish-to-hcl-website' },
        { key: 'publish_to_forklift_international', label: 'Forklift International', fn: 'publish-to-forklift-international' },
        { key: 'publish_to_truck1', label: 'Truck1.eu', fn: 'publish-to-truck1' },
        { key: 'publish_to_mascus', label: 'Mascus', fn: 'publish-to-mascus' },
      ];

      for (const kanaal of KANALEN) {
        const { data: flagged } = await supabase
          .from('dossiers')
          .select('id')
          .eq(kanaal.key, true)
          .eq('is_marktdata', false)
          .not('status', 'in', '(sold,archived)');
        const ids = (flagged ?? []).map((d) => d.id);
        if (!ids.length) {
          uitkomsten.push(`${kanaal.label}: geen machines aangevinkt`);
          continue;
        }
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${kanaal.fn}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ dossierIds: ids }),
            }
          );
          const result = await response.json();
          if (response.ok && result.success !== false) {
            uitkomsten.push(`${kanaal.label}: ✅ ${ids.length} machine(s) gesynchroniseerd`);
          } else {
            uitkomsten.push(`${kanaal.label}: ❌ ${result.error || 'fout bij platform'}`);
          }
        } catch (e: any) {
          uitkomsten.push(`${kanaal.label}: ❌ ${e.message}`);
        }
      }

      alert(`Synchronisatie klaar:\n\n${uitkomsten.join('\n')}\n\nLet op: foto-uploads naar de website lopen op de achtergrond nog even door.`);
      await loadData();
    } catch (error: any) {
      console.error('Error running sync:', error);
      alert('Fout bij synchronisatie: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const calculateStandDays = (dossier: any) => {
    if (!dossier) return 0;

    const startDate = new Date(dossier.dossier_datum || dossier.created_at);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
      case 'updated':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
      case 'updated':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  // Alleen de actuele kanalen tellen mee; records van oude platforms
  // (trucksnl, machineseeker, truckscout24) vervuilen anders de cijfers.
  const ACTIEVE_PLATFORMS = ['hcl', 'forklift_international', 'mascus', 'truck1'];
  const PLATFORM_NAMEN: Record<string, string> = {
    hcl: 'Website',
    forklift_international: 'Forklift International',
    mascus: 'Mascus',
    truck1: 'Truck1.eu',
  };
  const actuelePublications = publications.filter(p => ACTIEVE_PLATFORMS.includes(p.platform));

  const filteredPublications = selectedPlatform === 'all'
    ? actuelePublications
    : actuelePublications.filter(p => p.platform === selectedPlatform);

  const stats = {
    total: actuelePublications.filter(p => p.status !== 'deleted').length,
    published: actuelePublications.filter(p => p.status === 'published' || p.status === 'updated').length,
    failed: actuelePublications.filter(p => p.status === 'failed').length,
    pending: actuelePublications.filter(p => p.status === 'pending').length,
  };

  if (profile?.role !== 'manager') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Alleen managers hebben toegang tot deze pagina</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DossierNavbar onNavigate={onNavigate} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-slate-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DossierNavbar onNavigate={onNavigate} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Globe className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-800">Publicatie Dashboard</h1>
          </div>
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Synchroniseren...' : 'Nu synchroniseren'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Totaal Gepubliceerd</p>
                <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
              </div>
              <Globe className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Actief</p>
                <p className="text-3xl font-bold text-green-600">{stats.published}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Mislukt</p>
                <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="w-12 h-12 text-red-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">In Behandeling</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-600 opacity-20" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">Publicaties</h2>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle platforms</option>
                <option value="hcl">Website</option>
                <option value="forklift_international">Forklift International</option>
                <option value="truck1">Truck1.eu</option>
                <option value="mascus">Mascus</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Dossier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Standagen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Laatst gesynchroniseerd
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Pogingen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredPublications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      Geen publicaties gevonden
                    </td>
                  </tr>
                ) : (
                  filteredPublications.map((pub) => {
                    const standDays = calculateStandDays(pub.dossier);
                    return (
                      <tr
                        key={pub.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => onNavigate('dossier-detail', pub.dossier_id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">
                              {pub.dossier?.dossier_number || 'Onbekend'}
                            </span>
                            <span className="text-sm text-slate-500">
                              {pub.dossier?.brand} {pub.dossier?.model}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-700">
                            {PLATFORM_NAMEN[pub.platform] ?? pub.platform}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(pub.status)}
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(pub.status)}`}>
                              {pub.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-semibold text-slate-700">
                              {standDays} {standDays === 1 ? 'dag' : 'dagen'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {pub.last_synced_at
                            ? new Date(pub.last_synced_at).toLocaleString('nl-NL')
                            : 'Nooit'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {pub.sync_retry_count > 0 && (
                            <span className="text-red-600 font-medium">
                              {pub.sync_retry_count} mislukt
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800">Sync Historie</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {syncLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                Geen sync historie beschikbaar
              </div>
            ) : (
              syncLogs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="w-5 h-5 text-slate-400" />
                      <span className="font-medium text-slate-800">
                        {new Date(log.sync_started_at).toLocaleString('nl-NL')}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        log.triggered_by === 'manual' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {log.triggered_by === 'manual' ? 'Handmatig' : 'Automatisch'}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500">
                      Duur: {log.sync_completed_at
                        ? `${Math.round((new Date(log.sync_completed_at).getTime() - new Date(log.sync_started_at).getTime()) / 1000)}s`
                        : 'Bezig...'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <span className="text-slate-600">
                      Totaal: <span className="font-medium">{log.total_dossiers}</span>
                    </span>
                    <span className="text-green-600">
                      Succesvol: <span className="font-medium">{log.successful_syncs}</span>
                    </span>
                    <span className="text-red-600">
                      Mislukt: <span className="font-medium">{log.failed_syncs}</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
