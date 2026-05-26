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
  { key: 'forklift_international', label: 'Forklift International', enabled: true },
  { key: 'mascus', label: 'Mascus', enabled: true },
  { key: 'trucksnl', label: 'TrucksNL', enabled: false },
  { key: 'machineseeker', label: 'Machineseeker', enabled: false },
  { key: 'truckscout24', label: 'TruckScout24', enabled: false },
];

export function PublicationSection({ dossierId, isManager, onPublicationUpdate }: PublicationSectionProps) {
  const { t } = useLanguage();
  const [dossier, setDossier] = useState<any>(null);
  const [publications, setPublications] = useState<PublicationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [showXMLPreview, setShowXMLPreview] = useState<string | null>(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [fiUsername, setFiUsername] = useState('');
  const [fiPassword, setFiPassword] = useState('');
  const [storedCredentials, setStoredCredentials] = useState<{username: string; password: string} | null>(null);

  useEffect(() => {
    loadData();
    loadStoredCredentials();
  }, [dossierId]);

  const loadStoredCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('api_credentials')
        .select('username, api_key')
        .eq('platform', 'forklift_international')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error loading stored credentials:', error);
        return;
      }

      if (data) {
        setStoredCredentials({
          username: data.username,
          password: data.api_key
        });
        console.log('Loaded stored Forklift International credentials');
      } else {
        console.log('No stored credentials found');
      }
    } catch (error) {
      console.error('Error loading stored credentials:', error);
    }
  };

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

  const handlePublishNow = async (platform: string) => {
    if (!isManager) return;

    if (platform === 'forklift_international') {
      if (storedCredentials) {
        console.log('Using stored credentials for Forklift International');
        await executePublish(platform, storedCredentials);
      } else {
        console.log('No stored credentials, showing modal');
        setShowCredentialsModal(true);
      }
      return;
    }

    await executePublish(platform);
  };

  const executePublish = async (platform: string, credentials?: { username: string; password: string }) => {
    setPublishing(platform);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Niet ingelogd');

      if (platform === 'forklift_international') {
        const equipmentType = dossier?.equipment_type;
        const supportedTypes = ['forklift', 'heavy_duty_forklift', 'reachstacker', 'terminal_tractor', 'empty_container_handler'];
        if (!supportedTypes.includes(equipmentType)) {
          alert(`Dit dossier heeft equipment type "${equipmentType}". Ondersteunde types voor Forklift International: ${supportedTypes.join(', ')}`);
          setPublishing(null);
          return;
        }
      }

      const functionName = platform === 'forklift_international'
        ? 'publish-to-forklift-international'
        : 'publish-to-mascus';

      const body = platform === 'forklift_international'
        ? {
            dossierIds: [dossierId],
            testMode: false,
            fiUsername: credentials?.username || '',
            fiPassword: credentials?.password || ''
          }
        : { dossier_id: dossierId };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Publicatie mislukt');
      }

      const result = await response.json();
      console.log('Publication result:', result);

      const statusCode = result.apiStatusCode || result.uploadResult?.status;
      let statusEmoji = '';
      let statusDescription = '';

      if (statusCode === 200) {
        statusEmoji = '✅';
        statusDescription = 'Connectie succesvol';
      } else if (statusCode === 400) {
        statusEmoji = '❌';
        statusDescription = 'Bad Request - Controleer XML data';
      } else if (statusCode === 401) {
        statusEmoji = '🔒';
        statusDescription = 'Unauthorized - Verkeerde inloggegevens';
      } else if (statusCode === 403) {
        statusEmoji = '⛔';
        statusDescription = 'Forbidden - Geen toegang';
      } else if (statusCode === 404) {
        statusEmoji = '🔍';
        statusDescription = 'Not Found - API endpoint niet gevonden';
      } else if (statusCode >= 500) {
        statusEmoji = '⚠️';
        statusDescription = 'Server Error - Probleem bij Forklift International';
      } else if (statusCode >= 300 && statusCode < 400) {
        statusEmoji = '↪️';
        statusDescription = 'Redirect';
      }

      if (result.success) {
        alert(`${statusEmoji} Succesvol gepubliceerd naar ${platform}!\n\nAPI Status: ${statusCode} - ${statusDescription}\nMachines: ${result.machineCount}\nBericht: ${result.statusMessage || 'OK'}\n\nResponse: ${result.uploadResult?.response || 'Data verzonden'}`);
      } else {
        alert(`${statusEmoji} Publicatie naar ${platform} heeft gefaald\n\nAPI Status: ${statusCode} - ${statusDescription}\nFout: ${result.statusMessage || 'Onbekend'}\n\nDetails: ${result.uploadResult?.response || 'Geen details beschikbaar'}`);
      }

      await loadData();
      onPublicationUpdate?.();
    } catch (error: any) {
      console.error('Error publishing:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      alert(`Fout bij publiceren naar ${platform}:\n\n${error.message}\n\nCheck de browser console voor meer details.`);
    } finally {
      setPublishing(null);
    }
  };

  const handleCredentialsSubmit = async () => {
    if (!fiUsername || !fiPassword) {
      alert('Vul alle velden in');
      return;
    }

    setShowCredentialsModal(false);
    await executePublish('forklift_international', { username: fiUsername, password: fiPassword });
    setFiUsername('');
    setFiPassword('');
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

                {isEnabled && canPublish && (
                  <div className="flex items-center space-x-2">
                    {pubStatus?.metadata && (
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

      {showCredentialsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Forklift International Credentials</h3>
              <p className="text-sm text-slate-600 mt-1">Geen opgeslagen credentials gevonden</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Tip:</strong> Sla je credentials permanent op in <strong>Instellingen → API Credentials</strong> zodat je ze niet elke keer hoeft in te voeren.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={fiUsername}
                  onChange={(e) => setFiUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Forklift International username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={fiPassword}
                  onChange={(e) => setFiPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Forklift International password"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setFiUsername('');
                  setFiPassword('');
                }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleCredentialsSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Publiceren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
