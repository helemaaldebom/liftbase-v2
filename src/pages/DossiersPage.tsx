import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter, FileText, Calendar, Euro, Trash2, Send, RefreshCw, Download, X, Copy } from 'lucide-react';
import { DossierNavbar } from '../components/DossierNavbar';
import { NewDossierModal } from '../components/NewDossierModal';
import { CopyDossierModal } from '../components/CopyDossierModal';
import { BulkOfferModal } from '../components/BulkOfferModal';
import { exportDossiersToExcel } from '../utils/excelExport';

interface Photo {
  id: string;
  storage_path: string;
  display_order: number;
}

interface Dossier {
  id: string;
  dossier_number: string;
  dossier_datum: string;
  title: string;
  equipment_type: string;
  status: string;
  purchase_price: number | null;
  estimated_value: number | null;
  handelsprijs: number | null;
  eindklantprijs: number | null;
  sale_price: number | null;
  created_at: string;
  updated_at: string;
  sold_at: string | null;
  created_by: string;
  brand?: string;
  model?: string;
  merk?: string;
  type?: string;
  serienummer?: string | null;
  bouwjaar?: number | null;
  uren?: number | null;
  capaciteit?: number | null;
  hefhoogte?: number | null;
  brandstof?: string | null;
  lastzwaartepunt?: number | null;
  vrije_hef?: number | null;
  masttype?: string | null;
  aanbouwdeel?: string | null;
  description?: string;
  location?: string;
  locatie?: string | null;
  land?: string | null;
  customer_name?: string | null;
  condition?: string;
  year?: number;
  latitude?: number | null;
  longitude?: number | null;
  user_profiles?: {
    full_name: string;
  };
  first_published_at?: string | null;
  forklift_details?: any;
  ech_details?: any;
  reachstacker_details?: any;
  terminal_tractor_details?: any;
  photos?: Photo[];
}

interface DossiersPageProps {
  onNavigate: (
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
  ) => void;
  initialStatusFilter?: string;
  initialEquipmentTypeFilter?: string;
  initialSearchTerm?: string;
  initialDateSort?: 'newest' | 'oldest';
}

