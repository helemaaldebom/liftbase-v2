import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { LogOut, FileText, Users, Euro, Settings, TrendingUp, Database, Upload, Globe, Wrench } from 'lucide-react';
import { GlobalSearch } from '../components/GlobalSearch';

const MapOverview = lazy(() => import('../components/MapOverview'));
const DataOverviewWidget = lazy(() => import('../components/DataOverviewWidget'));

interface DashboardPageProps {
  onNavigate: (page: string, id?: string, filter?: string) => void;
}

interface Stats {
  openDossiers: number;
  stockDossiers: number;
  biddingDossiers: number;
  soldDossiers: number;
  archivedDossiers: number;
  totalRevenue: number;
  totalStockValue: number;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { profile, signOut } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    openDossiers: 0,
    stockDossiers: 0,
    biddingDossiers: 0,
    soldDossiers: 0,
    archivedDossiers: 0,
    totalRevenue: 0,
    totalStockValue: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoadingStats(true);

      const { data: allDossiers, error } = await supabase
        .from('dossiers')
        .select('status, sale_price, purchase_price, estimated_value, eindklantprijs, handelsprijs')
        .or('is_marktdata.is.null,is_marktdata.eq.false');

      if (error) throw error;

      const stats = (allDossiers || []).reduce(
        (acc, dossier) => {
          switch (dossier.status) {
            case 'open':
              acc.openDossiers++;
              break;
            case 'stock':
              acc.stockDossiers++;
              acc.totalStockValue += dossier.eindklantprijs || dossier.handelsprijs || dossier.purchase_price || dossier.estimated_value || 0;
              break;
            case 'bidding':
              acc.biddingDossiers++;
              break;
            case 'sold':
              acc.soldDossiers++;
              acc.totalRevenue += dossier.sale_price || 0;
              break;
            case 'archived':
              acc.archivedDossiers++;
              break;
          }
          return acc;
        },
        {
          openDossiers: 0,
          stockDossiers: 0,
          biddingDossiers: 0,
          soldDossiers: 0,
          archivedDossiers: 0,
          totalRevenue: 0,
          totalStockValue: 0,
        }
      );

      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const getRoleLabel = (role: string) => {
    return t(`roles.${role}`) || role;
  };

