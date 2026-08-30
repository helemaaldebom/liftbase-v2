import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
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

type Page = 'dashboard' | 'dossiers' | 'dossier-detail' | 'dealers' | 'biedingen' | 'marktdata-invoeren' | 'marktdata-database' | 'marktdata-import' | 'settings' | 'publicatie-dashboard' | 'dealer-dashboard' | 'dealer-dossier' | 'customer-portal' | 'maintenance-management';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = sessionStorage.getItem('currentPage');
    return (saved as Page) || 'dashboard';
  });
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(() => {
    return sessionStorage.getItem('selectedDossierId') || null;
  });
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');
  const [marktdataEquipmentType, setMarktdataEquipmentType] = useState<string | null>(null);
  const [editMarktdataDossierId, setEditMarktdataDossierId] = useState<string | null>(null);
  const [returnToPage, setReturnToPage] = useState<Page>(() => {
    const saved = sessionStorage.getItem('returnToPage');
    return (saved as Page) || 'dossiers';
  });

  useEffect(() => {
    sessionStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (selectedDossierId) {
      sessionStorage.setItem('selectedDossierId', selectedDossierId);
    } else {
      sessionStorage.removeItem('selectedDossierId');
    }
  }, [selectedDossierId]);

  useEffect(() => {
    sessionStorage.setItem('returnToPage', returnToPage);
  }, [returnToPage]);

  useEffect(() => {
    const path = window.location.pathname;
    const submitBidMatch = path.match(/^\/submit-bid\/([a-f0-9-]+)$/);
    const dealerDossierMatch = path.match(/^\/dealer\/dossier\/([a-f0-9-]+)$/);

    if (submitBidMatch) {
      const bidId = submitBidMatch[1];
      setSelectedBidId(bidId);
      loadDossierFromBid(bidId);
    } else if (dealerDossierMatch) {
      const dossierId = dealerDossierMatch[1];
      setSelectedDossierId(dossierId);
      setCurrentPage('dealer-dossier');
    }
  }, []);

  useEffect(() => {
    if (profile?.dealer_id) {
      const savedPage = sessionStorage.getItem('currentPage');
      if (!savedPage || savedPage === 'dashboard') {
        setCurrentPage('dealer-dashboard');
      }
    }
  }, [profile]);

  const loadDossierFromBid = async (bidId: string) => {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select('dossier_id')
        .eq('id', bidId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSelectedDossierId(data.dossier_id);
        setCurrentPage('dossier-detail');
      }
    } catch (error) {
      console.error('Error loading bid:', error);
    }
  };

  const handleNavigate = (
    page: string,
    id?: string,
    filter?: string,
    equipmentType?: string,
    marktdataDossierId?: string,
    dossierFilters?: {
      statusFilter?: string;
      equipmentTypeFilter?: string;
      searchTerm?: string;
      dateSort?: 'newest' | 'oldest';
    }
  ) => {
    if (page === 'dossier-detail') {
      setReturnToPage(currentPage);
    }
    setCurrentPage(page as Page);
    if (id) {
      setSelectedDossierId(id);
    }
    if (filter) {
      setStatusFilter(filter);
    } else if (page !== 'dossiers') {
      setStatusFilter('all');
    }
    if (equipmentType) {
      setMarktdataEquipmentType(equipmentType);
    } else {
      setMarktdataEquipmentType(null);
    }
    if (marktdataDossierId) {
      setEditMarktdataDossierId(marktdataDossierId);
    } else {
      setEditMarktdataDossierId(null);
    }
    if (dossierFilters) {
      if (dossierFilters.statusFilter !== undefined) {
        setStatusFilter(dossierFilters.statusFilter);
      }
      if (dossierFilters.equipmentTypeFilter !== undefined) {
        setEquipmentTypeFilter(dossierFilters.equipmentTypeFilter);
      }
      if (dossierFilters.searchTerm !== undefined) {
        setSearchTerm(dossierFilters.searchTerm);
      }
      if (dossierFilters.dateSort !== undefined) {
        setDateSort(dossierFilters.dateSort);
      }
    }
  };

  if (currentPage === 'dossier-detail' && selectedDossierId) {
    return <DossierDetailPage dossierId={selectedDossierId} bidId={selectedBidId} onNavigate={handleNavigate} returnTo={returnToPage} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (currentPage === 'dossiers') {
    return (
      <DossiersPage
        onNavigate={handleNavigate}
        initialStatusFilter={statusFilter}
        initialEquipmentTypeFilter={equipmentTypeFilter}
        initialSearchTerm={searchTerm}
        initialDateSort={dateSort}
      />
    );
  }

  if (currentPage === 'dealers') {
    return <DealersPage onNavigate={handleNavigate} />;
  }

  if (currentPage === 'biedingen') {
    return <BiedingenPage onNavigate={handleNavigate} />;
  }

  if (currentPage === 'marktdata-invoeren') {
    return <MarktdataInvoerenPage onNavigate={handleNavigate} initialEquipmentType={marktdataEquipmentType} editDossierId={editMarktdataDossierId} />;
  }

  if (currentPage === 'marktdata-database') {
    return <MarktdataDatabasePage onNavigate={handleNavigate} />;
  }

  if (currentPage === 'marktdata-import') {
    return <MarktdataImportPage onNavigate={handleNavigate} />;
  }

  if (currentPage === 'settings') {
    return <SettingsPage onNavigate={handleNavigate} />;
  }

  if (currentPage === 'publicatie-dashboard') {
    return <PublicationDashboardPage onNavigate={handleNavigate} />;
  }

  if (currentPage === 'dealer-dashboard') {
    return <DealerDashboardPage />;
  }

  if (currentPage === 'dealer-dossier' && selectedDossierId) {
    return <DealerDossierViewPage />;
  }

  if (currentPage === 'customer-portal') {
    return <CustomerPortalPage />;
  }

  if (currentPage === 'maintenance-management') {
    return <MaintenanceManagementPage onNavigate={handleNavigate} />;
  }

  return <DashboardPage onNavigate={handleNavigate} />;
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
