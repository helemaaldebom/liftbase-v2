import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { useAppNavigate, type NavigateFn } from './lib/navigation';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DossiersPage } from './pages/DossiersPage';
import { DossierDetailPage } from './pages/DossierDetailPage';
import { DealersPage } from './pages/DealersPage';
import { BiedingenPage } from './pages/BiedingenPage';
import { MarktdataInvoerenPage } from './pages/MarktdataInvoerenPage';
import { MarktdataDatabasePage } from './pages/MarktdataDatabasePage';
import { MarktdataImportPage } from './pages/MarktdataImportPage';
import { SettingsPage } from './pages/SettingsPage';
import { PublicationDashboardPage } from './pages/PublicationDashboardPage';
import { DealerDashboardPage } from './pages/DealerDashboardPage';
import { DealerDossierViewPage } from './pages/DealerDossierViewPage';
import CustomerPortalPage from './pages/CustomerPortalPage';
import MaintenanceManagementPage from './pages/MaintenanceManagementPage';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Laden...</p>
      </div>
    </div>
  );
}

/** Toont LoginPage voor niet-ingelogde gebruikers (zelfde gedrag als voorheen: geen redirect, de URL blijft staan). */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <LoginPage />;
  return <>{children}</>;
}

/** Kleine helper voor pagina's die alleen onNavigate nodig hebben. */
function NavPage({ component: C }: { component: ComponentType<{ onNavigate: NavigateFn }> }) {
  const onNavigate = useAppNavigate();
  return <C onNavigate={onNavigate} />;
}

/** Oude biedingslink /submit-bid/:bidId — dossier opzoeken en doorsturen. */
function SubmitBidRedirect() {
  const { bidId } = useParams();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('bids')
          .select('dossier_id')
          .eq('id', bidId as string)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        const bid = data as { dossier_id: string } | null;
        if (bid) {
          navigate(`/dossiers/${bid.dossier_id}?bid=${bidId}`, { replace: true });
        } else {
          setFailed(true);
        }
      } catch (error) {
        console.error('Error loading bid:', error);
        if (active) setFailed(true);
      }
    })();
    return () => { active = false; };
  }, [bidId, navigate]);

  if (failed) return <Navigate to="/" replace />;
  return <LoadingScreen />;
}

function DossierDetailRoute() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const onNavigate = useAppNavigate();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? 'dossiers';
  if (!id) return <Navigate to="/" replace />;
  return (
    <DossierDetailPage
      dossierId={id}
      bidId={searchParams.get('bid')}
      onNavigate={onNavigate}
      returnTo={returnTo}
    />
  );
}

function DossiersRoute() {
  const [searchParams] = useSearchParams();
  const onNavigate = useAppNavigate();
  return (
    <DossiersPage
      key={searchParams.toString()}
      onNavigate={onNavigate}
      initialStatusFilter={searchParams.get('status') ?? 'all'}
      initialEquipmentTypeFilter={searchParams.get('type') ?? 'all'}
      initialSearchTerm={searchParams.get('q') ?? ''}
      initialDateSort={(searchParams.get('sort') as 'newest' | 'oldest') ?? 'newest'}
    />
  );
}

function MarktdataInvoerenRoute() {
  const [searchParams] = useSearchParams();
  const onNavigate = useAppNavigate();
  return (
    <MarktdataInvoerenPage
      key={searchParams.toString()}
      onNavigate={onNavigate}
      initialEquipmentType={searchParams.get('type')}
      editDossierId={searchParams.get('edit')}
    />
  );
}

/** Dealers landen op hun eigen dashboard i.p.v. het interne dashboard. */
function DashboardRoute() {
  const { profile } = useAuth();
  const onNavigate = useAppNavigate();
  if (profile?.dealer_id) return <Navigate to="/dealer-dashboard" replace />;
  return <DashboardPage onNavigate={onNavigate} />;
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            {/* Publiek bereikbaar (biedingsflow voor externe partijen) */}
            <Route path="/submit-bid/:bidId" element={<SubmitBidRedirect />} />
            <Route path="/dossiers/:id" element={<DossierDetailRoute />} />

            {/* Ingelogde omgeving */}
            <Route path="/" element={<RequireAuth><DashboardRoute /></RequireAuth>} />
            <Route path="/dossiers" element={<RequireAuth><DossiersRoute /></RequireAuth>} />
            <Route path="/dealers" element={<RequireAuth><NavPage component={DealersPage} /></RequireAuth>} />
            <Route path="/biedingen" element={<RequireAuth><NavPage component={BiedingenPage} /></RequireAuth>} />
            <Route path="/marktdata/invoeren" element={<RequireAuth><MarktdataInvoerenRoute /></RequireAuth>} />
            <Route path="/marktdata/database" element={<RequireAuth><NavPage component={MarktdataDatabasePage} /></RequireAuth>} />
            <Route path="/marktdata/import" element={<RequireAuth><NavPage component={MarktdataImportPage} /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><NavPage component={SettingsPage} /></RequireAuth>} />
            <Route path="/publicatie" element={<RequireAuth><NavPage component={PublicationDashboardPage} /></RequireAuth>} />
            <Route path="/dealer-dashboard" element={<RequireAuth><DealerDashboardPage /></RequireAuth>} />
            <Route path="/dealer/dossier/:id" element={<RequireAuth><DealerDossierViewPage /></RequireAuth>} />
            <Route path="/customer-portal" element={<RequireAuth><CustomerPortalPage /></RequireAuth>} />
            <Route path="/maintenance" element={<RequireAuth><NavPage component={MaintenanceManagementPage} /></RequireAuth>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
