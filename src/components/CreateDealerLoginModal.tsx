import { useState } from 'react';
import { X, UserPlus, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Dealer {
  id: string;
  name: string;
  email: string;
  auth_user_id: string | null;
}

interface CreateDealerLoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
  dealers: Dealer[];
}

export function CreateDealerLoginModal({ onClose, onSuccess, dealers }: CreateDealerLoginModalProps) {
  const { t } = useLanguage();
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const availableDealers = dealers.filter(d => !d.auth_user_id);

  const handleDealerSelect = (dealerId: string) => {
    setSelectedDealerId(dealerId);
    setEmail('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDealerId || !email || !password) {
      alert('Vul alle velden in');
      return;
    }

    try {
      setLoading(true);

      const dealer = dealers.find(d => d.id === selectedDealerId);
      if (!dealer) {
        throw new Error('Dealer niet gevonden');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/create-dealer-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealerId: selectedDealerId,
          email: email,
          name: dealer.name,
          password: password,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Er is een fout opgetreden');
      }

      setCreatedCredentials({
        email: result.email,
        password: result.password,
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating dealer login:', error);
      alert(error instanceof Error ? error.message : 'Er is een fout opgetreden');
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyAllCredentials = async () => {
    if (createdCredentials) {
      const text = `Email: ${createdCredentials.email}\nWachtwoord: ${createdCredentials.password}`;
      await copyToClipboard(text);
    }
  };

  if (createdCredentials) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <Check className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-slate-800">Account Aangemaakt</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800 font-medium mb-2">✓ Login succesvol aangemaakt</p>
              <p className="text-green-700 text-sm">
                Bewaar deze gegevens veilig. Het wachtwoord kan later niet meer worden weergegeven.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={createdCredentials.email}
                    readOnly
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(createdCredentials.email)}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                    title="Kopieer email"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Wachtwoord
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={createdCredentials.password}
                    readOnly
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(createdCredentials.password)}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                    title="Kopieer wachtwoord"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                onClick={copyAllCredentials}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <Copy className="w-4 h-4" />
                <span>Kopieer alle gegevens</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Sluiten
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">Nieuw Dealerlogin</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {availableDealers.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  Alle dealers hebben al een login account.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Selecteer Dealer *
                  </label>
                  <select
                    value={selectedDealerId}
                    onChange={(e) => handleDealerSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Kies een dealer...</option>
                    {availableDealers.map((dealer) => (
                      <option key={dealer.id} value={dealer.id}>
                        {dealer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Login Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="bijvoorbeeld: derk@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Dit moet een uniek email adres zijn voor login</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Wachtwoord *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Minimaal 8 karakters</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    Na het aanmaken wordt een login account gemaakt waarmee de dealer kan inloggen en biedingen kan plaatsen.
                  </p>
                </div>
              </>
            )}
          </div>
        </form>

        <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
          >
            Annuleren
          </button>
          {availableDealers.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Aanmaken...' : 'Account aanmaken'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
