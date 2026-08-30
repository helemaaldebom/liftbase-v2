import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, UserPlus, Edit, Trash2, Shield, User, RefreshCw, Key, Save, Eye, EyeOff } from 'lucide-react';
import type { Database } from '../lib/database.types';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'] & {
  dealer?: {
    id: string;
    name: string;
    email: string;
    active: boolean;
  };
};

interface ApiCredential {
  id: string;
  platform: string;
  username: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SettingsPageProps {
  onNavigate: (page: string) => void;
}

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [normalizingBrands, setNormalizingBrands] = useState(false);
  const [normalizeStatus, setNormalizeStatus] = useState('');

  const [apiCredentials, setApiCredentials] = useState<ApiCredential[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(true);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [fiUsername, setFiUsername] = useState('');
  const [fiApiKey, setFiApiKey] = useState('');

  useEffect(() => {
    if (profile?.role === 'manager') {
      loadUsers();
      loadApiCredentials();
    }
  }, [profile]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: dealers, error: dealersError } = await supabase
        .from('dealers')
        .select('id, name, email, active, auth_user_id');

      if (dealersError) {
        console.error('Error loading dealers:', dealersError);
      }

      const usersWithDealerInfo = (profiles || []).map(profile => {
        const dealer = dealers?.find(d => d.auth_user_id === profile.id);
        return {
          ...profile,
          dealer: dealer ? {
            id: dealer.id,
            name: dealer.name,
            email: dealer.email,
            active: dealer.active
          } : undefined
        };
      });

      const dealersWithoutAuth = (dealers || [])
        .filter(d => !d.auth_user_id)
        .map(dealer => ({
          id: `dealer_${dealer.id}`,
          email: dealer.email,
          full_name: dealer.name,
          role: 'dealer' as const,
          active: dealer.active,
          has_taxatietool_access: false,
          created_at: new Date().toISOString(),
          language_preference: 'nl' as const,
          dealer: {
            id: dealer.id,
            name: dealer.name,
            email: dealer.email,
            active: dealer.active
          }
        }));

      setUsers([...usersWithDealerInfo, ...dealersWithoutAuth]);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApiCredentials = async () => {
    try {
      setLoadingCredentials(true);
      const { data, error } = await supabase
        .from('api_credentials')
        .select('*')
        .order('platform');

      if (error) {
        console.error('Error loading API credentials:', error);
        return;
      }

      setApiCredentials(data || []);

      const fiCred = data?.find(c => c.platform === 'forklift_international' && c.is_active);
      if (fiCred) {
        setFiUsername(fiCred.username);
        setFiApiKey(fiCred.api_key);
      }
    } catch (error) {
      console.error('Error loading API credentials:', error);
    } finally {
      setLoadingCredentials(false);
    }
  };

  const saveForkliftInternationalCredentials = async () => {
    if (!fiUsername || !fiApiKey) {
      alert('Vul zowel username als API key in');
      return;
    }

    setSavingCredentials(true);
    try {
      const existing = apiCredentials.find(c => c.platform === 'forklift_international' && c.is_active);

      if (existing) {
        const { error } = await supabase
          .from('api_credentials')
          .update({
            username: fiUsername,
            api_key: fiApiKey,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('api_credentials')
          .insert({
            platform: 'forklift_international',
            username: fiUsername,
            api_key: fiApiKey,
            is_active: true,
            created_by: profile?.id,
          });

        if (error) throw error;
      }

      alert('Forklift International credentials succesvol opgeslagen!');
      await loadApiCredentials();
    } catch (error) {
      console.error('Error saving credentials:', error);
      alert('Fout bij opslaan credentials: ' + (error instanceof Error ? error.message : 'Onbekend'));
    } finally {
      setSavingCredentials(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      verkoper: 'Verkoper',
      manager: 'Manager / Directeur',
      handelaar: 'Handelaar',
      eindgebruiker: 'Eindgebruiker',
      dealer: 'Dealer',
    };
    return labels[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      manager: 'bg-red-100 text-red-800',
      verkoper: 'bg-blue-100 text-blue-800',
      handelaar: 'bg-green-100 text-green-800',
      eindgebruiker: 'bg-purple-100 text-purple-800',
      dealer: 'bg-yellow-100 text-yellow-800',
    };
    return colors[role] || 'bg-slate-100 text-slate-800';
  };

  if (profile?.role !== 'manager') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Geen toegang</h2>
          <p className="text-slate-600 mb-6">Je hebt geen rechten om deze pagina te bekijken.</p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Terug naar Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onNavigate('dashboard')}
                className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-slate-800">Instellingen</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-800">API Credentials</h2>
            </div>
            <p className="text-sm text-slate-600 mt-1">Beheer API keys voor advertentieplatforms</p>
          </div>
          <div className="p-6">
            {loadingCredentials ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-800">Forklift International</h3>
                      <p className="text-sm text-slate-600">API credentials voor publicatie naar Forklift International</p>
                    </div>
                    {apiCredentials.find(c => c.platform === 'forklift_international' && c.is_active) && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Geconfigureerd
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={fiUsername}
                        onChange={(e) => setFiUsername(e.target.value)}
                        placeholder="Je Forklift International username"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        API Key / Password
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeys['forklift_international'] ? 'text' : 'password'}
                          value={fiApiKey}
                          onChange={(e) => setFiApiKey(e.target.value)}
                          placeholder="Je Forklift International password"
                          className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeys({ ...showApiKeys, forklift_international: !showApiKeys['forklift_international'] })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showApiKeys['forklift_international'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={saveForkliftInternationalCredentials}
                      disabled={savingCredentials}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingCredentials ? 'Opslaan...' : 'Credentials opslaan'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Let op:</strong> Deze credentials worden veilig opgeslagen en automatisch gebruikt bij het publiceren naar Forklift International. Je hoeft ze niet meer handmatig in te voeren bij elke publicatie.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Database onderhoud</h2>
            <p className="text-sm text-slate-600 mt-1">Tools voor het opschonen en normaliseren van data</p>
          </div>
          <div className="p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-1">
                <h3 className="font-medium text-slate-800 mb-1">Merknamen normaliseren</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Converteert alle varianten van "SMV", "KONEcranes", "Konecranes" naar de standaard: <strong>"KONECranes - SMV"</strong>
                </p>
                {normalizeStatus && (
                  <div className={`text-sm px-3 py-2 rounded-lg mb-3 ${
                    normalizeStatus.includes('✓')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : normalizeStatus.includes('❌')
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {normalizeStatus}
                  </div>
                )}
              </div>
              <button
                onClick={handleNormalizeBrands}
                disabled={normalizingBrands}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${normalizingBrands ? 'animate-spin' : ''}`} />
                <span>{normalizingBrands ? 'Bezig...' : 'Normaliseren'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Gebruikersbeheer</h2>
              <p className="text-sm text-slate-600 mt-1">Beheer gebruikers en hun rechten</p>
            </div>
            <button
              onClick={() => setShowNewUserModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nieuwe gebruiker</span>
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Geen gebruikers gevonden</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Naam</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Rol</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Acties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4 text-sm text-slate-800">
                          {user.dealer ? user.dealer.name : user.full_name}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {user.dealer ? (user.dealer.email || '-') : user.email}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                              {getRoleLabel(user.role)}
                            </span>
                            {user.role === 'eindgebruiker' && user.has_taxatietool_access && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                Taxatietool
                              </span>
                            )}
                            {user.id.startsWith('dealer_') && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Geen login
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.dealer ? (user.dealer.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') : (user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                          }`}>
                            {user.dealer ? (user.dealer.active ? 'Actief' : 'Inactief') : (user.active ? 'Actief' : 'Inactief')}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setEditingUser(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Bewerken"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {user.id !== profile.id && (
                              <button
                                onClick={() => {
                                  const displayName = user.dealer ? user.dealer.name : user.full_name;
                                  if (confirm(`Weet je zeker dat je ${displayName} wilt verwijderen?`)) {
                                    handleDeleteUser(user.id);
                                  }
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Verwijderen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewUserModal && (
        <NewUserModal
          onClose={() => setShowNewUserModal(false)}
          onSuccess={() => {
            setShowNewUserModal(false);
            loadUsers();
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            loadUsers();
          }}
        />
      )}
    </div>
  );

  async function handleDeleteUser(userId: string) {
    if (!confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')) {
      return;
    }

    try {
      if (userId.startsWith('dealer_')) {
        const dealerId = userId.replace('dealer_', '');
        const { error: dealerError } = await supabase
          .from('dealers')
          .delete()
          .eq('id', dealerId);

        if (dealerError) throw dealerError;

        alert('Dealer succesvol verwijderd');
        loadUsers();
        return;
      }

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (userProfile?.role === 'dealer') {
        console.log('Deleting dealer with auth account');

        const { error: dealerError } = await supabase
          .from('dealers')
          .delete()
          .eq('auth_user_id', userId);

        if (dealerError) {
          console.error('Failed to delete dealer record:', dealerError);
        }

        const { error: profileError } = await supabase
          .from('user_profiles')
          .delete()
          .eq('id', userId);

        if (profileError) throw profileError;

        alert('Dealer succesvol verwijderd');
        loadUsers();
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Geen actieve sessie');
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
      console.log('Calling delete-user function:', url);
      console.log('UserId:', userId);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      console.log('Response status:', response.status);

      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error(`Server returned status ${response.status} but no JSON response`);
      }

      if (!response.ok) {
        throw new Error(result.error || `Fout bij verwijderen gebruiker (status ${response.status})`);
      }

      alert('Gebruiker succesvol verwijderd');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      if (error instanceof Error) {
        if (error.message === 'Failed to fetch') {
          alert('Kan geen verbinding maken met de server. Controleer of de edge function is gedeployed.');
        } else {
          alert('Er is een fout opgetreden bij het verwijderen van de gebruiker: ' + error.message);
        }
      } else {
        alert('Er is een onbekende fout opgetreden bij het verwijderen van de gebruiker');
      }
    }
  }

  async function handleNormalizeBrands() {
    setNormalizingBrands(true);
    setNormalizeStatus('🔍 Zoeken naar varianten...');

    try {
      const { data: records, error: fetchError } = await supabase
        .from('dossiers')
        .select('id, brand, dossier_number')
        .or('brand.ilike.%SMV%,brand.ilike.%Konecranes%,brand.ilike.%KONE%');

      if (fetchError) throw fetchError;

      if (!records || records.length === 0) {
        setNormalizeStatus('✓ Geen varianten gevonden om aan te passen');
        return;
      }

      const brandCounts = new Map<string, number>();
      records.forEach(r => {
        const count = brandCounts.get(r.brand) || 0;
        brandCounts.set(r.brand, count + 1);
      });

      const variantsList = Array.from(brandCounts.entries())
        .map(([brand, count]) => `"${brand}" (${count}x)`)
        .join(', ');

      setNormalizeStatus(`🔄 ${records.length} record(s) aanpassen: ${variantsList}...`);

      let updated = 0;
      for (const record of records) {
        const { error: updateError } = await supabase
          .from('dossiers')
          .update({ brand: 'KONECranes - SMV' })
          .eq('id', record.id);

        if (updateError) {
          console.error('Update error:', updateError);
        } else {
          updated++;
        }
      }

      setNormalizeStatus(`✓ ${updated} record(s) succesvol aangepast naar "KONECranes - SMV"`);
    } catch (error) {
      console.error('Error normalizing brands:', error);
      setNormalizeStatus(`❌ Fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    } finally {
      setNormalizingBrands(false);
    }
  }
}

interface NewUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function NewUserModal({ onClose, onSuccess }: NewUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'verkoper' as UserProfile['role'],
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (formData.role === 'dealer' && (!formData.email || !formData.password)) {
        const { data: newDealer, error: dealerError } = await supabase
          .from('dealers')
          .insert({
            name: formData.full_name,
            email: formData.email || null,
            active: formData.active,
          })
          .select()
          .single();

        if (dealerError) throw dealerError;

        onSuccess();
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Gebruiker aanmaken mislukt');

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          active: formData.active,
        });

      if (profileError) throw profileError;

      if (formData.role === 'dealer') {
        const { error: dealerError } = await supabase
          .from('dealers')
          .insert({
            auth_user_id: authData.user.id,
            name: formData.full_name,
            email: formData.email,
            active: formData.active,
          });

        if (dealerError) console.error('Error creating dealer record:', dealerError);
      }

      onSuccess();
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Nieuwe gebruiker</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Volledige naam *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Jan Jansen"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email {formData.role === 'dealer' ? '(optioneel voor dealers zonder login)' : '*'}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required={formData.role !== 'dealer'}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="jan@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Wachtwoord {formData.role === 'dealer' ? '(optioneel voor dealers zonder login)' : '*'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={formData.role !== 'dealer'}
              minLength={formData.password.length > 0 ? 6 : 0}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={formData.role === 'dealer' ? 'Minimaal 6 karakters (indien login gewenst)' : 'Minimaal 6 karakters'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Rol *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserProfile['role'] })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="verkoper">Verkoper</option>
              <option value="manager">Manager / Directeur</option>
              <option value="handelaar">Handelaar</option>
              <option value="eindgebruiker">Eindgebruiker</option>
              <option value="dealer">Dealer</option>
            </select>
            {formData.role === 'dealer' && (
              <p className="mt-1 text-xs text-slate-500">
                Tip: Laat email en wachtwoord leeg voor dealers zonder inlogaccount
              </p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="active" className="ml-2 text-sm text-slate-700">
              Account actief
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              disabled={loading}
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Bezig...' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditUserModalProps {
  user: UserProfile;
  onClose: () => void;
  onSuccess: () => void;
}

function EditUserModal({ user, onClose, onSuccess }: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    full_name: user.dealer ? user.dealer.name : user.full_name,
    email: user.dealer ? user.dealer.email : user.email,
    role: user.role,
    active: user.dealer ? user.dealer.active : user.active,
    has_taxatietool_access: user.has_taxatietool_access || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Updating user:', user.id, 'with data:', formData);

      const hasDealerInfo = user.dealer !== undefined;
      const hasAuthAccount = !user.id.startsWith('dealer_');

      if (hasDealerInfo && !hasAuthAccount) {
        console.log('Updating dealer without auth account:', user.dealer.id);
        const { data, error: dealerError } = await supabase
          .from('dealers')
          .update({
            name: formData.full_name,
            email: formData.email,
            active: formData.active,
          })
          .eq('id', user.dealer.id)
          .select();

        console.log('Update result:', { data, error: dealerError });

        if (dealerError) {
          console.error('Dealer update error:', dealerError);
          throw new Error(`Fout bij bijwerken dealer: ${dealerError.message}${dealerError.hint ? ` (${dealerError.hint})` : ''}`);
        }

        alert('Dealer succesvol bijgewerkt!');
        onSuccess();
        return;
      }

      if (hasDealerInfo && formData.role !== 'dealer') {
        console.log('Removing dealer link - user is changing from dealer to', formData.role);
        const { error: dealerDeleteError } = await supabase
          .from('dealers')
          .update({ auth_user_id: null })
          .eq('id', user.dealer.id);

        if (dealerDeleteError) {
          console.error('Error unlinking dealer:', dealerDeleteError);
        }
      }

      if (hasDealerInfo && formData.role === 'dealer') {
        console.log('Updating dealer with auth account:', user.dealer.id);
        const { data, error: dealerError } = await supabase
          .from('dealers')
          .update({
            name: formData.full_name,
            email: formData.email,
            active: formData.active,
          })
          .eq('id', user.dealer.id)
          .select();

        console.log('Dealer update result:', { data, error: dealerError });

        if (dealerError) {
          console.error('Dealer update error:', dealerError);
          throw new Error(`Fout bij bijwerken dealer: ${dealerError.message}${dealerError.hint ? ` (${dealerError.hint})` : ''}`);
        }
      }

      if (hasAuthAccount) {
        console.log('Updating user profile:', user.id);
        const { data, error: profileError } = await supabase
          .from('user_profiles')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
            active: formData.active,
            has_taxatietool_access: formData.has_taxatietool_access,
          })
          .eq('id', user.id)
          .select();

        console.log('Profile update result:', { data, error: profileError });

        if (profileError) {
          console.error('Profile update error:', profileError);
          throw new Error(`Fout bij bijwerken profiel: ${profileError.message}${profileError.hint ? ` (${profileError.hint})` : ''}`);
        }
      }

      alert('Gebruiker succesvol bijgewerkt!');
      onSuccess();
    } catch (err) {
      console.error('Error updating user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Er is een fout opgetreden';
      const detailedError = err && typeof err === 'object' && 'details' in err
        ? `${errorMessage}\n\nDetails: ${(err as any).details}`
        : errorMessage;
      setError(detailedError);
      alert('Fout bij bijwerken: ' + detailedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Gebruiker bewerken</h2>
          <p className="text-sm text-slate-600 mt-1">{user.dealer ? user.dealer.email : user.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Volledige naam *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Rol *
            </label>
            {user.id.startsWith('dealer_') && (
              <div className="mb-2 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-sm">
                Deze dealer heeft nog geen login account. Je kunt alleen dealer informatie bewerken.
              </div>
            )}
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserProfile['role'] })}
              disabled={user.id.startsWith('dealer_')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="verkoper">Verkoper</option>
              <option value="manager">Manager / Directeur</option>
              <option value="handelaar">Handelaar</option>
              <option value="eindgebruiker">Eindgebruiker</option>
              <option value="dealer">Dealer</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="active-edit"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="active-edit" className="ml-2 text-sm text-slate-700">
                Account actief
              </label>
            </div>

            {formData.role === 'eindgebruiker' && (
              <div className="flex items-center bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                <input
                  type="checkbox"
                  id="taxatietool-edit"
                  checked={formData.has_taxatietool_access}
                  onChange={(e) => setFormData({ ...formData, has_taxatietool_access: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="taxatietool-edit" className="ml-2 text-sm font-medium text-indigo-900">
                  Toegang tot Taxatietool (premium)
                </label>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              disabled={loading}
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Bezig...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
