import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Download, Search, Filter, Eye, X, Settings, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ForkliftDetailsForm } from '../components/ForkliftDetailsForm';
import { EmptyContainerHandlerDetailsForm } from '../components/EmptyContainerHandlerDetailsForm';
import { ReachstackerDetailsForm } from '../components/ReachstackerDetailsForm';
import { TerminalTractorDetailsForm} from '../components/TerminalTractorDetailsForm';
import { MarktdataForkliftForm } from '../components/MarktdataForkliftForm';
import { MarktdataECHForm } from '../components/MarktdataECHForm';
import { MarktdataReachstackerForm } from '../components/MarktdataReachstackerForm';
import { MarktdataTerminalTractorForm } from '../components/MarktdataTerminalTractorForm';

interface MarktdataDatabasePageProps {
  onNavigate: (page: string, id?: string) => void;
}

interface MarktdataRecord {
  id: string;
  merk: string;
  type: string;
  equipment_type: string | null;
  bouwjaar: number;
  serienummer: string | null;
  brandstof: string | null;
  capaciteit: number | null;
  lastzwaartepunt: number | null;
  hefhoogte: number | null;
  vrije_hef: number | null;
  uren: number | null;
  masttype: string | null;
  aanbouwdeel: string | null;
  land: string | null;
  locatie: string | null;
  handelsprijs: number | null;
  eindklantprijs: number | null;
  verkoopdatum: string | null;
  marktdata_bron: string | null;
  marktdata_bron_url: string | null;
  marktdata_notities: string | null;
  marktdata_invoerdatum: string | null;
  created_at: string;
  marktdata_ingevoerd_door: string | null;
  is_marktdata: boolean | null;
  dossier_number: string;
  created_by_role: string | null;
  user_profiles?: {
    full_name: string;
  } | null;
  photos?: Array<{
    id: string;
    storage_path: string;
    filename: string;
  }>;
}

