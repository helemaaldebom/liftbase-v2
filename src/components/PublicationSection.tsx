import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Globe, CheckCircle, XCircle, Clock, RefreshCw, Eye } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface PublicationSectionProps {
  dossierId: string;
  isManager: boolean;
  onPublicationUpdate?: () => void;
}

interface PublicationStatus {
  platform: string;
  status: string;
  last_synced_at: string | null;
  sync_error_message: string | null;
  published_at: string | null;
}

const PLATFORMS = [
  { key: 'hcl', label: 'Eigen website (heavycargolifters.com)', enabled: true, directPublish: true },
  { key: 'forklift_international', label: 'Forklift International', enabled: true, directPublish: true },
  { key: 'mascus', label: 'Mascus', enabled: true, directPublish: false, hint: 'via Forklift International' },
  { key: 'truck1', label: 'Truck1.eu', enabled: false, directPublish: false },
  { key: 'trucksnl', label: 'TrucksNL', enabled: false, directPublish: false },
  { key: 'machineseeker', label: 'Machineseeker', enabled: false, directPublish: false },
  { key: 'truckscout24', label: 'TruckScout24', enabled: false, directPublish: false },
];

export function PublicationSection({ dossierId, isManager, onPublicationUpdate }: PublicationSectionProps) {
  const [dossier, setDossier] = useState<any>(null);
  const [publications, setPublications] = useState<PublicationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [showXMLPreview, setShowXMLPreview] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [dossierId]);

  const loadData = async () => {
    try {
      const { data: dossierData } = await supabase
        .from('dossiers')
        .select('*')
        .eq('id', dossierId)
        .single();

      const { data: publicationsData } = await supabase
        .from('advertisement_publications')
        .select('*')
        .eq('dossier_id', dossierId);

      setDossier(dossierData);
      setPublications(publicationsData || []);
    } catch (error) {
      console.error('Error loading publication data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformToggle = async (platform: string, enabled: boolean) => {
    if (!isManager) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('dossiers')
        .update({ [`publish_to_${platform}`]: enabled })
        .eq('id', dossierId);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error updating platform setting:', error);
      alert('Fout bij opslaan instellingen');
    } finally {
      setSaving(false);
    }
  };

  const PUBLISH_FUNCTIONS: Record<string, string> = {
    forklift_international: 'publish-to-forklift-international',
    hcl: 'publish-to-hcl-website',
  };

  const PLATFORM_LABELS: Record<string, string> = {
    forklift_international: 'Forklift International',
    hcl: 'de website',
  };

  const handlePublishNow = async (platform: string) => {
    if (!isManager) return;
    await executePublish(platform);
  };

  const executePublish = async (platform: string) => {
    const functionName = PUBLISH_FUNCTIONS[platform];
    if (!functionName) return;

    setPublishing(platform);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Niet ingelogd');

      const supportedTypes = ['forklift', 'heavy_duty_forklift', 'reachstacker', 'terminal_tractor', 'empty_container_handler'];
      if (!supportedTypes.includes(dossier?.equipment_type)) {
        alert(`Dit machinetype ("${dossier?.equipment_type}") kan niet gepubliceerd worden.`);
        setPublishing(null);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dossierIds: [dossierId] }),
        }
      );

      const result = await response.json();
      console.log('Publication result:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Publicatie mislukt');
      }

      const label = PLATFORM_LABELS[platform] || platform;
      if (result.success) {
        alert(`✅ Succesvol gepubliceerd naar ${label}.`);
      } else {
        const details = result.results?.filter((r: any) => !r.success).map((r: any) => `${r.dossier}: ${r.error}`).join('\n')
          || `Status ${result.dataStatus ?? '?'}${result.dataErrors ? `, ${result.dataErrors} fout(en) gemeld door het platform` : ''}`;
        alert(`❌ Publicatie naar ${label} is mislukt.\n\n${details}`);
      }

      await loadData();
      onPublicationUpdate?.();
    } catch (error: any) {
      console.error('Error publishing:', error);
      alert(`Fout bij publiceren:\n\n${error.message}`);
    } finally {
      setPublishing(null);
    }
  };

  const handleViewXML = async (platform: string) => {
    const pub = publications.find(p => p.platform === platform);
    if (pub && (pub as any).metadata?.xml_feed) {
      setShowXMLPreview((pub as any).metadata.xml_feed);
    }
  };

  const getPublicationStatus = (platform: string) => {
    return publications.find(p => p.platform === platform);
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
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return 'Gepubliceerd';
      case 'updated':
        return 'Bijgewerkt';
      case 'failed':
        return 'Mislukt';
      case 'pending':
        return 'In behandeling';
      default:
        return 'Niet gepubliceerd';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Globe className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-800">Online Publicatie</h2>
        </div>
        <p className="text-slate-500">Laden...</p>
      </div>
    );
  }

  if (!isManager) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-800">Online Publicatie</h2>
        </div>
        {dossier?.is_published && (
          <div className="flex items-center space-x-2 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Actief gepubliceerd</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {PLATFORMS.map((platform) => {
          const isEnabled = dossier?.[`publish_to_${platform.key}`] || false;
          const pubStatus = getPublicationStatus(platform.key);
          const canPublish = platform.enabled;

          return (
            <div
              key={platform.key}
              className={`border rounded-lg p-4 ${
                canPublish ? 'border-slate-200' : 'border-slate-100 bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => handlePlatformToggle(platform.key, e.target.checked)}
                      disabled={!canPublish || saving}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className={`font-medium ${canPublish ? 'text-slate-800' : 'text-slate-400'}`}>
                      {platform.label}
                    </span>
                  </label>

                  {!canPublish && (
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                      Binnenkort beschikbaar
                    </span>
                  )}

                  {canPublish && (platform as any).hint && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {(platform as any).hint}
                    </span>
                  )}

                  {pubStatus && (
                    <div className="flex items-center space-x-2 ml-4">
                      {getStatusIcon(pubStatus.status)}
                      <span className="text-sm text-slate-600">
                        {getStatusText(pubStatus.status)}
                      </span>
                      {pubStatus.last_synced_at && (
                        <span className="text-xs text-slate-400">
                          • {new Date(pubStatus.last_synced_at).toLocaleString('nl-NL')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {isEnabled && canPublish && (platform as any).directPublish && (
                  <div className="flex items-center space-x-2">
                    {(pubStatus as any)?.metadata?.xml_feed && (
                      <button
                        onClick={() => handleViewXML(platform.key)}
                        className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>XML</span>
                      </button>
                    )}
                    <button
                      onClick={() => handlePublishNow(platform.key)}
                      disabled={publishing === platform.key}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${publishing === platform.key ? 'animate-spin' : ''}`} />
                      <span>{publishing === platform.key ? 'Publiceren...' : 'Nu publiceren'}</span>
                    </button>
                  </div>
                )}
              </div>

              {pubStatus?.sync_error_message && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">
                    <strong>Fout:</strong> {pubStatus.sync_error_message}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Automatische synchronisatie</h3>
        <p className="text-sm text-blue-800">
          Alle geselecteerde platforms worden automatisch elke nacht gesynchroniseerd.
          Gebruik "Nu publiceren" om direct te publiceren of bij te werken.
        </p>
      </div>

      {showXMLPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">XML Feed Preview</h3>
              <button
                onClick={() => setShowXMLPreview(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              <pre className="text-xs text-slate-700 bg-slate-50 p-4 rounded border border-slate-200 overflow-x-auto">
                {showXMLPreview}
              </pre>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
