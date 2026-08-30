import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator, TrendingUp, Euro, Filter } from 'lucide-react';
import { DossierNavbar } from '../components/DossierNavbar';

interface MarktdataResult {
  count: number;
  avg_handelsprijs: number;
  avg_eindklantprijs: number;
  min_handelsprijs: number;
  max_handelsprijs: number;
  min_eindklantprijs: number;
  max_eindklantprijs: number;
}

interface MarktdataRecord {
  id: string;
  brand: string;
  model: string;
  year: number;
  hours: number;
  handelsprijs: number;
  eindklantprijs: number;
  dossier_number: string;
  country: string | null;
  location: string | null;
  created_at?: string;
}

type SortColumn = 'year' | 'hours' | 'handelsprijs' | 'eindklantprijs' | 'created_at';
type SortDirection = 'asc' | 'desc';

export function TaxatiePage({ onNavigate }: { onNavigate: (page: string, id?: string) => void }) {
  const [equipmentType, setEquipmentType] = useState('heavy_duty_forklift');
  const [dataSource, setDataSource] = useState<'all' | 'dossier' | 'marktdata'>('all');
  const [merk, setMerk] = useState('');
  const [type, setType] = useState('');
  const [bouwjaarMin, setBouwjaarMin] = useState(1990);
  const [bouwjaarMax, setBouwjaarMax] = useState(2025);
  const [urenMin, setUrenMin] = useState(0);
  const [urenMax, setUrenMax] = useState(50000);
  const [capacityMin, setCapacityMin] = useState(15000);
  const [capacityMax, setCapacityMax] = useState(17000);
  const [loadCenterMin, setLoadCenterMin] = useState(0);
  const [loadCenterMax, setLoadCenterMax] = useState(2000);
  const [capacity2ndRow, setCapacity2ndRow] = useState('');
  const [capacity3rdRow, setCapacity3rdRow] = useState('');
  const [result, setResult] = useState<MarktdataResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [merkOptions, setMerkOptions] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [capacity2ndRowOptions, setCapacity2ndRowOptions] = useState<number[]>([]);
  const [capacity3rdRowOptions, setCapacity3rdRowOptions] = useState<number[]>([]);
  const [matchingRecords, setMatchingRecords] = useState<MarktdataRecord[]>([]);
  const [showRecords, setShowRecords] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>('year');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    loadMerkOptions();
    if (equipmentType === 'reachstacker') {
      loadCapacityOptions();
    } else {
      setCapacity2ndRowOptions([]);
      setCapacity3rdRowOptions([]);
      setCapacity2ndRow('');
      setCapacity3rdRow('');
    }
  }, [equipmentType, dataSource]);

  useEffect(() => {
    if (merk) {
      loadTypeOptions();
    } else {
      setTypeOptions([]);
      setType('');
    }
  }, [equipmentType, dataSource, merk]);

  useEffect(() => {
    calculateTaxatie();
  }, [equipmentType, dataSource, merk, type, bouwjaarMin, bouwjaarMax, urenMin, urenMax, capacityMin, capacityMax, loadCenterMin, loadCenterMax, capacity2ndRow, capacity3rdRow, sortColumn, sortDirection]);

  const getEquipmentTypes = (type: string): string[] => {
    if (type === 'heavy_duty_forklift') {
      return ['heavy_duty_forklift', 'forklift'];
    }
    return [type];
  };

  const loadMerkOptions = async () => {
    const equipmentTypes = getEquipmentTypes(equipmentType);
    let query = supabase
      .from('dossiers')
      .select('brand')
      .in('equipment_type', equipmentTypes)
      .not('brand', 'is', null);

    if (dataSource === 'dossier') {
      query = query.eq('is_marktdata', false);
    } else if (dataSource === 'marktdata') {
      query = query.eq('is_marktdata', true);
    }

    const { data } = await query.order('brand');

    if (data) {
      const unique = [...new Set(data.map((d) => d.brand).filter(Boolean))];
      setMerkOptions(unique as string[]);
    }
  };

  const loadTypeOptions = async () => {
    const equipmentTypes = getEquipmentTypes(equipmentType);
    let query = supabase
      .from('dossiers')
      .select('model')
      .in('equipment_type', equipmentTypes)
      .eq('brand', merk)
      .not('model', 'is', null);

    if (dataSource === 'dossier') {
      query = query.eq('is_marktdata', false);
    } else if (dataSource === 'marktdata') {
      query = query.eq('is_marktdata', true);
    }

    const { data } = await query.order('model');

    if (data) {
      const unique = [...new Set(data.map((d) => d.model).filter(Boolean))];
      setTypeOptions(unique as string[]);
    }
  };

  const loadCapacityOptions = async () => {
    const { data } = await supabase
      .from('reachstacker_details')
      .select('capacity_2nd_row, capacity_3rd_row');

    if (data) {
      const cap2nd = [...new Set(data.map((d) => d.capacity_2nd_row).filter(Boolean))].sort((a, b) => a - b);
      const cap3rd = [...new Set(data.map((d) => d.capacity_3rd_row).filter(Boolean))].sort((a, b) => a - b);
      setCapacity2ndRowOptions(cap2nd as number[]);
      setCapacity3rdRowOptions(cap3rd as number[]);
    }
  };

  const calculateTaxatie = async () => {
    setLoading(true);
    try {
      const equipmentTypes = getEquipmentTypes(equipmentType);

      // Fetch all dossiers with details
      let query = supabase
        .from('dossiers')
        .select('*')
        .in('equipment_type', equipmentTypes)
        .or('handelsprijs.not.is.null,eindklantprijs.not.is.null')
        .gte('year', bouwjaarMin)
        .lte('year', bouwjaarMax);

      if (dataSource === 'dossier') {
        query = query.eq('is_marktdata', false);
      } else if (dataSource === 'marktdata') {
        query = query.eq('is_marktdata', true);
      }

      if (merk) {
        query = query.eq('brand', merk);
      }

      if (type) {
        query = query.eq('model', type);
      }

      const { data: dossiersData, error } = await query;

      if (error) throw error;

      console.log('TaxatiePage - Initial dossiers fetched:', dossiersData?.length || 0);
      console.log('TaxatiePage - First 3 dossiers:', dossiersData?.slice(0, 3).map(d => ({
        id: d.id,
        dossier_number: d.dossier_number,
        capaciteit: d.capaciteit,
        equipment_type: d.equipment_type,
        is_marktdata: d.is_marktdata
      })));

      if (!dossiersData || dossiersData.length === 0) {
        console.log('TaxatiePage - No dossiers found with initial query');
        setResult(null);
        setMatchingRecords([]);
        setLoading(false);
        return;
      }

      // Fetch detail tables
      const [forkliftRes, echRes, reachstackerRes, terminalTractorRes] = await Promise.all([
        supabase.from('forklift_details').select('*'),
        supabase.from('empty_container_handler_details').select('*'),
        supabase.from('reachstacker_details').select('*'),
        supabase.from('terminal_tractor_details').select('*')
      ]);

      console.log('TaxatiePage - Forklift details fetched:', forkliftRes.data?.length || 0);
      console.log('TaxatiePage - First 3 forklift details:', forkliftRes.data?.slice(0, 3).map(d => ({
        dossier_id: d.dossier_id,
        capacity_kg: d.capacity_kg
      })));

      // Create lookup maps
      const forkliftMap = new Map(forkliftRes.data?.map(d => [d.dossier_id, d]) || []);
      const echMap = new Map(echRes.data?.map(d => [d.dossier_id, d]) || []);
      const reachstackerMap = new Map(reachstackerRes.data?.map(d => [d.dossier_id, d]) || []);
      const terminalTractorMap = new Map(terminalTractorRes.data?.map(d => [d.dossier_id, d]) || []);

      // Merge and filter data client-side
      let filtered = dossiersData.map(dossier => {
        const details =
          forkliftMap.get(dossier.id) ||
          echMap.get(dossier.id) ||
          reachstackerMap.get(dossier.id) ||
          terminalTractorMap.get(dossier.id) ||
          null;

        return {
          ...dossier,
          details,
          actualCapacity: details?.capacity_kg ?? dossier.capaciteit,
          actualLoadCenter: details?.load_center_mm ?? dossier.lastzwaartepunt,
          actualHours: details?.hours_on_clock ?? dossier.hours
        };
      });

      console.log('TaxatiePage - After merging:', filtered.length);
      console.log('TaxatiePage - Sample merged records:', filtered.slice(0, 3).map(r => ({
        dossier_number: r.dossier_number,
        actualCapacity: r.actualCapacity,
        capaciteit: r.capaciteit,
        details_capacity: r.details?.capacity_kg
      })));

      const beforeUrenFilter = filtered.length;
      // Apply client-side filters
      if (urenMax > 0) {
        filtered = filtered.filter(r => {
          const hours = r.actualHours;
          return hours != null && hours >= urenMin && hours <= urenMax;
        });
        console.log(`TaxatiePage - After uren filter (${urenMin}-${urenMax}): ${filtered.length} (removed ${beforeUrenFilter - filtered.length})`);
      }

      const beforeCapacityFilter = filtered.length;
      // Capacity filter
      if (equipmentTypes.includes('heavy_duty_forklift') || equipmentType === 'empty_container_handler' || equipmentType === 'terminal_tractor') {
        if (capacityMax > 0) {
          console.log(`TaxatiePage - Applying capacity filter: ${capacityMin}-${capacityMax}`);
          filtered = filtered.filter(r => {
            const capacity = r.actualCapacity;
            const passes = capacity != null && capacity >= capacityMin && capacity <= capacityMax;
            if (!passes && r.actualCapacity != null) {
              console.log(`TaxatiePage - Rejected ${r.dossier_number}: capacity ${capacity} not in range ${capacityMin}-${capacityMax}`);
            }
            return passes;
          });
          console.log(`TaxatiePage - After capacity filter: ${filtered.length} (removed ${beforeCapacityFilter - filtered.length})`);
        }
      }

      const beforeLoadCenterFilter = filtered.length;
      // Load center filter
      if (equipmentTypes.includes('heavy_duty_forklift') || equipmentType === 'empty_container_handler') {
        if (loadCenterMax > 0) {
          console.log(`TaxatiePage - Applying load center filter: ${loadCenterMin}-${loadCenterMax}`);
          filtered = filtered.filter(r => {
            const loadCenter = r.actualLoadCenter;
            return loadCenter != null && loadCenter >= loadCenterMin && loadCenter <= loadCenterMax;
          });
          console.log(`TaxatiePage - After load center filter: ${filtered.length} (removed ${beforeLoadCenterFilter - filtered.length})`);
        }
      }

      // Reachstacker capacity filters
      if (equipmentType === 'reachstacker' && (capacity2ndRow || capacity3rdRow)) {
        filtered = filtered.filter(r => {
          const reachDetails = reachstackerMap.get(r.id);
          if (!reachDetails) return false;

          if (capacity2ndRow && reachDetails.capacity_2nd_row !== parseInt(capacity2ndRow)) {
            return false;
          }
          if (capacity3rdRow && reachDetails.capacity_3rd_row !== parseInt(capacity3rdRow)) {
            return false;
          }
          return true;
        });
      }

      if (filtered.length === 0) {
        setResult(null);
        setMatchingRecords([]);
        setLoading(false);
        return;
      }

      // Sort records
      const sortedRecords = [...filtered].sort((a, b) => {
        let aVal, bVal;
        switch (sortColumn) {
          case 'year':
            aVal = a.year;
            bVal = b.year;
            break;
          case 'hours':
            aVal = a.actualHours || 0;
            bVal = b.actualHours || 0;
            break;
          case 'handelsprijs':
            aVal = a.handelsprijs || 0;
            bVal = b.handelsprijs || 0;
            break;
          case 'eindklantprijs':
            aVal = a.eindklantprijs || 0;
            bVal = b.eindklantprijs || 0;
            break;
          case 'created_at':
            aVal = new Date(a.created_at).getTime();
            bVal = new Date(b.created_at).getTime();
            break;
          default:
            aVal = 0;
            bVal = 0;
        }
        return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });

      setMatchingRecords(sortedRecords as any);
      const handelsprijzen = filtered.map((d) => d.handelsprijs).filter(Boolean) as number[];
      const eindklantprijzen = filtered.map((d) => d.eindklantprijs).filter(Boolean) as number[];

      setResult({
        count: filtered.length,
        avg_handelsprijs: handelsprijzen.reduce((a, b) => a + b, 0) / handelsprijzen.length,
        avg_eindklantprijs: eindklantprijzen.reduce((a, b) => a + b, 0) / eindklantprijzen.length,
        min_handelsprijs: Math.min(...handelsprijzen),
        max_handelsprijs: Math.max(...handelsprijzen),
        min_eindklantprijs: Math.min(...eindklantprijzen),
        max_eindklantprijs: Math.max(...eindklantprijzen),
      });
    } catch (error) {
      console.error('Error calculating taxatie:', error);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getEquipmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      heavy_duty_forklift: 'Heftruck',
      empty_container_handler: 'Empty Container Handler',
      reachstacker: 'Reachstacker',
      terminal_tractor: 'Terminal Tractor',
    };
    return labels[type] || type;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <span className="ml-1 text-slate-400">⇅</span>;
    }
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DossierNavbar onNavigate={onNavigate} activePage="taxatie" />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Calculator className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-800">Taxatie Tool <span className="text-xs text-green-600 font-mono bg-green-50 px-2 py-1 rounded">v2.0-UPDATED</span></h1>
          </div>
          <p className="text-slate-600">
            Bepaal snel de gemiddelde handels- en verkoopwaarde op basis van marktdata
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Filter className="w-5 h-5 text-slate-600" />
              <h2 className="text-xl font-semibold text-slate-800">Zoekfilters</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type Equipment
                </label>
                <select
                  value={equipmentType}
                  onChange={(e) => {
                    setEquipmentType(e.target.value);
                    setMerk('');
                    setType('');
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="heavy_duty_forklift">Heftruck</option>
                  <option value="empty_container_handler">Empty Container Handler</option>
                  <option value="reachstacker">Reachstacker</option>
                  <option value="terminal_tractor">Terminal Tractor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Databron
                </label>
                <select
                  value={dataSource}
                  onChange={(e) => {
                    setDataSource(e.target.value as 'all' | 'dossier' | 'marktdata');
                    setMerk('');
                    setType('');
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Alle data</option>
                  <option value="dossier">Dossier data (eigen prijsreferenties)</option>
                  <option value="marktdata">Marktdata</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Merk (optioneel)
                </label>
                <select
                  value={merk}
                  onChange={(e) => {
                    setMerk(e.target.value);
                    setType('');
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alle merken</option>
                  {merkOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {merk && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Type (optioneel)
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Alle types</option>
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(equipmentType === 'heavy_duty_forklift' || equipmentType === 'empty_container_handler' || equipmentType === 'terminal_tractor') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Capaciteit (kg): {capacityMin.toLocaleString()} - {capacityMax.toLocaleString()}
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500">MIN</label>
                      <input
                        type="range"
                        min="0"
                        max="50000"
                        step="1000"
                        value={capacityMin}
                        onChange={(e) => setCapacityMin(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">MAX</label>
                      <input
                        type="range"
                        min="0"
                        max="50000"
                        step="1000"
                        value={capacityMax}
                        onChange={(e) => setCapacityMax(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(equipmentType === 'heavy_duty_forklift' || equipmentType === 'empty_container_handler') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Lastcentrum (mm): {loadCenterMin.toLocaleString()} - {loadCenterMax.toLocaleString()}
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500">MIN</label>
                      <input
                        type="range"
                        min="0"
                        max="2000"
                        step="100"
                        value={loadCenterMin}
                        onChange={(e) => setLoadCenterMin(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">MAX</label>
                      <input
                        type="range"
                        min="0"
                        max="2000"
                        step="100"
                        value={loadCenterMax}
                        onChange={(e) => setLoadCenterMax(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {equipmentType === 'reachstacker' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Capaciteit 2e Rij (optioneel)
                    </label>
                    <select
                      value={capacity2ndRow}
                      onChange={(e) => setCapacity2ndRow(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Alle capaciteiten</option>
                      {capacity2ndRowOptions.map((cap) => (
                        <option key={cap} value={cap}>
                          {cap.toLocaleString('nl-NL')} kg
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Capaciteit 3e Rij (optioneel)
                    </label>
                    <select
                      value={capacity3rdRow}
                      onChange={(e) => setCapacity3rdRow(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Alle capaciteiten</option>
                      {capacity3rdRowOptions.map((cap) => (
                        <option key={cap} value={cap}>
                          {cap.toLocaleString('nl-NL')} kg
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bouwjaar: {bouwjaarMin} - {bouwjaarMax}
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500">MIN</label>
                    <input
                      type="range"
                      min="1990"
                      max="2025"
                      value={bouwjaarMin}
                      onChange={(e) => setBouwjaarMin(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">MAX</label>
                    <input
                      type="range"
                      min="1990"
                      max="2025"
                      value={bouwjaarMax}
                      onChange={(e) => setBouwjaarMax(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Uren: {urenMin.toLocaleString()} - {urenMax.toLocaleString()}
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500">MIN</label>
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      step="1000"
                      value={urenMin}
                      onChange={(e) => setUrenMin(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">MAX</label>
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      step="1000"
                      value={urenMax}
                      onChange={(e) => setUrenMax(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-slate-800">Resultaten</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : result ? (
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-700 mb-1">Aantal matches in database</p>
                  <p className="text-3xl font-bold text-blue-900">{result.count}</p>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Euro className="w-5 h-5 text-slate-600" />
                      <h3 className="font-semibold text-slate-800">Handelswaarde</h3>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200 mb-3">
                      <p className="text-sm text-green-700 mb-1">Gemiddelde</p>
                      <p className="text-2xl font-bold text-green-900">
                        {formatCurrency(result.avg_handelsprijs)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-xs text-slate-600 mb-1">Minimum</p>
                        <p className="text-lg font-semibold text-slate-800">
                          {formatCurrency(result.min_handelsprijs)}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-xs text-slate-600 mb-1">Maximum</p>
                        <p className="text-lg font-semibold text-slate-800">
                          {formatCurrency(result.max_handelsprijs)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Euro className="w-5 h-5 text-slate-600" />
                      <h3 className="font-semibold text-slate-800">Eindklantprijs</h3>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-3">
                      <p className="text-sm text-blue-700 mb-1">Gemiddelde</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {formatCurrency(result.avg_eindklantprijs)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-xs text-slate-600 mb-1">Minimum</p>
                        <p className="text-lg font-semibold text-slate-800">
                          {formatCurrency(result.min_eindklantprijs)}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-xs text-slate-600 mb-1">Maximum</p>
                        <p className="text-lg font-semibold text-slate-800">
                          {formatCurrency(result.max_eindklantprijs)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <p className="text-xs text-amber-800">
                    Deze waardes zijn gebaseerd op {result.count} vergelijkbare machine(s) in de marktdata database.
                    Gebruik deze waardes als indicatie voor je taxatie.
                  </p>
                </div>

                {matchingRecords.length > 0 && (
                  <button
                    onClick={() => setShowRecords(!showRecords)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    {showRecords ? 'Verberg' : 'Toon'} {matchingRecords.length} vergelijkbare machine(s)
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  Geen marktdata gevonden met de huidige filters
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  Probeer de filters aan te passen
                </p>
              </div>
            )}
          </div>
        </div>

        {showRecords && matchingRecords.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Vergelijkbare Machines ({matchingRecords.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dossiernummer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Merk / Model</th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('year')}
                    >
                      Bouwjaar<SortIcon column="year" />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('hours')}
                    >
                      Uren<SortIcon column="hours" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Locatie</th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('handelsprijs')}
                    >
                      Handelswaarde<SortIcon column="handelsprijs" />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('eindklantprijs')}
                    >
                      Eindklantprijs<SortIcon column="eindklantprijs" />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('created_at')}
                    >
                      Datum<SortIcon column="created_at" />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {matchingRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => onNavigate('dossier-detail', record.id)}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {record.dossier_number}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{record.brand}</div>
                        <div className="text-sm text-slate-500">{record.model}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {record.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {record.hours ? record.hours.toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {record.country && record.location ? `${record.country}, ${record.location}` : record.country || record.location || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(record.handelsprijs)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {formatCurrency(record.eindklantprijs)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {record.created_at ? new Date(record.created_at).toLocaleDateString('nl-NL') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
