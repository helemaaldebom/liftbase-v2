import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LogIn, Globe } from 'lucide-react';
import { createTestUsers } from '../utils/createTestUsers';
import type { Language } from '../lib/translations';

export function LoginPage() {
  const { signIn } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingUsers, setCreatingUsers] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem('currentPage');
    sessionStorage.removeItem('selectedDossierId');
    sessionStorage.removeItem('returnToPage');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const selectedLanguage = language;
      await signIn(email, password);
      await setLanguage(selectedLanguage);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTestUsers = async () => {
    setCreatingUsers(true);
    setError('');
    try {
      await createTestUsers();
      setError('');
      alert('Test gebruikers aangemaakt! Check de console voor details.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij aanmaken gebruikers');
    } finally {
      setCreatingUsers(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center flex-1 justify-center">
              <div className="bg-slate-800 p-3 rounded-lg">
                <LogIn className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="appearance-none bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent cursor-pointer"
              >
                <option value="nl">{t('language.dutch')}</option>
                <option value="en">{t('language.english')}</option>
                <option value="de">{t('language.german')}</option>
              </select>
              <Globe className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">
            {t('auth.loginTitle')}
          </h1>
          <p className="text-center text-slate-600 mb-8">
            {t('auth.loginSubtitle')}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition"
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition"
                placeholder={t('auth.passwordPlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? `${t('common.loading')}` : t('auth.loginButton')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            <p>Geen account? Neem contact op met uw beheerder.</p>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleCreateTestUsers}
              disabled={creatingUsers}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 rounded-lg transition disabled:opacity-50 text-sm"
            >
              {creatingUsers ? 'Bezig...' : 'Test gebruikers aanmaken'}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          LiftBase © 2025
        </div>
      </div>
    </div>
  );
}
