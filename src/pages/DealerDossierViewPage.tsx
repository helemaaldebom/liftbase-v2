import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Package,
  Calendar,
  FileText,
  Gauge,
  Cog,
  Weight,
  Box
} from 'lucide-react';
import { PhotoGallery } from '../components/PhotoGallery';
import { BidsSection } from '../components/BidsSection';
import { ForkliftDetailsForm } from '../components/ForkliftDetailsForm';
import { EmptyContainerHandlerDetailsForm } from '../components/EmptyContainerHandlerDetailsForm';
import { ReachstackerDetailsForm } from '../components/ReachstackerDetailsForm';
import { TerminalTractorDetailsForm } from '../components/TerminalTractorDetailsForm';

interface Dossier {
  id: string;
  dossier_number: string;
  title: string;
  merk?: string;
  type?: string;
  bouwjaar?: number;
  serienummer?: string;
  equipment_type?: string;
  urenstand?: number;
  created_at: string;
}

export function DealerDossierViewPage() {
  const dossierId = window.location.pathname.split('/').pop() || null;
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidId, setBidId] = useState<string | null>(null);
  const [dealerId, setDealerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    loadDealerInfo();
  }, []);

  useEffect(() => {
    if (dealerId && dossierId) {
      loadDossier();
      loadBidId();
    }
  }, [dealerId, dossierId]);

  const loadDealerInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/';
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('dealer_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.dealer_id) {
        alert('U heeft geen toegang tot deze pagina.');
        window.location.href = '/';
        return;
      }

      setDealerId(profile.dealer_id);
    } catch (error) {
      console.error('Error loading dealer info:', error);
      window.location.href = '/';
    }
  };

  const loadDossier = async () => {
    if (!dossierId || !dealerId) return;

    try {
      setLoading(true);

      const { data: bidCheck } = await supabase
        .from('bids')
        .select('id')
        .eq('dossier_id', dossierId)
        .eq('dealer_id', dealerId)
        .maybeSingle();

      if (!bidCheck) {
        alert('U heeft geen toegang tot dit dossier.');
        window.location.href = '/';
        return;
      }

      const { data, error } = await supabase
        .from('dossiers')
        .select('*')
        .eq('id', dossierId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        alert('Dossier niet gevonden.');
        window.location.href = '/';
        return;
      }

      setDossier(data);
    } catch (error) {
      console.error('Error loading dossier:', error);
      alert('Kon dossier niet laden.');
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  const loadBidId = async () => {
    if (!dossierId || !dealerId) return;

    try {
      const { data } = await supabase
        .from('bids')
        .select('id')
        .eq('dossier_id', dossierId)
        .eq('dealer_id', dealerId)
        .maybeSingle();

      if (data) {
        setBidId(data.id);
      }
    } catch (error) {
      console.error('Error loading bid ID:', error);
    }
  };

  const getEquipmentIcon = (type?: string) => {
    switch (type) {
      case 'Forklift':
        return <Package className="w-6 h-6" />;
      case 'Empty Container Handler':
        return <Box className="w-6 h-6" />;
      case 'Reachstacker':
        return <Weight className="w-6 h-6" />;
      case 'Terminal Tractor':
        return <Cog className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  const renderEquipmentDetails = () => {
    if (!dossier || !dossierId) return null;

    const commonProps = {
      dossierId,
      dossierDescription: dossier.description,
      onUpdate: loadDossier,
      readOnly: true,
    };

    switch (dossier.equipment_type) {
      case 'Forklift':
        return <ForkliftDetailsForm {...commonProps} />;
      case 'Empty Container Handler':
        return <EmptyContainerHandlerDetailsForm {...commonProps} />;
      case 'Reachstacker':
        return <ReachstackerDetailsForm {...commonProps} />;
      case 'Terminal Tractor':
        return <TerminalTractorDetailsForm {...commonProps} />;
      default:
        return (
          <div className="text-center py-8 text-slate-500">
            Geen equipment details beschikbaar
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Dossier niet gevonden</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Terug naar dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Terug naar dashboard</span>
        </button>

        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                {getEquipmentIcon(dossier.equipment_type)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                  {dossier.title}
                </h1>
                <p className="text-slate-600">Dossier #{dossier.dossier_number}</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-1 bg-white rounded-lg shadow-sm border border-slate-200 p-1 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Overzicht
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === 'details'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === 'photos'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Foto's
            </button>
            <button
              onClick={() => setActiveTab('bid')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === 'bid'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Bieding
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Basis Informatie
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {dossier.merk && (
                  <div>
                    <p className="text-sm text-slate-500">Merk</p>
                    <p className="font-medium text-slate-800">{dossier.merk}</p>
                  </div>
                )}
                {dossier.type && (
                  <div>
                    <p className="text-sm text-slate-500">Type</p>
                    <p className="font-medium text-slate-800">{dossier.type}</p>
                  </div>
                )}
                {dossier.bouwjaar && (
                  <div>
                    <p className="text-sm text-slate-500">Bouwjaar</p>
                    <p className="font-medium text-slate-800">{dossier.bouwjaar}</p>
                  </div>
                )}
                {dossier.serienummer && (
                  <div>
                    <p className="text-sm text-slate-500">Serienummer</p>
                    <p className="font-medium text-slate-800">{dossier.serienummer}</p>
                  </div>
                )}
                {dossier.equipment_type && (
                  <div>
                    <p className="text-sm text-slate-500">Equipment Type</p>
                    <p className="font-medium text-slate-800">{dossier.equipment_type}</p>
                  </div>
                )}
                {dossier.urenstand !== null && dossier.urenstand !== undefined && (
                  <div>
                    <p className="text-sm text-slate-500">Urenstand</p>
                    <p className="font-medium text-slate-800 flex items-center">
                      <Gauge className="w-4 h-4 mr-1" />
                      {dossier.urenstand.toLocaleString('nl-NL')} uur
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">Aangemaakt op</p>
                  <p className="font-medium text-slate-800 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(dossier.created_at).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-6">
            {renderEquipmentDetails()}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="space-y-6">
            <PhotoGallery
              dossierId={dossierId!}
              canDelete={false}
              dossierNumber={dossier?.dossier_number}
            />
          </div>
        )}

        {activeTab === 'bid' && (
          <div className="space-y-6">
            <BidsSection
              dossierId={dossierId!}
              bidId={bidId}
              canManageBids={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
