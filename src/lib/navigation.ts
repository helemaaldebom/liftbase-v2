import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type DossierFilters = {
  statusFilter?: string;
  equipmentTypeFilter?: string;
  searchTerm?: string;
  dateSort?: 'newest' | 'oldest';
};

export type NavigateFn = (
  page: string,
  id?: string,
  filter?: string,
  equipmentType?: string,
  marktdataDossierId?: string,
  dossierFilters?: DossierFilters
) => void;

// Mapping van de oude page-keys naar URL-paden
const PAGE_PATHS: Record<string, string> = {
  'dashboard': '/',
  'dossiers': '/dossiers',
  'dealers': '/dealers',
  'biedingen': '/biedingen',
  'marktdata-invoeren': '/marktdata/invoeren',
  'marktdata-database': '/marktdata/database',
  'marktdata-import': '/marktdata/import',
  'settings': '/settings',
  'publicatie-dashboard': '/publicatie',
  'dealer-dashboard': '/dealer-dashboard',
  'customer-portal': '/customer-portal',
  'maintenance-management': '/maintenance',
};

export function dossiersSearch(filters: DossierFilters): string {
  const p = new URLSearchParams();
  if (filters.statusFilter && filters.statusFilter !== 'all') p.set('status', filters.statusFilter);
  if (filters.equipmentTypeFilter && filters.equipmentTypeFilter !== 'all') p.set('type', filters.equipmentTypeFilter);
  if (filters.searchTerm) p.set('q', filters.searchTerm);
  if (filters.dateSort && filters.dateSort !== 'newest') p.set('sort', filters.dateSort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

/**
 * Drop-in vervanger voor het oude handleNavigate uit App.tsx.
 * Accepteert dezelfde argumenten als voorheen, zodat de bestaande
 * onNavigate-callsites ongewijzigd blijven werken. Accepteert ook
 * letterlijke paden (beginnend met '/'), o.a. voor returnTo.
 */
export function useAppNavigate(): NavigateFn {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback<NavigateFn>((page, id, filter, equipmentType, marktdataDossierId, dossierFilters) => {
    // Letterlijk pad (bv. returnTo met querystring): direct volgen
    if (page.startsWith('/')) {
      navigate(page);
      return;
    }

    if (page === 'dossier-detail') {
      if (!id) return;
      // Waar moet "terug" heen? Als de aanroeper filters meegeeft (DossiersPage),
      // bouwen we daarmee de terug-URL; anders de huidige locatie.
      const returnTo = dossierFilters
        ? `/dossiers${dossiersSearch(dossierFilters)}`
        : location.pathname + location.search;
      navigate(`/dossiers/${id}`, { state: { returnTo } });
      return;
    }

    if (page === 'dealer-dossier') {
      if (id) navigate(`/dealer/dossier/${id}`);
      return;
    }

    const path = PAGE_PATHS[page] ?? '/';
    const params = new URLSearchParams();
    if (page === 'dossiers' && filter && filter !== 'all') params.set('status', filter);
    if (page === 'marktdata-invoeren') {
      if (equipmentType) params.set('type', equipmentType);
      if (marktdataDossierId) params.set('edit', marktdataDossierId);
    }
    const s = params.toString();
    navigate(s ? `${path}?${s}` : path);
  }, [navigate, location]);
}