export function MarktdataDatabasePage({ onNavigate }: MarktdataDatabasePageProps) {
  const { profile } = useAuth();
  const [records, setRecords] = useState<MarktdataRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MarktdataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState({
    merk: '',
    type: '',
    equipmentType: '',
    brandstof: '',
    minCapaciteit: '',
    maxCapaciteit: '',
    minBouwjaar: '',
    maxBouwjaar: '',
    minPrijs: '',
    maxPrijs: '',
    minUren: '',
    maxUren: '',
    land: '',
    locatie: '',
    datumVan: '',
    datumTot: '',
    dossierNummer: ''
  });
  const [selectedRecord, setSelectedRecord] = useState<MarktdataRecord | null>(null);
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('marktdata_visible_columns');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      dossierNummer: true,
      merkType: true,
      bouwjaar: true,
      serienummer: false,
      brandstof: true,
      capaciteit: true,
      hefhoogte: false,
      vrijeHef: false,
      uren: true,
      masttype: false,
      aanbouwdeel: false,
      handelsprijs: true,
      eindklantprijs: true,
      verkoopdatum: false,
      land: true,
      locatie: false,
      bron: true,
      bronUrl: false,
      notities: false,
      invoerdatum: false,
      ingevoerdDoor: true
    };
  });

  useEffect(() => {
    loadMarktdata();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [records, searchTerm, filters]);

  useEffect(() => {
    localStorage.setItem('marktdata_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const columnDefinitions = [
    { key: 'dossierNummer', label: 'Dossiernummer' },
    { key: 'merkType', label: 'Merk / Type' },
    { key: 'bouwjaar', label: 'Bouwjaar' },
    { key: 'serienummer', label: 'Serienummer' },
    { key: 'brandstof', label: 'Brandstof' },
    { key: 'capaciteit', label: 'Capaciteit' },
    { key: 'lastcentrum', label: 'Lastcentrum' },
    { key: 'hefhoogte', label: 'Hefhoogte' },
    { key: 'vrijeHef', label: 'Vrije hef' },
    { key: 'uren', label: 'Uren' },
    { key: 'masttype', label: 'Masttype' },
    { key: 'aanbouwdeel', label: 'Aanbouwdeel' },
    { key: 'handelsprijs', label: 'Handelsprijs' },
    { key: 'eindklantprijs', label: 'Eindklantprijs' },
    { key: 'verkoopdatum', label: 'Verkoopdatum' },
    { key: 'land', label: 'Land' },
    { key: 'locatie', label: 'Locatie' },
    { key: 'bron', label: 'Bron' },
    { key: 'bronUrl', label: 'Bron URL' },
    { key: 'notities', label: 'Notities' },
    { key: 'invoerdatum', label: 'Invoerdatum' },
    { key: 'ingevoerdDoor', label: 'Ingevoerd door' }
  ];

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length + 1;

  const renderCellContent = (record: MarktdataRecord, columnKey: string) => {
    switch (columnKey) {
      case 'dossierNummer':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('dossier-detail', record.id);
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {record.dossier_number}
          </button>
        );
      case 'merkType':
        return (
          <>
            <div className="text-sm font-medium text-slate-900">{record.merk}</div>
            <div className="text-sm text-slate-500">{record.type}</div>
          </>
        );
      case 'bouwjaar':
        return record.bouwjaar;
      case 'serienummer':
        return record.serienummer || '-';
      case 'brandstof':
        return record.brandstof || '-';
      case 'capaciteit':
        return record.capaciteit ? `${record.capaciteit} kg` : '-';
      case 'lastcentrum':
        return record.lastzwaartepunt ? `${record.lastzwaartepunt} mm` : '-';
      case 'hefhoogte':
        return record.hefhoogte ? `${record.hefhoogte} mm` : '-';
      case 'vrijeHef':
        return record.vrije_hef ? `${record.vrije_hef} mm` : '-';
      case 'uren':
        return record.uren ? record.uren.toLocaleString() : '-';
      case 'masttype':
        return record.masttype || '-';
      case 'aanbouwdeel':
        return record.aanbouwdeel || '-';
      case 'handelsprijs':
        return record.handelsprijs
          ? `€ ${record.handelsprijs.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '-';
      case 'eindklantprijs':
        return record.eindklantprijs
          ? `€ ${record.eindklantprijs.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '-';
      case 'verkoopdatum':
        return record.verkoopdatum ? new Date(record.verkoopdatum).toLocaleDateString('nl-NL') : '-';
      case 'land':
        return record.land || '-';
      case 'locatie':
        return record.locatie || '-';
      case 'bron':
        if (record.created_by_role === 'eindgebruiker') {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Eindgebruiker Data
            </span>
          );
        }
        return record.marktdata_bron || '-';
      case 'bronUrl':
        return record.marktdata_bron_url ? (
          <a href={record.marktdata_bron_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
            Link
          </a>
        ) : '-';
      case 'notities':
        return record.marktdata_notities ? (
          <div className="max-w-xs truncate">{record.marktdata_notities}</div>
        ) : '-';
      case 'invoerdatum':
        return record.marktdata_invoerdatum
          ? new Date(record.marktdata_invoerdatum).toLocaleDateString('nl-NL')
          : new Date(record.created_at).toLocaleDateString('nl-NL');
      case 'ingevoerdDoor':
        return record.user_profiles
          ? `${record.user_profiles.full_name}`
          : '-';
      default:
        return '-';
    }
  };

  const loadMarktdata = async () => {
    try {
      // Fetch all dossiers with photos
      const { data: dossiersData, error } = await supabase
        .from('dossiers')
        .select(`
          *,
          photos(id, storage_path, filename)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading dossiers:', error);
        throw error;
      }

      if (!dossiersData) {
        setRecords([]);
        setFilteredRecords([]);
        setLoading(false);
        return;
      }

      // Then fetch all details tables separately
      const [forkliftRes, echRes, reachstackerRes, terminalTractorRes] = await Promise.all([
        supabase.from('forklift_details').select('*'),
        supabase.from('empty_container_handler_details').select('*'),
        supabase.from('reachstacker_details').select('*'),
        supabase.from('terminal_tractor_details').select('*')
      ]);

      // Create lookup maps
      const forkliftMap = new Map(forkliftRes.data?.map(d => [d.dossier_id, d]) || []);
      const echMap = new Map(echRes.data?.map(d => [d.dossier_id, d]) || []);
      const reachstackerMap = new Map(reachstackerRes.data?.map(d => [d.dossier_id, d]) || []);
      const terminalTractorMap = new Map(terminalTractorRes.data?.map(d => [d.dossier_id, d]) || []);

      // Merge data
      const data = dossiersData.map(dossier => ({
        ...dossier,
        forklift_details: forkliftMap.get(dossier.id) ? [forkliftMap.get(dossier.id)] : [],
        empty_container_handler_details: echMap.get(dossier.id) ? [echMap.get(dossier.id)] : [],
        reachstacker_details: reachstackerMap.get(dossier.id) ? [reachstackerMap.get(dossier.id)] : [],
        terminal_tractor_details: terminalTractorMap.get(dossier.id) ? [terminalTractorMap.get(dossier.id)] : []
      }));

      if (data) {
        const userIds = [...new Set(data.map(d => d.marktdata_ingevoerd_door).filter(Boolean))];

        let userProfiles: Record<string, { full_name: string }> = {};

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', userIds);

          if (profiles) {
            userProfiles = profiles.reduce((acc, p) => {
              acc[p.id] = { full_name: p.full_name };
              return acc;
            }, {} as Record<string, { full_name: string }>);
          }
        }

        const recordsWithProfiles = data.map(record => {
          const details =
            (record as any).forklift_details?.[0] ||
            (record as any).empty_container_handler_details?.[0] ||
            (record as any).reachstacker_details?.[0] ||
            (record as any).terminal_tractor_details?.[0] ||
            null;

          // Debug logging for HCL25-119
          if (record.dossier_number === 'HCL25-119') {
            const fd = (record as any).forklift_details;
            console.log('HCL25-119:', {
              forklift_details_is_array: Array.isArray(fd),
              forklift_details_length: fd?.length,
              forklift_details_raw: fd,
              first_item: fd?.[0],
              details_obj: details
            });
          }

          return {
            ...record,
            merk: record.brand,
            type: record.model,
            bouwjaar: record.year,
            serienummer: details?.serial_no ?? record.serial_number,
            brandstof: details?.power ?? record.fuel_type,
            capaciteit: details?.capacity_kg ?? (record.capacity ? parseInt(record.capacity) : null),
            lastzwaartepunt: details?.load_center_mm ?? record.load_center,
            hefhoogte: details?.lift_height_mm ?? record.lifting_height,
            vrije_hef: details?.free_lift ?? record.free_lift,
            uren: details?.hours_on_clock ?? record.hours,
            masttype: details?.mast_type ?? record.mast_type,
            aanbouwdeel: details?.attachment ?? record.attachment,
            land: record.country,
            locatie: record.location,
            handelsprijs: record.handelsprijs,
            eindklantprijs: record.eindklantprijs,
            verkoopdatum: record.sale_date,
            user_profiles: record.marktdata_ingevoerd_door
              ? userProfiles[record.marktdata_ingevoerd_door] || null
              : null
          };
        });

        setRecords(recordsWithProfiles);
      }
    } catch (error) {
      console.error('Error loading marktdata:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    try {
      let filtered = [...records];

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter((r) => {
          const searchableFields = [
            r.dossier_number,
            r.merk,
            r.type,
            r.serienummer,
            r.land,
            r.locatie,
            r.brandstof,
            r.masttype,
            r.aanbouwdeel,
            r.bouwjaar,
            r.capaciteit,
            r.uren,
            r.hefhoogte,
            r.lastzwaartepunt,
            r.vrije_hef,
            r.handelsprijs,
            r.eindklantprijs,
          ];

          return searchableFields.some(field =>
            field != null && String(field).toLowerCase().includes(search)
          );
        });
      }

      if (filters.merk) {
        filtered = filtered.filter((r) => r.merk && String(r.merk).toLowerCase().includes(filters.merk.toLowerCase()));
      }

      if (filters.type) {
        filtered = filtered.filter((r) => r.type && String(r.type).toLowerCase().includes(filters.type.toLowerCase()));
      }

      if (filters.equipmentType) {
        filtered = filtered.filter((r: any) => r.equipment_type === filters.equipmentType);
      }

      if (filters.brandstof) {
        filtered = filtered.filter((r) => r.brandstof && String(r.brandstof).toLowerCase().includes(filters.brandstof.toLowerCase()));
      }

      if (filters.minCapaciteit) {
        filtered = filtered.filter((r) => r.capaciteit && r.capaciteit >= parseInt(filters.minCapaciteit));
      }

      if (filters.maxCapaciteit) {
        filtered = filtered.filter((r) => r.capaciteit && r.capaciteit <= parseInt(filters.maxCapaciteit));
      }

      if (filters.minBouwjaar) {
        filtered = filtered.filter((r) => r.bouwjaar >= parseInt(filters.minBouwjaar));
      }

      if (filters.maxBouwjaar) {
        filtered = filtered.filter((r) => r.bouwjaar <= parseInt(filters.maxBouwjaar));
      }

      if (filters.minPrijs) {
        filtered = filtered.filter((r) =>
          (r.handelsprijs && r.handelsprijs >= parseFloat(filters.minPrijs)) ||
          (r.eindklantprijs && r.eindklantprijs >= parseFloat(filters.minPrijs))
        );
      }

      if (filters.maxPrijs) {
        filtered = filtered.filter((r) =>
          (r.handelsprijs && r.handelsprijs <= parseFloat(filters.maxPrijs)) ||
          (r.eindklantprijs && r.eindklantprijs <= parseFloat(filters.maxPrijs))
        );
      }

      if (filters.minUren) {
        filtered = filtered.filter((r) => r.uren && r.uren >= parseInt(filters.minUren));
      }

      if (filters.maxUren) {
        filtered = filtered.filter((r) => r.uren && r.uren <= parseInt(filters.maxUren));
      }

      if (filters.land) {
        filtered = filtered.filter((r) => r.land && String(r.land).toLowerCase().includes(filters.land.toLowerCase()));
      }

      if (filters.locatie) {
        filtered = filtered.filter((r) => r.locatie && String(r.locatie).toLowerCase().includes(filters.locatie.toLowerCase()));
      }

      if (filters.dossierNummer) {
        filtered = filtered.filter((r) => r.dossier_number && String(r.dossier_number).toLowerCase().includes(filters.dossierNummer.toLowerCase()));
      }

      if (filters.datumVan) {
        filtered = filtered.filter((r) => {
          const recordDate = new Date(r.marktdata_invoerdatum || r.created_at);
          return recordDate >= new Date(filters.datumVan);
        });
      }

      if (filters.datumTot) {
        filtered = filtered.filter((r) => {
          const recordDate = new Date(r.marktdata_invoerdatum || r.created_at);
          return recordDate <= new Date(filters.datumTot);
        });
      }

      setFilteredRecords(filtered);
    } catch (error) {
      console.error('Error in applyFilters:', error);
      setFilteredRecords([]);
    }
  };

  const canDelete = profile?.role === 'verkoper' || profile?.role === 'manager';

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    }
  };

  const toggleSelectRecord = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const idsToDelete = Array.from(selectedIds);

      const { error } = await supabase
        .from('dossiers')
        .delete()
        .in('id', idsToDelete);

      if (error) {
        console.error('Error deleting records:', error);
        alert('Er is een fout opgetreden bij het verwijderen van de records');
      } else {
        await loadMarktdata();
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
        alert(`${idsToDelete.length} record(s) succesvol verwijderd`);
      }
    } catch (error) {
      console.error('Error during bulk delete:', error);
      alert('Er is een fout opgetreden bij het verwijderen');
    } finally {
      setDeleting(false);
    }
  };

  const exportToExcel = () => {
    const headers = [
      'Merk', 'Type', 'Bouwjaar', 'Serienummer', 'Uren',
      'Capaciteit (kg)', 'Hefhoogte (mm)',
      'Handelsprijs (EUR)', 'Eindklantprijs (EUR)',
      'Verkoopdatum', 'Land', 'Locatie',
      'Bron', 'Bron URL', 'Notities',
      'Invoerdatum', 'Ingevoerd door'
    ];

    const rows = filteredRecords.map((r) => [
      r.merk,
      r.type,
      r.bouwjaar,
      r.serienummer || '',
      r.uren || '',
      r.capaciteit || '',
      r.hefhoogte || '',
      r.handelsprijs || '',
      r.eindklantprijs || '',
      r.verkoopdatum || '',
      r.land || '',
      r.locatie || '',
      r.marktdata_bron || '',
      r.marktdata_bron_url || '',
      r.marktdata_notities || '',
      r.marktdata_invoerdatum
        ? new Date(r.marktdata_invoerdatum).toLocaleDateString('nl-NL')
        : new Date(r.created_at).toLocaleDateString('nl-NL'),
      r.user_profiles
        ? `${r.user_profiles.full_name}`
        : ''
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `marktdata_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onNavigate('marktdata-invoeren')}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Terug
              </button>
              <h1 className="text-xl font-semibold text-slate-900">Marktdata Database</h1>
              <span className="text-sm text-slate-500">
                ({filteredRecords.length} van {records.length} records)
              </span>
            </div>
            <div className="flex items-center gap-3">
              {canDelete && selectedIds.size > 0 && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Verwijderen ({selectedIds.size})
                </button>
              )}
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
              >
                <Settings className="w-4 h-4" />
                Kolommen
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Export naar Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Dossiernummer
                </label>
                <input
                  type="text"
                  value={filters.dossierNummer}
                  onChange={(e) => setFilters({ ...filters, dossierNummer: e.target.value })}
                  placeholder="Bijv. 2024-001"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Zoeken
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Dossiernummer, merk, type, serienummer, land, locatie..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Merk
                </label>
                <input
                  type="text"
                  value={filters.merk}
                  onChange={(e) => setFilters({ ...filters, merk: e.target.value })}
                  placeholder="Bijv. Toyota"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type Model
                </label>
                <input
                  type="text"
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  placeholder="Bijv. 8FBN25"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Machine Type
                </label>
                <select
                  value={filters.equipmentType}
                  onChange={(e) => setFilters({ ...filters, equipmentType: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Alle types</option>
                  <option value="forklift">Forklift</option>
                  <option value="reachstacker">Reachstacker</option>
                  <option value="terminal_tractor">Terminal Tractor</option>
                  <option value="empty_container_handler">Empty Container Handler</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Brandstof
                </label>
                <select
                  value={filters.brandstof}
                  onChange={(e) => setFilters({ ...filters, brandstof: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Alle</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Elektrisch">Elektrisch</option>
                  <option value="LPG">LPG</option>
                  <option value="Hybride">Hybride</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Capaciteit (kg)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.minCapaciteit}
                    onChange={(e) => setFilters({ ...filters, minCapaciteit: e.target.value })}
                    placeholder="Min"
                    className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={filters.maxCapaciteit}
                    onChange={(e) => setFilters({ ...filters, maxCapaciteit: e.target.value })}
                    placeholder="Max"
                    className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bouwjaar
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.minBouwjaar}
                    onChange={(e) => setFilters({ ...filters, minBouwjaar: e.target.value })}
                    placeholder="Van"
                    className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={filters.maxBouwjaar}
                    onChange={(e) => setFilters({ ...filters, maxBouwjaar: e.target.value })}
                    placeholder="Tot"
                    className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Uren
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.minUren}
                    onChange={(e) => setFilters({ ...filters, minUren: e.target.value })}
                    placeholder="Min"
                    className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={filters.maxUren}
                    onChange={(e) => setFilters({ ...filters, maxUren: e.target.value })}
                    placeholder="Max"
                    className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prijs (EUR)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.minPrijs}
                    onChange={(e) => setFilters({ ...filters, minPrijs: e.target.value })}
                    placeholder="Min"
                    className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={filters.maxPrijs}
                    onChange={(e) => setFilters({ ...filters, maxPrijs: e.target.value })}
                    placeholder="Max"
                    className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Invoerdatum
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filters.datumVan}
                    onChange={(e) => setFilters({ ...filters, datumVan: e.target.value })}
                    className="w-1/2 px-2 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="date"
                    value={filters.datumTot}
                    onChange={(e) => setFilters({ ...filters, datumTot: e.target.value })}
                    className="w-1/2 px-2 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Land
                </label>
                <input
                  type="text"
                  value={filters.land}
                  onChange={(e) => setFilters({ ...filters, land: e.target.value })}
                  placeholder="Bijv. Nederland"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Locatie
                </label>
                <input
                  type="text"
                  value={filters.locatie}
                  onChange={(e) => setFilters({ ...filters, locatie: e.target.value })}
                  placeholder="Bijv. Rotterdam"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({
                      merk: '',
                      type: '',
                      equipmentType: '',
                      brandstof: '',
                      minCapaciteit: '',
                      maxCapaciteit: '',
                      minBouwjaar: '',
                      maxBouwjaar: '',
                      minPrijs: '',
                      maxPrijs: '',
                      minUren: '',
                      maxUren: '',
                      land: '',
                      locatie: '',
                      datumVan: '',
                      datumTot: '',
                      dossierNummer: ''
                    });
                  }}
                  className="w-full px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Reset Alle Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {showColumnSelector && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Zichtbare Kolommen</h3>
              <button
                onClick={() => setShowColumnSelector(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {columnDefinitions.map(col => (
                <label key={col.key} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.key]}
                    onChange={() => toggleColumn(col.key)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {canDelete && (
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                    </th>
                  )}
                  {columnDefinitions.map(col =>
                    visibleColumns[col.key] ? (
                      <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {col.label}
                      </th>
                    ) : null
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider sticky right-0 bg-slate-50 border-l border-slate-200">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumnCount} className="px-6 py-12 text-center text-slate-500">
                      Geen marktdata gevonden
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => {
                        setSelectedRecord(record);
                        setShowEquipmentForm(false);
                      }}
                    >
                      {canDelete && (
                        <td
                          className="px-6 py-4 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(record.id)}
                            onChange={() => toggleSelectRecord(record.id)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                        </td>
                      )}
                      {columnDefinitions.map(col =>
                        visibleColumns[col.key] ? (
                          <td key={col.key} className={`px-6 py-4 whitespace-nowrap text-sm ${
                            col.key === 'dossierNummer' || col.key === 'merkType' ? '' :
                            col.key === 'handelsprijs' || col.key === 'eindklantprijs' ? 'font-medium text-slate-900' :
                            'text-slate-600'
                          }`}>
                            {renderCellContent(record, col.key)}
                          </td>
                        ) : null
                      )}
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm sticky right-0 bg-white border-l border-slate-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(record);
                          setShowEquipmentForm(false);
                        }}
                      >
                        <button
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedRecord && showEquipmentForm && (
        <>
          {(selectedRecord.equipment_type === 'forklift' || selectedRecord.equipment_type === 'heavy_duty_forklift') && (
            <ForkliftDetailsForm
              dossierId={selectedRecord.id}
              dossierNumber={selectedRecord.dossier_number}
              dossierBrand={selectedRecord.merk}
              dossierModel={selectedRecord.type}
              dossierYear={selectedRecord.bouwjaar}
              dossierDescription={undefined}
              onClose={() => {
                setSelectedRecord(null);
                setShowEquipmentForm(false);
              }}
            />
          )}
          {selectedRecord.equipment_type === 'empty_container_handler' && (
            <EmptyContainerHandlerDetailsForm
              dossierId={selectedRecord.id}
              dossierNumber={selectedRecord.dossier_number}
              dossierBrand={selectedRecord.merk}
              dossierModel={selectedRecord.type}
              dossierYear={selectedRecord.bouwjaar}
              dossierDescription={undefined}
              onClose={() => {
                setSelectedRecord(null);
                setShowEquipmentForm(false);
              }}
            />
          )}
          {selectedRecord.equipment_type === 'reachstacker' && (
            <ReachstackerDetailsForm
              dossierId={selectedRecord.id}
              dossierNumber={selectedRecord.dossier_number}
              dossierBrand={selectedRecord.merk}
              dossierModel={selectedRecord.type}
              dossierYear={selectedRecord.bouwjaar}
              dossierDescription={undefined}
              onClose={() => {
                setSelectedRecord(null);
                setShowEquipmentForm(false);
              }}
            />
          )}
          {selectedRecord.equipment_type === 'terminal_tractor' && (
            <TerminalTractorDetailsForm
              dossierId={selectedRecord.id}
              dossierNumber={selectedRecord.dossier_number}
              dossierBrand={selectedRecord.merk}
              dossierModel={selectedRecord.type}
              dossierYear={selectedRecord.bouwjaar}
              dossierDescription={undefined}
              onClose={() => {
                setSelectedRecord(null);
                setShowEquipmentForm(false);
              }}
            />
          )}
        </>
      )}

      {selectedRecord && !showEquipmentForm && !showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-slate-900">
                  {selectedRecord.merk} {selectedRecord.type}
                </h3>
                <button
                  onClick={() => {
                    setSelectedRecord(null);
                    setShowEquipmentForm(false);
                    setShowEditForm(false);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 border-b pb-2">Basisgegevens</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Merk:</span>
                      <span className="ml-2 font-medium">{selectedRecord.merk}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Type:</span>
                      <span className="ml-2 font-medium">{selectedRecord.type}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Bouwjaar:</span>
                      <span className="ml-2 font-medium">{selectedRecord.bouwjaar}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Serienummer:</span>
                      <span className="ml-2 font-medium">{selectedRecord.serienummer || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Brandstof:</span>
                      <span className="ml-2 font-medium">{selectedRecord.brandstof || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Capaciteit:</span>
                      <span className="ml-2 font-medium">{selectedRecord.capaciteit ? `${selectedRecord.capaciteit} kg` : '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Lastzwaartepunt:</span>
                      <span className="ml-2 font-medium">{selectedRecord.lastzwaartepunt ? `${selectedRecord.lastzwaartepunt} mm` : '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Hefhoogte:</span>
                      <span className="ml-2 font-medium">{selectedRecord.hefhoogte ? `${selectedRecord.hefhoogte} mm` : '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Vrije hef:</span>
                      <span className="ml-2 font-medium">{selectedRecord.vrije_hef ? `${selectedRecord.vrije_hef} mm` : '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Uren:</span>
                      <span className="ml-2 font-medium">{selectedRecord.uren?.toLocaleString() || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Masttype:</span>
                      <span className="ml-2 font-medium">{selectedRecord.masttype || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Aanbouwdeel:</span>
                      <span className="ml-2 font-medium">{selectedRecord.aanbouwdeel || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Land:</span>
                      <span className="ml-2 font-medium">{selectedRecord.land || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Locatie:</span>
                      <span className="ml-2 font-medium">{selectedRecord.locatie || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 border-b pb-2">Prijsinformatie</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-slate-600">Handelsprijs:</span>
                      <div className="text-lg font-semibold text-green-600">
                        {selectedRecord.handelsprijs
                          ? `€ ${selectedRecord.handelsprijs.toLocaleString('nl-NL', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}`
                          : '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-slate-600">Eindklantprijs:</span>
                      <div className="text-lg font-semibold text-blue-600">
                        {selectedRecord.eindklantprijs
                          ? `€ ${selectedRecord.eindklantprijs.toLocaleString('nl-NL', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}`
                          : '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-slate-600">Verkoopdatum:</span>
                      <div className="font-medium">
                        {selectedRecord.verkoopdatum
                          ? new Date(selectedRecord.verkoopdatum).toLocaleDateString('nl-NL')
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 space-y-4">
                  <h4 className="font-semibold text-slate-900 border-b pb-2">Bron Informatie</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Bron:</span>
                      <span className="ml-2 font-medium">{selectedRecord.marktdata_bron || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Invoerdatum:</span>
                      <span className="ml-2 font-medium">
                        {selectedRecord.marktdata_invoerdatum
                          ? new Date(selectedRecord.marktdata_invoerdatum).toLocaleDateString('nl-NL')
                          : new Date(selectedRecord.created_at).toLocaleDateString('nl-NL')}
                      </span>
                    </div>
                    {selectedRecord.marktdata_bron_url && (
                      <div className="col-span-2">
                        <span className="text-slate-600">Bron URL:</span>
                        <a
                          href={selectedRecord.marktdata_bron_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:underline break-all"
                        >
                          {selectedRecord.marktdata_bron_url}
                        </a>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-600">Ingevoerd door:</span>
                      <span className="ml-2 font-medium">
                        {selectedRecord.user_profiles
                          ? `${selectedRecord.user_profiles.full_name}`
                          : '-'}
                      </span>
                    </div>
                  </div>
                  {selectedRecord.marktdata_notities && (
                    <div>
                      <span className="text-sm text-slate-600">Notities:</span>
                      <div className="mt-1 p-3 bg-slate-50 rounded-lg text-sm">
                        {selectedRecord.marktdata_notities}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Photos Section */}
              {selectedRecord.photos && selectedRecord.photos.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold text-slate-900 mb-4">Foto's</h4>
                  <div className="grid grid-cols-4 gap-4">
                    {selectedRecord.photos.map((photo) => {
                      const photoUrl = `${supabase.storage.from('dossier-photos').getPublicUrl(photo.storage_path).data.publicUrl}`;
                      return (
                        <div key={photo.id} className="relative group">
                          <img
                            src={photoUrl}
                            alt={photo.filename}
                            className="w-full h-32 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(photoUrl, '_blank')}
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-b-lg truncate opacity-0 group-hover:opacity-100 transition-opacity">
                            {photo.filename}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t flex justify-between">
                <button
                  onClick={() => {
                    console.log('=== BEWERKEN CLICKED ===');
                    console.log('selectedRecord:', selectedRecord);
                    console.log('is_marktdata:', selectedRecord.is_marktdata);
                    console.log('equipment_type:', selectedRecord.equipment_type);

                    // Always show edit form when in Marktdata Database
                    // Keep users in the marktdata section
                    console.log('Opening Marktdata Form');
                    setShowEditForm(true);
                  }}
                  className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Bewerken
                </button>
                <button
                  onClick={() => {
                    setSelectedRecord(null);
                    setShowEquipmentForm(false);
                    setShowEditForm(false);
                  }}
                  className="px-6 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedRecord && showEditForm && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
          {console.log('=== RENDERING EDIT FORM ===', 'equipment_type:', selectedRecord.equipment_type)}
          {!selectedRecord.equipment_type && (
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Equipment Type Niet Gevonden</h2>
                <p className="text-slate-600 mb-4">
                  Dit record heeft geen equipment_type: {String(selectedRecord.equipment_type)}
                </p>
                <button
                  onClick={() => {
                    setSelectedRecord(null);
                    setShowEditForm(false);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Sluiten
                </button>
              </div>
            </div>
          )}
          {(selectedRecord.equipment_type === 'forklift' || selectedRecord.equipment_type === 'heavy_duty_forklift') && (
            <MarktdataForkliftForm
              editDossierId={selectedRecord.id}
              onClose={() => {
                setSelectedRecord(null);
                setShowEditForm(false);
                loadMarktdata();
              }}
            />
          )}
          {selectedRecord.equipment_type === 'empty_container_handler' && (
            <MarktdataECHForm
              editDossierId={selectedRecord.id}
              onClose={() => {
                setSelectedRecord(null);
                setShowEditForm(false);
                loadMarktdata();
              }}
            />
          )}
          {selectedRecord.equipment_type === 'reachstacker' && (
            <MarktdataReachstackerForm
              editDossierId={selectedRecord.id}
              onClose={() => {
                setSelectedRecord(null);
                setShowEditForm(false);
                loadMarktdata();
              }}
            />
          )}
          {selectedRecord.equipment_type === 'terminal_tractor' && (
            <MarktdataTerminalTractorForm
              editDossierId={selectedRecord.id}
              onClose={() => {
                setSelectedRecord(null);
                setShowEditForm(false);
                loadMarktdata();
              }}
            />
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">
                Records Verwijderen
              </h3>
            </div>

            <p className="text-slate-600 mb-6">
              Weet je zeker dat je <strong>{selectedIds.size}</strong> record(s) wilt verwijderen?
              Deze actie kan niet ongedaan worden gemaakt.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verwijderen...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Verwijderen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