  const getMenuItems = () => {
    if (!profile) return { primary: [], marktdata: [], settings: [] };

    const primaryItems = [
      { icon: FileText, label: t('navigation.dossiers'), page: 'dossiers' as const, visible: ['verkoper', 'manager', 'eindgebruiker'], section: 'primary' },
      { icon: Globe, label: 'Online Publicaties', page: 'publicatie-dashboard' as const, visible: ['manager'], section: 'primary' },
      { icon: Euro, label: t('navigation.bids'), page: 'biedingen' as const, visible: ['verkoper', 'manager', 'handelaar', 'eindgebruiker'], section: 'primary' },
      { icon: Users, label: t('navigation.dealers'), page: 'dealers' as const, visible: ['verkoper', 'manager', 'eindgebruiker'], section: 'primary' },
    ];

    const marktdataItems = [
      { icon: Database, label: t('navigation.marktdataDatabase'), page: 'marktdata-database' as const, visible: ['verkoper', 'manager'], section: 'marktdata' },
      { icon: TrendingUp, label: t('navigation.marktdataEntry'), page: 'marktdata-invoeren' as const, visible: ['verkoper', 'manager'], section: 'marktdata' },
      { icon: Upload, label: t('navigation.marktdataImport'), page: 'marktdata-import' as const, visible: ['manager'], section: 'marktdata' },
    ];

    const settingsItems = [
      { icon: Wrench, label: 'Maintenance Management', page: 'maintenance-management' as const, visible: ['manager'], section: 'settings' },
      { icon: Settings, label: t('navigation.settings'), page: 'settings' as const, visible: ['manager'], section: 'settings' },
    ];

    const filtered = {
      primary: primaryItems.filter(item => item.visible.includes(profile.role)),
      marktdata: marktdataItems.filter(item => item.visible.includes(profile.role)),
      settings: settingsItems.filter(item => item.visible.includes(profile.role)),
    };

    if (profile.role === 'eindgebruiker' && profile.has_taxatietool_access) {
      filtered.marktdata.push({
        icon: Database,
        label: t('navigation.marktdataDatabase'),
        page: 'marktdata-database' as const,
        visible: ['eindgebruiker'],
        section: 'marktdata'
      });
    }

    return filtered;
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-gradient-to-r from-[#0D3B52] to-[#1a5570] shadow-lg border-b-4 border-[#0a2d3e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-6">
            <div className="flex items-center space-x-4 flex-shrink-0">
              <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
                  <span className="text-[#0D3B52] font-bold text-xl">HC</span>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  HEAVY CARGO LIFTERS
                </h1>
                <p className="text-xs text-white/70 uppercase tracking-wider font-medium">LiftBase</p>
              </div>
            </div>

            <div className="flex-1 max-w-2xl">
              <GlobalSearch onNavigate={onNavigate} />
            </div>

            <div className="flex items-center space-x-4 flex-shrink-0">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{profile.full_name}</p>
                <p className="text-xs text-white/70">{getRoleLabel(profile.role)}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40"
                title={t('auth.logout')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 bg-white rounded-xl shadow-sm border-l-4 border-[#0D3B52] p-6">
          <h2 className="text-2xl font-bold text-[#0D3B52] mb-2">
            {t('dashboard.welcome')}, {profile.full_name}
          </h2>
          <p className="text-slate-600 flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-500">{t('dashboard.role')}:</span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#0D3B52]/10 text-[#0D3B52]">
              {getRoleLabel(profile.role)}
            </span>
          </p>
        </div>

        <div className="mt-12 bg-white rounded-2xl shadow-lg border-t-4 border-[#0D3B52] p-8">
          <div className="flex items-center space-x-3 mb-6">
            <TrendingUp className="w-6 h-6 text-[#0D3B52]" />
            <h3 className="text-xl font-bold text-[#0D3B52]">
              {t('dashboard.stats')}
            </h3>
          </div>
          {loadingStats ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#0D3B52]/20 border-t-[#0D3B52]"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <button
                onClick={() => onNavigate('dossiers', undefined, 'open')}
                className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 cursor-pointer border-2 border-blue-200 hover:border-blue-600 shadow-sm hover:shadow-xl group"
              >
                <p className="text-4xl font-bold text-blue-600 group-hover:text-white transition-colors duration-300">{stats.openDossiers}</p>
                <p className="text-sm text-slate-600 group-hover:text-white/90 mt-2 font-medium transition-colors duration-300">Open</p>
              </button>
              <button
                onClick={() => onNavigate('dossiers', undefined, 'stock')}
                className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-300 cursor-pointer border-2 border-slate-200 hover:border-slate-600 shadow-sm hover:shadow-xl group"
              >
                <p className="text-4xl font-bold text-slate-700 group-hover:text-white transition-colors duration-300">{stats.stockDossiers}</p>
                <p className="text-sm text-slate-600 group-hover:text-white/90 mt-2 font-medium transition-colors duration-300">Stock</p>
                <div className="mt-3 pt-3 border-t border-slate-200 group-hover:border-white/30">
                  <p className="text-2xl font-bold text-slate-700 group-hover:text-white transition-colors duration-300">
                    € {stats.totalStockValue.toLocaleString('nl-NL')}
                  </p>
                  <p className="text-xs text-slate-500 group-hover:text-white/70 mt-1 transition-colors duration-300">Totale verkoopwaarde stock</p>
                </div>
              </button>
              <button
                onClick={() => onNavigate('dossiers', undefined, 'bidding')}
                className="text-center p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-300 cursor-pointer border-2 border-amber-200 hover:border-amber-600 shadow-sm hover:shadow-xl group"
              >
                <p className="text-4xl font-bold text-amber-600 group-hover:text-white transition-colors duration-300">{stats.biddingDossiers}</p>
                <p className="text-sm text-slate-600 group-hover:text-white/90 mt-2 font-medium transition-colors duration-300">Bieden actief</p>
              </button>
              <button
                onClick={() => onNavigate('dossiers', undefined, 'sold')}
                className="text-center p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 cursor-pointer border-2 border-emerald-200 hover:border-emerald-600 shadow-sm hover:shadow-xl group"
              >
                <p className="text-4xl font-bold text-emerald-600 group-hover:text-white transition-colors duration-300">{stats.soldDossiers}</p>
                <p className="text-sm text-slate-600 group-hover:text-white/90 mt-2 font-medium transition-colors duration-300">Verkocht</p>
                <div className="mt-3 pt-3 border-t border-emerald-200 group-hover:border-white/30">
                  <p className="text-2xl font-bold text-emerald-600 group-hover:text-white transition-colors duration-300">
                    € {stats.totalRevenue.toLocaleString('nl-NL')}
                  </p>
                  <p className="text-xs text-slate-500 group-hover:text-white/70 mt-1 transition-colors duration-300">Totale omzet</p>
                </div>
              </button>
              <button
                onClick={() => onNavigate('dossiers', undefined, 'archived')}
                className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 cursor-pointer border-2 border-gray-200 hover:border-gray-600 shadow-sm hover:shadow-xl group"
              >
                <p className="text-4xl font-bold text-gray-700 group-hover:text-white transition-colors duration-300">{stats.archivedDossiers}</p>
                <p className="text-sm text-slate-600 group-hover:text-white/90 mt-2 font-medium transition-colors duration-300">Gearchiveerd</p>
              </button>
            </div>
          )}
        </div>

        {(profile?.role === 'verkoper' || profile?.role === 'manager') && (
          <div className="mt-8">
            <Suspense fallback={
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Kaart wordt geladen...</p>
                  </div>
                </div>
              </div>
            }>
              <MapOverview onNavigate={onNavigate} />
            </Suspense>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#0D3B52] via-[#0D3B52] to-[#1a5570] rounded-2xl p-8 shadow-xl border border-[#0a2d3e] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
            <div className="relative">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white uppercase tracking-wide flex items-center space-x-2">
                  <div className="w-1 h-6 bg-white rounded-full"></div>
                  <span>Hoofdmenu</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {getMenuItems().primary.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => onNavigate(item.page)}
                    className="bg-white/10 backdrop-blur-sm p-6 rounded-xl hover:bg-white hover:scale-105 transition-all duration-300 group text-left border-2 border-white/20 hover:border-white shadow-lg hover:shadow-2xl"
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="bg-white/20 group-hover:bg-[#0D3B52] p-4 rounded-xl transition-all duration-300 shadow-md">
                        <item.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-[#0D3B52] transition-colors duration-300">
                        {item.label}
                      </h3>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {getMenuItems().marktdata.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border-l-4 border-[#0D3B52] p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-2 h-8 bg-gradient-to-b from-[#0D3B52] to-[#1a5570] rounded-full"></div>
                <h3 className="text-lg font-bold text-[#0D3B52] uppercase tracking-wide">Marktdata Management</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {getMenuItems().marktdata.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => onNavigate(item.page)}
                    className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-xl hover:from-[#0D3B52] hover:to-[#1a5570] hover:shadow-xl transition-all duration-300 group text-left border-2 border-slate-200 hover:border-[#0D3B52]"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-white group-hover:bg-white/20 p-3 rounded-xl transition-all duration-300 shadow-md border border-slate-200 group-hover:border-white/40">
                        <item.icon className="w-6 h-6 text-[#0D3B52] group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 group-hover:text-white transition-colors duration-300">
                        {item.label}
                      </h3>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {getMenuItems().settings.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border-l-4 border-slate-400 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-2 h-8 bg-gradient-to-b from-slate-400 to-slate-600 rounded-full"></div>
                <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wide">Maintenance Management</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="hidden md:block"></div>
                {getMenuItems().settings.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => onNavigate(item.page)}
                    className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-xl hover:from-slate-700 hover:to-slate-800 hover:shadow-xl transition-all duration-300 group text-left border-2 border-slate-200 hover:border-slate-700"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-white group-hover:bg-white/20 p-3 rounded-xl transition-all duration-300 shadow-md border border-slate-200 group-hover:border-white/40">
                        <item.icon className="w-6 h-6 text-slate-700 group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 group-hover:text-white transition-colors duration-300">
                        {item.label}
                      </h3>
                    </div>
                  </button>
                ))}
                <div className="hidden md:block"></div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8">
          <Suspense fallback={
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Data wordt geladen...</p>
                </div>
              </div>
            </div>
          }>
            <DataOverviewWidget onNavigate={onNavigate} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