export function DossiersPage({
  onNavigate,
  initialStatusFilter = 'all',
  initialEquipmentTypeFilter = 'all',
  initialSearchTerm = '',
  initialDateSort = 'newest'
}: DossiersPageProps) {
  const { profile } = useAuth();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState<string>(initialEquipmentTypeFilter);
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>(initialDateSort);
  const [showNewDossierModal, setShowNewDossierModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [dossierToCopy, setDossierToCopy] = useState<Dossier | null>(null);
  const [selectedDossiers, setSelectedDossiers] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showBulkOfferModal, setShowBulkOfferModal] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [exporting, setExporting] = useState(false);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    loadDossiers();
  }, []);

  const getPhotoUrl = (storagePath: string) => {
    const { data } = supabase.storage
      .from('dossier-photos')
      .getPublicUrl(storagePath, {
        transform: {
          width: 200,
          height: 200,
          resize: 'cover',
          quality: 80
        }
      });
    return data.publicUrl;
  };

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  useEffect(() => {
    setEquipmentTypeFilter(initialEquipmentTypeFilter);
  }, [initialEquipmentTypeFilter]);

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  useEffect(() => {
    setDateSort(initialDateSort);
  }, [initialDateSort]);

  const loadDossiers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dossiers')
        .select(`
          *,
          user_profiles:created_by (
            full_name
          ),
          forklift_details(*),
          ech_details:empty_container_handler_details(*),
          reachstacker_details(*),
          terminal_tractor_details(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch first publication dates for all dossiers
      const dossierIds = (data || []).map(d => d.id);
      const { data: publicationData } = await supabase
        .from('advertisement_publications')
        .select('dossier_id, published_at')
        .in('dossier_id', dossierIds)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: true });

      // Fetch photos for all dossiers (limited to 3 per dossier)
      const { data: photosData } = await supabase
        .from('photos')
        .select('id, dossier_id, storage_path, display_order')
        .in('dossier_id', dossierIds)
        .eq('visible_online', true)
        .order('display_order', { ascending: true });

      // Create a map of first publication dates
      const firstPublicationMap = new Map<string, string>();
      publicationData?.forEach(pub => {
        if (!firstPublicationMap.has(pub.dossier_id)) {
          firstPublicationMap.set(pub.dossier_id, pub.published_at);
        }
      });

      // Create a map of photos per dossier (max 3)
      const photosMap = new Map<string, Photo[]>();
      photosData?.forEach(photo => {
        if (!photosMap.has(photo.dossier_id)) {
          photosMap.set(photo.dossier_id, []);
        }
        const dossierPhotos = photosMap.get(photo.dossier_id)!;
        if (dossierPhotos.length < 3) {
          dossierPhotos.push({
            id: photo.id,
            storage_path: photo.storage_path,
            display_order: photo.display_order
          });
        }
      });

      // Add first publication date and photos to each dossier
      const dossiersWithData = (data || []).map(dossier => ({
        ...dossier,
        first_published_at: firstPublicationMap.get(dossier.id) || null,
        photos: photosMap.get(dossier.id) || []
      }));

      setDossiers(dossiersWithData);
    } catch (error) {
      console.error('Error loading dossiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      stock: 'Stock',
      open: 'Open',
      bidding: 'Bieden actief',
      sold: 'Verkocht',
      archived: 'Gearchiveerd',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      stock: 'bg-slate-100 text-slate-700',
      open: 'bg-blue-100 text-blue-700',
      bidding: 'bg-amber-100 text-amber-700',
      sold: 'bg-emerald-100 text-emerald-700',
      archived: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getEquipmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      heavy_duty_forklift: 'Heavy Duty Forklifts',
      empty_container_handler: 'Empty Container Handlers',
      reachstacker: 'Reachstackers',
      terminal_tractor: 'Terminal Tractors',
      container: 'Container',
      trailer: 'Trailer',
      chassis: 'Chassis',
      general_equipment: 'Overig',
      other: 'Overig',
    };
    return labels[type] || type;
  };

  const getRelevantDate = (dossier: Dossier, filterStatus: string): string => {
    switch (filterStatus) {
      case 'sold':
        return dossier.sold_at || dossier.created_at;
      case 'stock':
        return dossier.first_published_at || dossier.created_at;
      case 'bidding':
        return dossier.created_at;
      case 'archived':
        return dossier.updated_at;
      default:
        return dossier.created_at;
    }
  };

  const getDateLabel = (filterStatus: string): string => {
    switch (filterStatus) {
      case 'sold':
        return 'Verkocht op';
      case 'stock':
        return 'Online sinds';
      case 'bidding':
        return 'Bieden sinds';
      case 'archived':
        return 'Gearchiveerd op';
      default:
        return 'Aangemaakt op';
    }
  };

  const uniqueCustomers = Array.from(
    new Set(dossiers.map(d => d.customer_name).filter(Boolean))
  ).sort();

  const filteredDossiers = dossiers
    .filter((dossier) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = search === '' ||
        dossier.title.toLowerCase().includes(search) ||
        dossier.dossier_number.toLowerCase().includes(search) ||
        (dossier as any).brand?.toLowerCase().includes(search) ||
        (dossier as any).model?.toLowerCase().includes(search) ||
        (dossier as any).merk?.toLowerCase().includes(search) ||
        (dossier as any).type?.toLowerCase().includes(search) ||
        (dossier as any).serienummer?.toLowerCase().includes(search) ||
        (dossier as any).description?.toLowerCase().includes(search) ||
        (dossier as any).location?.toLowerCase().includes(search) ||
        (dossier as any).locatie?.toLowerCase().includes(search) ||
        (dossier as any).land?.toLowerCase().includes(search) ||
        (dossier as any).customer_name?.toLowerCase().includes(search);

      const dossierStatus = (dossier.status || '').toLowerCase().trim();
      const filterStatus = statusFilter.toLowerCase().trim();

      let matchesStatus = false;
      if (filterStatus === 'all') {
        matchesStatus = true;
      } else {
        matchesStatus = dossierStatus === filterStatus;
      }

      const matchesEquipmentType = equipmentTypeFilter === 'all' || dossier.equipment_type === equipmentTypeFilter;

      const matchesCustomer = customerFilter === 'all' || dossier.customer_name === customerFilter;

      return matchesSearch && matchesStatus && matchesEquipmentType && matchesCustomer;
    })
    .sort((a, b) => {
      const dateA = new Date(getRelevantDate(a, statusFilter)).getTime();
      const dateB = new Date(getRelevantDate(b, statusFilter)).getTime();
      return dateSort === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const toggleDossierSelection = (dossierId: string) => {
    const newSelection = new Set(selectedDossiers);
    if (newSelection.has(dossierId)) {
      newSelection.delete(dossierId);
    } else {
      newSelection.add(dossierId);
    }
    setSelectedDossiers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedDossiers.size === filteredDossiers.length) {
      setSelectedDossiers(new Set());
    } else {
      setSelectedDossiers(new Set(filteredDossiers.map(d => d.id)));
    }
  };

  const handleDeleteDossiers = async () => {
    try {
      setDeleting(true);
      const idsToDelete = Array.from(selectedDossiers);

      const { error } = await supabase
        .from('dossiers')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      setSelectedDossiers(new Set());
      setShowDeleteConfirm(false);
      await loadDossiers();
    } catch (error: any) {
      console.error('Error deleting dossiers:', error);
      const errorMessage = error?.message || 'Onbekende fout';
      alert(`Er is een fout opgetreden bij het verwijderen van dossiers:\n\n${errorMessage}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkOfferSuccess = () => {
    setSelectedDossiers(new Set());
    setShowBulkOfferModal(false);
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatusValue) return;
    if (bulkStatusValue === 'sold' && !customerName.trim()) {
      alert('Klantnaam is verplicht bij status "Verkocht"');
      return;
    }

    try {
      setUpdatingStatus(true);
      const idsToUpdate = Array.from(selectedDossiers);

      const updateData: any = { status: bulkStatusValue };
      if (bulkStatusValue === 'sold') {
        updateData.customer_name = customerName.trim();
        updateData.sold_at = new Date().toISOString();
      } else {
        updateData.customer_name = null;
        updateData.sold_at = null;
      }

      const { error } = await supabase
        .from('dossiers')
        .update(updateData)
        .in('id', idsToUpdate);

      if (error) throw error;

      setSelectedDossiers(new Set());
      setShowBulkStatusModal(false);
      setBulkStatusValue('');
      setCustomerName('');
      await loadDossiers();
    } catch (error: any) {
      console.error('Error updating dossier status:', error);
      const errorMessage = error?.message || 'Onbekende fout';
      alert(`Er is een fout opgetreden bij het wijzigen van de status:\n\n${errorMessage}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleExportToExcel = async (exportAll: boolean = false) => {
    try {
      setExporting(true);
      const idsToExport = exportAll
        ? filteredDossiers.map(d => d.id)
        : Array.from(selectedDossiers);

      if (idsToExport.length === 0) {
        alert('Geen dossiers geselecteerd om te exporteren');
        return;
      }

      await exportDossiersToExcel(idsToExport);

      if (!exportAll) {
        setSelectedDossiers(new Set());
      }
    } catch (error: any) {
      console.error('Error exporting to Excel:', error);
      const errorMessage = error?.message || 'Onbekende fout';
      alert(`Er is een fout opgetreden bij het exporteren:\n\n${errorMessage}`);
    } finally {
      setExporting(false);
    }
  };

  if (!profile) return null;

  const canCreateDossier = ['verkoper', 'manager', 'eindgebruiker'].includes(profile.role);
  const canDeleteDossier = profile.role === 'manager';
  const canOfferDossiers = ['verkoper', 'manager'].includes(profile.role);

  return (
    <div className="min-h-screen bg-slate-50">
      <DossierNavbar onNavigate={onNavigate} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Dossiers</h1>
              <p className="text-slate-600 mt-1">Beheer taxatiedossiers</p>
            </div>
            <div className="flex items-center space-x-3">
              {filteredDossiers.length > 0 && (
                <button
                  onClick={() => handleExportToExcel(true)}
                  disabled={exporting}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  <span>Export alles ({filteredDossiers.length})</span>
                </button>
              )}
              {selectedDossiers.size > 0 && (
                <>
                  <button
                    onClick={() => handleExportToExcel(false)}
                    disabled={exporting}
                    className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    <Download className="w-5 h-5" />
                    <span>Export ({selectedDossiers.size})</span>
                  </button>
                  <button
                    onClick={() => setShowBulkStatusModal(true)}
                    className="flex items-center space-x-2 bg-[#0D3B52] hover:bg-[#1a5570] text-white px-4 py-2 rounded-lg transition"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Status wijzigen ({selectedDossiers.size})</span>
                  </button>
                </>
              )}
              {canOfferDossiers && selectedDossiers.size > 0 && (
                <button
                  onClick={() => setShowBulkOfferModal(true)}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
                >
                  <Send className="w-5 h-5" />
                  <span>Aanbieden ({selectedDossiers.size})</span>
                </button>
              )}
              {canDeleteDossier && selectedDossiers.size > 0 && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Verwijderen ({selectedDossiers.size})</span>
                </button>
              )}
              {canCreateDossier && (
                <button
                  onClick={() => setShowNewDossierModal(true)}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Nieuw dossier</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Zoek op dossiernummer, merk, type, locatie, klant, serienummer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Wissen"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="text-slate-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle statussen</option>
                <option value="open">Open</option>
                <option value="stock">Stock</option>
                <option value="bidding">Bieden actief</option>
                <option value="sold">Verkocht</option>
                <option value="archived">Gearchiveerd</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={equipmentTypeFilter}
                onChange={(e) => setEquipmentTypeFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle types</option>
                <option value="heavy_duty_forklift">Heavy Duty Forklifts</option>
                <option value="empty_container_handler">Empty Container Handlers</option>
                <option value="reachstacker">Reachstackers</option>
                <option value="terminal_tractor">Terminal Tractors</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle klanten</option>
                {uniqueCustomers.map((customer) => (
                  <option key={customer} value={customer}>
                    {customer}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={dateSort}
                onChange={(e) => setDateSort(e.target.value as 'newest' | 'oldest')}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Nieuwste eerst</option>
                <option value="oldest">Oudste eerst</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-600 mt-2">Laden...</p>
          </div>
        ) : filteredDossiers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">
              {searchTerm || statusFilter !== 'all'
                ? 'Geen dossiers gevonden met deze filters'
                : 'Nog geen dossiers aangemaakt'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(canDeleteDossier || canOfferDossiers) && filteredDossiers.length > 0 && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={selectedDossiers.size === filteredDossiers.length && filteredDossiers.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <label className="text-sm text-slate-600 cursor-pointer" onClick={toggleSelectAll}>
                  Selecteer alles
                </label>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4">
              {filteredDossiers.map((dossier) => (
                <div
                  key={dossier.id}
                  className="bg-white rounded-lg border border-slate-200 hover:shadow-md transition"
                >
                  <div className="p-6 flex items-start space-x-4">
                    {(canDeleteDossier || canOfferDossiers) && (
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={selectedDossiers.has(dossier.id)}
                          onChange={() => toggleDossierSelection(dossier.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                    )}
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() =>
                        onNavigate('dossier-detail', dossier.id, undefined, undefined, undefined, {
                          statusFilter,
                          equipmentTypeFilter,
                          searchTerm,
                          dateSort,
                        })
                      }
                    >
                      <div className="flex items-start space-x-6">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-semibold text-slate-800">
                                  {dossier.title}
                                </h3>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                    dossier.status
                                  )}`}
                                >
                                  {getStatusLabel(dossier.status)}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDossierToCopy(dossier);
                                    setShowCopyModal(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Dossier kopiëren"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                              <p className="text-sm text-slate-500">
                                {dossier.dossier_number} • {dossier.customer_name || getEquipmentTypeLabel(dossier.equipment_type)}
                                {(dossier.year || dossier.bouwjaar) && ` • ${dossier.year || dossier.bouwjaar}`}
                                {dossier.uren != null && ` • ${dossier.uren.toLocaleString('nl-NL')} uur`}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="space-y-1">
                                {dossier.purchase_price != null && (
                                  <div className="flex items-center justify-end space-x-2">
                                    <span className="text-xs text-slate-500">Inkoopprijs:</span>
                                    <span className="text-sm font-semibold text-slate-700">
                                      € {dossier.purchase_price.toLocaleString('nl-NL')}
                                    </span>
                                  </div>
                                )}
                                {dossier.estimated_value != null && (
                                  <div className="flex items-center justify-end space-x-2">
                                    <span className="text-xs text-slate-500">Geschatte waarde:</span>
                                    <span className="text-sm font-semibold text-slate-700">
                                      € {dossier.estimated_value.toLocaleString('nl-NL')}
                                    </span>
                                  </div>
                                )}
                                {dossier.handelsprijs != null && (
                                  <div className="flex items-center justify-end space-x-2">
                                    <span className="text-xs text-slate-500">Handelsprijs:</span>
                                    <span className="text-sm font-semibold text-blue-700">
                                      € {dossier.handelsprijs.toLocaleString('nl-NL')}
                                    </span>
                                  </div>
                                )}
                                {dossier.eindklantprijs != null && (
                                  <div className="flex items-center justify-end space-x-2">
                                    <span className="text-xs text-slate-500">Eindklantprijs:</span>
                                    <span className="text-sm font-semibold text-emerald-700">
                                      € {dossier.eindklantprijs.toLocaleString('nl-NL')}
                                    </span>
                                  </div>
                                )}
                                {dossier.sale_price != null && (
                                  <div className="flex items-center justify-end space-x-2">
                                    <span className="text-xs text-slate-500">Verkocht voor:</span>
                                    <span className="text-sm font-semibold text-red-600">
                                      € {dossier.sale_price.toLocaleString('nl-NL')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-6 text-sm text-slate-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span className="text-slate-500">{getDateLabel(statusFilter)}:</span>
                              <span>
                                {new Date(getRelevantDate(dossier, statusFilter)).toLocaleDateString('nl-NL', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            {dossier.user_profiles && (
                              <div>
                                <span className="text-slate-500">Door:</span>{' '}
                                {dossier.user_profiles.full_name}
                              </div>
                            )}
                          </div>
                        </div>

                        {dossier.photos && dossier.photos.length > 0 && (
                          <div className="flex-shrink-0">
                            <div className="flex space-x-2">
                              {dossier.photos.map((photo) => (
                                <div
                                  key={photo.id}
                                  className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                                >
                                  <img
                                    src={getPhotoUrl(photo.storage_path)}
                                    alt="Machine foto"
                                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showNewDossierModal && (
          <NewDossierModal
            onClose={() => setShowNewDossierModal(false)}
            onSuccess={(newDossierId) => {
              if (newDossierId) {
                onNavigate('dossier-detail', newDossierId);
              } else {
                loadDossiers();
              }
            }}
          />
        )}

        {showCopyModal && dossierToCopy && (
          <CopyDossierModal
            dossier={dossierToCopy}
            onClose={() => {
              setShowCopyModal(false);
              setDossierToCopy(null);
            }}
            onSuccess={(newDossierId) => {
              if (newDossierId) {
                onNavigate('dossier-detail', newDossierId);
              } else {
                loadDossiers();
              }
            }}
          />
        )}

        {showBulkOfferModal && (
          <BulkOfferModal
            onClose={() => setShowBulkOfferModal(false)}
            selectedDossierIds={Array.from(selectedDossiers)}
            onSuccess={handleBulkOfferSuccess}
          />
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">
                Dossiers verwijderen
              </h3>
              <p className="text-slate-600 mb-6">
                Weet je zeker dat je {selectedDossiers.size} {selectedDossiers.size === 1 ? 'dossier' : 'dossiers'} wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleDeleteDossiers}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Verwijderen...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Verwijderen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showBulkStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">
                Status wijzigen
              </h3>
              <p className="text-slate-600 mb-4">
                Wijzig de status van {selectedDossiers.size} {selectedDossiers.size === 1 ? 'dossier' : 'dossiers'}:
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nieuwe status
                </label>
                <select
                  value={bulkStatusValue}
                  onChange={(e) => {
                    setBulkStatusValue(e.target.value);
                    if (e.target.value !== 'sold') {
                      setCustomerName('');
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecteer een status</option>
                  <option value="stock">Stock</option>
                  <option value="open">Open</option>
                  <option value="bidding">Bieden actief</option>
                  <option value="sold">Verkocht</option>
                  <option value="archived">Gearchiveerd</option>
                </select>
              </div>
              {bulkStatusValue === 'sold' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Klantnaam <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Vul klantnaam in"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowBulkStatusModal(false);
                    setBulkStatusValue('');
                    setCustomerName('');
                  }}
                  disabled={updatingStatus}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleBulkStatusUpdate}
                  disabled={updatingStatus || !bulkStatusValue}
                  className="px-4 py-2 bg-[#0D3B52] hover:bg-[#1a5570] text-white rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
                >
                  {updatingStatus ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Bijwerken...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Status wijzigen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
