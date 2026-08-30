import { useState, useEffect } from 'react';
import { Upload, FileText, DollarSign, TrendingUp, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import MaintenanceUpload from '../components/MaintenanceUpload';
import FleetDashboard from '../components/FleetDashboard';
import MachineDashboard from '../components/MachineDashboard';

interface Customer {
  id: string;
  company_name: string;
  default_currency: string;
}

interface Dossier {
  id: string;
  dossiernummer: string;
  merk: string;
  model: string;
  serienummer: string;
  fleet_number: string;
  uren: number;
}

export default function CustomerPortalPage() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [selectedView, setSelectedView] = useState<'fleet' | 'machine' | 'upload'>('fleet');
  const [selectedDossier, setSelectedDossier] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'original' | 'EUR' | 'USD'>('original');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCustomerData();
    }
  }, [user]);

  const fetchCustomerData = async () => {
    if (!user) return;

    setLoading(true);

    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (customerData) {
      setCustomer(customerData);
      setCurrency(customerData.default_currency as any);

      const { data: dossiersData } = await supabase
        .from('dossiers')
        .select('id, dossiernummer, merk, model, serienummer, fleet_number, uren')
        .eq('customer_id', customerData.id)
        .order('dossiernummer', { ascending: false });

      if (dossiersData) {
        setDossiers(dossiersData);
      }
    }

    setLoading(false);
  };

  const handleMachineSelect = (dossierId: string) => {
    setSelectedDossier(dossierId);
    setSelectedView('machine');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Customer Profile</h1>
          <p className="text-gray-600">Please contact support to set up your customer account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Maintenance Portal</h1>
              <p className="text-sm text-gray-600">{customer.company_name}</p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCurrency('original')}
                  className={`px-3 py-1 text-sm rounded ${
                    currency === 'original'
                      ? 'bg-white shadow text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() => setCurrency('EUR')}
                  className={`px-3 py-1 text-sm rounded ${
                    currency === 'EUR'
                      ? 'bg-white shadow text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  EUR
                </button>
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 text-sm rounded ${
                    currency === 'USD'
                      ? 'bg-white shadow text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  USD
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setSelectedView('fleet')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              selectedView === 'fleet'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Fleet Overview</span>
          </button>

          <button
            onClick={() => setSelectedView('upload')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              selectedView === 'upload'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Upload className="w-5 h-5" />
            <span>Upload Documents</span>
          </button>
        </div>

        {selectedView === 'fleet' && (
          <div>
            <FleetDashboard customerId={customer.id} currency={currency} />

            <div className="mt-8 bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Machines</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dossiers.map(dossier => (
                  <button
                    key={dossier.id}
                    onClick={() => handleMachineSelect(dossier.id)}
                    className="text-left bg-gray-50 hover:bg-gray-100 border rounded-lg p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">
                        {dossier.dossiernummer}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {dossier.merk} {dossier.model}
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      {dossier.serienummer && (
                        <p>Serial: {dossier.serienummer}</p>
                      )}
                      {dossier.fleet_number && (
                        <p>Fleet: {dossier.fleet_number}</p>
                      )}
                      {dossier.uren > 0 && (
                        <p>Hours: {dossier.uren.toLocaleString()}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedView === 'machine' && selectedDossier && (
          <div>
            <button
              onClick={() => setSelectedView('fleet')}
              className="mb-4 text-blue-600 hover:text-blue-700 flex items-center space-x-2"
            >
              <span>← Back to Fleet</span>
            </button>

            <div className="bg-white border rounded-lg p-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {dossiers.find(d => d.id === selectedDossier)?.dossiernummer}
              </h2>
              <p className="text-gray-600">
                {dossiers.find(d => d.id === selectedDossier)?.merk}{' '}
                {dossiers.find(d => d.id === selectedDossier)?.model}
              </p>
            </div>

            <MachineDashboard
              dossierId={selectedDossier}
              customerId={customer.id}
              currency={currency}
            />

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Upload Maintenance Documents for This Machine
              </h3>
              <MaintenanceUpload
                customerId={customer.id}
                dossierId={selectedDossier}
                onUploadComplete={fetchCustomerData}
              />
            </div>
          </div>
        )}

        {selectedView === 'upload' && (
          <div>
            <div className="bg-white border rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Bulk Upload Maintenance Documents
              </h2>
              <p className="text-gray-600 mb-4">
                Upload invoices, work orders, and other maintenance documents. The system will
                automatically match them to your machines based on serial numbers or fleet numbers.
              </p>
            </div>

            <MaintenanceUpload
              customerId={customer.id}
              onUploadComplete={fetchCustomerData}
            />

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Tips for Best Results</h3>
              <ul className="text-sm text-blue-700 space-y-2">
                <li>• Make sure serial numbers or fleet numbers are visible in documents</li>
                <li>• Upload clear, readable PDFs or images</li>
                <li>• For bulk uploads, you can select multiple files at once</li>
                <li>• The AI will automatically categorize costs as preventive, corrective, or tires</li>
                <li>• You can correct any miscategorizations later in the machine dashboard</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
