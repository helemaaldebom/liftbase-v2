import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator, TrendingUp, Euro, Filter, Calendar } from 'lucide-react';

interface MarktdataRecord {
  id: string;
  dossier_number: string;
  brand: string;
  model: string;
  year: number;
  hours: number | null;
  handelsprijs: number | null;
  eindklantprijs: number | null;
  marktdata_invoerdatum: string | null;
  created_at: string;
}

interface MarktdataResult {
  count: number;
  avg_handelsprijs: number;
  avg_eindklantprijs: number;
  min_handelsprijs: number;
  max_handelsprijs: number;
  min_eindklantprijs: number;
  max_eindklantprijs: number;
  records: MarktdataRecord[];
}

type SortColumn = 'year' | 'hours' | 'handelsprijs' | 'eindklantprijs' | 'marktdata_invoerdatum';
type SortDirection = 'asc' | 'desc';

interface TaxatieWidgetProps {
  onNavigate?: (page: string, id?: string) => void;
}

export function TaxatieWidget({ onNavigate }: TaxatieWidgetProps = {}) {
  const [equipmentType, setEquipmentType] = useState('heavy_duty_forklift');
  const [dataSource, setDataSource] = useState<'all' | 'dossier' | 'marktdata'>('all');
  const [merk, setMerk] = useState('');
  const [type, setType] = useState('');
  const [bouwjaarMin, setBouwjaarMin] = useState(1990);
  const [bouwjaarMax, setBouwjaarMax] = useState(2025);
  const [urenMin, setUrenMin] = useState(0);
  const [urenMax, setUrenMax] = useState(50000);
  const [capaciteitMin, setCapaciteitMin] = useState(0);
  const [capaciteitMax, setCapaciteitMax] = useState(50000);
  const [lastcentrumMin, setLastcentrumMin] = useState(0);
  const [lastcentrumMax, setLastcentrumMax] = useState(2000);
  const [capacityRow1Min, setCapacityRow1Min] = useState(0);
  const [capacityRow1Max, setCapacityRow1Max] = useState(100000);
  const [capacityRow2Min, setCapacityRow2Min] = useState(0);
  const [capacityRow2Max, setCapacityRow2Max] = useState(100000);
  const [capacityRow3Min, setCapacityRow3Min] = useState(0);
  const [capacityRow3Max, setCapacityRow3Max] = useState(100000);
  const [liftHeightMin, setLiftHeightMin] = useState(0);
  const [liftHeightMax, setLiftHeightMax] = useState(15000);
  const [doubleBox, setDoubleBox] = useState<boolean | null>(null);
  const [result, setResult] = useState<MarktdataResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [merkOptions, setMerkOptions] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>('marktdata_invoerdatum');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    loadMerkOptions();
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
  }, [equipmentType, dataSource, merk, type, bouwjaarMin, bouwjaarMax, urenMin, urenMax, capaciteitMin, capaciteitMax, lastcentrumMin, lastcentrumMax, capacityRow1Min, capacityRow1Max, capacityRow2Min, capacityRow2Max, capacityRow3Min, capacityRow3Max, liftHeightMin, liftHeightMax, doubleBox, sortColumn, sortDirection]);

  const loadMerkOptions = async () => {
    let query = supabase
      .from('dossiers')
      .select('brand')
      .not('brand', 'is', null)
      .order('brand');

    if (dataSource === 'dossier') {
      query = query.eq('is_marktdata', false);
    } else if (dataSource === 'marktdata') {
      query = query.eq('is_marktdata', true);
    }

    if (equipmentType === 'heavy_duty_forklift') {
      query = query.in('equipment_type', ['heavy_duty_forklift', 'forklift']);
    } else {
      query = query.eq('equipment_type', equipmentType);
    }

    const { data } = await query;

    if (data) {
      const unique = [...new Set(data.map((d) => d.brand).filter(Boolean))];
      setMerkOptions(unique as string[]);
    }
  };

  const loadTypeOptions = async () => {
    let query = supabase
      .from('dossiers')
      .select('model')
      .eq('brand', merk)
      .not('model', 'is', null)
      .order('model');

    if (dataSource === 'dossier') {
      query = query.eq('is_marktdata', false);
    } else if (dataSource === 'marktdata') {
      query = query.eq('is_marktdata', true);
    }

    if (equipmentType === 'heavy_duty_forklift') {
      query = query.in('equipment_type', ['heavy_duty_forklift', 'forklift']);
    } else {
      query = query.eq('equipment_type', equipmentType);
    }

    const { data } = await query;

    if (data) {
      const unique = [...new Set(data.map((d) => d.model).filter(Boolean))];
      setTypeOptions(unique as string[]);
    }
  };

  const calculateTaxatie = async () => {
    setLoading(true);
    try {
      console.log('[TaxatieWidget] Starting search with filters:', {
        equipmentType,
        dataSource,
        merk,
        type,
        bouwjaarMin,
        bouwjaarMax,
        urenMin,
        urenMax
      });

      let query = supabase
        .from('dossiers')
        .select(`
          id,
          dossier_number,
          brand,
          model,
          year,
          hours,
          handelsprijs,
          eindklantprijs,
          marktdata_invoerdatum,
          created_at,
          is_marktdata,
          equipment_type,
          forklift_details(hours_on_clock),
          empty_container_handler_details(hours_on_clock),
          reachstacker_details(hours_on_clock),
          terminal_tractor_details(hours_on_clock)
        `)
        .gte('year', bouwjaarMin)
        .lte('year', bouwjaarMax);

      if (dataSource === 'dossier') {
        console.log('[TaxatieWidget] Filtering for dossier data only (is_marktdata = false)');
        query = query.eq('is_marktdata', false);
      } else if (dataSource === 'marktdata') {
        console.log('[TaxatieWidget] Filtering for marktdata only (is_marktdata = true)');
        query = query.eq('is_marktdata', true);
      } else {
        console.log('[TaxatieWidget] Including all data (no is_marktdata filter)');
      }

      if (equipmentType === 'heavy_duty_forklift') {
        query = query.in('equipment_type', ['heavy_duty_forklift', 'forklift']);
      } else {
        query = query.eq('equipment_type', equipmentType);
      }

      if (merk) {
        query = query.eq('brand', merk);
      }

      if (type) {
        query = query.eq('model', type);
      }

      if (urenMax > 0 && urenMax < 50000) {
        query = query.gte('hours', urenMin).lte('hours', urenMax);
      }

      if (equipmentType === 'heavy_duty_forklift') {
        if (capaciteitMax > 0 && capaciteitMax < 50000) {
          query = query.gte('capaciteit', capaciteitMin).lte('capaciteit', capaciteitMax);
        }

        if (lastcentrumMax > 0 && lastcentrumMax < 2000) {
          query = query.or(`lastzwaartepunt.gte.${lastcentrumMin},load_center.gte.${lastcentrumMin}`)
                       .or(`lastzwaartepunt.lte.${lastcentrumMax},load_center.lte.${lastcentrumMax}`);
        }
      }

      if (equipmentType === 'reachstacker') {
        if (lastcentrumMax > 0 && lastcentrumMax < 2000) {
          query = query.or(`lastzwaartepunt.gte.${lastcentrumMin},load_center.gte.${lastcentrumMin}`)
                       .or(`lastzwaartepunt.lte.${lastcentrumMax},load_center.lte.${lastcentrumMax}`);
        }

        if (capacityRow1Max > 0 && capacityRow1Max < 100000) {
          query = query.gte('capacity_row1', capacityRow1Min).lte('capacity_row1', capacityRow1Max);
        }

        if (capacityRow2Max > 0 && capacityRow2Max < 100000) {
          query = query.gte('capacity_row2', capacityRow2Min).lte('capacity_row2', capacityRow2Max);
        }

        if (capacityRow3Max > 0 && capacityRow3Max < 100000) {
          query = query.gte('capacity_row3', capacityRow3Min).lte('capacity_row3', capacityRow3Max);
        }
      }

      if (equipmentType === 'empty_container_handler') {
        if (liftHeightMax > 0 && liftHeightMax < 15000) {
          query = query.gte('hefhoogte', liftHeightMin).lte('hefhoogte', liftHeightMax);
        }

        if (doubleBox !== null) {
          query = query.eq('double_box', doubleBox);
        }
      }

      // Apply sorting
      if (sortColumn === 'marktdata_invoerdatum') {
        query = query.order('marktdata_invoerdatum', { ascending: sortDirection === 'asc', nullsFirst: false })
                     .order('created_at', { ascending: sortDirection === 'asc' });
      } else {
        query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
      }

      const { data, error } = await query;

      if (error) {
        console.error('[TaxatieWidget] Query error:', error);
        throw error;
      }

      const processedData = (data || []).map((record: any) => {
        const detailsHours =
          record.forklift_details?.hours_on_clock ||
          record.empty_container_handler_details?.hours_on_clock ||
          record.reachstacker_details?.hours_on_clock ||
          record.terminal_tractor_details?.hours_on_clock;

        return {
          id: record.id,
          dossier_number: record.dossier_number,
          brand: record.brand,
          model: record.model,
          year: record.year,
          hours: detailsHours || record.hours,
          handelsprijs: record.handelsprijs,
          eindklantprijs: record.eindklantprijs,
          marktdata_invoerdatum: record.marktdata_invoerdatum,
          created_at: record.created_at,
        };
      });

      console.log('[TaxatieWidget] Query returned', processedData.length, 'records');
      if (processedData.length > 0) {
        console.log('[TaxatieWidget] Sample records:', processedData.slice(0, 3));
        console.log('[TaxatieWidget] Records with handelsprijs:', processedData.filter(d => d.handelsprijs).length);
        console.log('[TaxatieWidget] Records with eindklantprijs:', processedData.filter(d => d.eindklantprijs).length);
      } else {
        console.log('[TaxatieWidget] No records found with current filters');
      }

      if (processedData.length > 0) {
        const handelsprijzen = processedData.map((d) => d.handelsprijs).filter(Boolean) as number[];
        const eindklantprijzen = processedData.map((d) => d.eindklantprijs).filter(Boolean) as number[];

        setResult({
          count: processedData.length,
          avg_handelsprijs: handelsprijzen.length > 0 ? handelsprijzen.reduce((a, b) => a + b, 0) / handelsprijzen.length : 0,
          avg_eindklantprijs: eindklantprijzen.length > 0 ? eindklantprijzen.reduce((a, b) => a + b, 0) / eindklantprijzen.length : 0,
          min_handelsprijs: handelsprijzen.length > 0 ? Math.min(...handelsprijzen) : 0,
          max_handelsprijs: handelsprijzen.length > 0 ? Math.max(...handelsprijzen) : 0,
          min_eindklantprijs: eindklantprijzen.length > 0 ? Math.min(...eindklantprijzen) : 0,
          max_eindklantprijs: eindklantprijzen.length > 0 ? Math.max(...eindklantprijzen) : 0,
          records: processedData as MarktdataRecord[],
        });
      } else {
        setResult(null);
      }
    } catch (error) {
      console.error('Error calculating taxatie:', error);
      setResult(null);
    } finally {
      setLoading(false);
    }
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
      return <span className="ml-1 text-white/60">⇅</span>;
    }
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="mt-12 bg-white rounded-2xl shadow-lg border-t-4 border-[#0D3B52] p-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-[#0D3B52]/10 p-2 rounded-lg">
          <Calculator className="w-6 h-6 text-[#0D3B52]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#0D3B52]">Taxatie Tool</h3>
          <p className="text-slate-600 text-sm">
            Bepaal snel de gemiddelde handels- en verkoopwaarde op basis van marktdata
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-1.5 h-6 bg-[#0D3B52] rounded-full"></div>
            <h4 className="font-bold text-[#0D3B52] uppercase tracking-wide text-sm">Zoekfilters</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Type Equipment
              </label>
              <select
                value={equipmentType}
                onChange={(e) => {
                  setEquipmentType(e.target.value);
                  setMerk('');
                  setType('');
                }}
                className="w-full px-4 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D3B52] focus:border-[#0D3B52] transition-all duration-200"
              >
                <option value="heavy_duty_forklift">Heftruck</option>
                <option value="empty_container_handler">Empty Container Handler</option>
                <option value="reachstacker">Reachstacker</option>
                <option value="terminal_tractor">Terminal Tractor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Databron
              </label>
              <select
                value={dataSource}
                onChange={(e) => {
                  setDataSource(e.target.value as 'all' | 'dossier' | 'marktdata');
                  setMerk('');
                  setType('');
                }}
                className="w-full px-4 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D3B52] focus:border-[#0D3B52] transition-all duration-200"
              >
                <option value="all">Alle data</option>
                <option value="dossier">Dossier data (eigen prijsreferenties)</option>
                <option value="marktdata">Marktdata</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Merk (optioneel)
              </label>
              <select
                value={merk}
                onChange={(e) => {
                  setMerk(e.target.value);
                  setType('');
                }}
                className="w-full px-4 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D3B52] focus:border-[#0D3B52] transition-all duration-200"
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
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Type (optioneel)
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D3B52] focus:border-[#0D3B52] transition-all duration-200"
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Bouwjaar: {bouwjaarMin} - {bouwjaarMax}
              </label>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Min</label>
                  <input
                    type="range"
                    min="1990"
                    max="2025"
                    value={bouwjaarMin}
                    onChange={(e) => setBouwjaarMin(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Max</label>
                  <input
                    type="range"
                    min="1990"
                    max="2025"
                    value={bouwjaarMax}
                    onChange={(e) => setBouwjaarMax(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Uren: {urenMin.toLocaleString()} - {urenMax.toLocaleString()}
              </label>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Min</label>
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="1000"
                    value={urenMin}
                    onChange={(e) => setUrenMin(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Max</label>
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="1000"
                    value={urenMax}
                    onChange={(e) => setUrenMax(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                  />
                </div>
              </div>
            </div>
          </div>

          {equipmentType === 'heavy_duty_forklift' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Capaciteit (kg): {capaciteitMin.toLocaleString()} - {capaciteitMax.toLocaleString()}
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Min</label>
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      step="1000"
                      value={capaciteitMin}
                      onChange={(e) => setCapaciteitMin(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Max</label>
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      step="1000"
                      value={capaciteitMax}
                      onChange={(e) => setCapaciteitMax(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Lastcentrum (mm): {lastcentrumMin.toLocaleString()} - {lastcentrumMax.toLocaleString()}
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Min</label>
                    <input
                      type="range"
                      min="0"
                      max="2000"
                      step="50"
                      value={lastcentrumMin}
                      onChange={(e) => setLastcentrumMin(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Max</label>
                    <input
                      type="range"
                      min="0"
                      max="2000"
                      step="50"
                      value={lastcentrumMax}
                      onChange={(e) => setLastcentrumMax(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {equipmentType === 'reachstacker' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Capaciteit 1e rij (kg): {capacityRow1Min.toLocaleString()} - {capacityRow1Max.toLocaleString()}
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Min</label>
                    <input
                      type="range"
                      min="0"
                      max="100000"
                      step="1000"
                      value={capacityRow1Min}
                      onChange={(e) => setCapacityRow1Min(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Max</label>
                    <input
                      type="range"
                      min="0"
                      max="100000"
                      step="1000"
                      value={capacityRow1Max}
                      onChange={(e) => setCapacityRow1Max(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Capaciteit 2e rij (kg): {capacityRow2Min.toLocaleString()} - {capacityRow2Max.toLocaleString()}
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Min</label>
                    <input
                      type="range"
                      min="0"
                      max="100000"
                      step="1000"
                      value={capacityRow2Min}
                      onChange={(e) => setCapacityRow2Min(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Max</label>
                    <input
                      type="range"
                      min="0"
                      max="100000"
                      step="1000"
                      value={capacityRow2Max}
                      onChange={(e) => setCapacityRow2Max(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Capaciteit 3e rij (kg): {capacityRow3Min.toLocaleString()} - {capacityRow3Max.toLocaleString()}
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Min</label>
                    <input
                      type="range"
                      min="0"
                      max="100000"
                      step="1000"
                      value={capacityRow3Min}
                      onChange={(e) => setCapacityRow3Min(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Max</label>
                    <input
                      type="range"
                      min="0"
                      max="100000"
                      step="1000"
                      value={capacityRow3Max}
                      onChange={(e) => setCapacityRow3Max(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {equipmentType === 'empty_container_handler' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Hefhoogte (mm): {liftHeightMin.toLocaleString()} - {liftHeightMax.toLocaleString()}
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Min</label>
                    <input
                      type="range"
                      min="0"
                      max="15000"
                      step="500"
                      value={liftHeightMin}
                      onChange={(e) => setLiftHeightMin(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Max</label>
                    <input
                      type="range"
                      min="0"
                      max="15000"
                      step="500"
                      value={liftHeightMax}
                      onChange={(e) => setLiftHeightMax(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D3B52]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Double Box
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="doubleBox"
                      checked={doubleBox === null}
                      onChange={() => setDoubleBox(null)}
                      className="w-4 h-4 text-[#0D3B52] focus:ring-[#0D3B52] focus:ring-2"
                    />
                    <span className="text-sm text-slate-700">Alle</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="doubleBox"
                      checked={doubleBox === true}
                      onChange={() => setDoubleBox(true)}
                      className="w-4 h-4 text-[#0D3B52] focus:ring-[#0D3B52] focus:ring-2"
                    />
                    <span className="text-sm text-slate-700">Ja</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="doubleBox"
                      checked={doubleBox === false}
                      onChange={() => setDoubleBox(false)}
                      className="w-4 h-4 text-[#0D3B52] focus:ring-[#0D3B52] focus:ring-2"
                    />
                    <span className="text-sm text-slate-700">Nee</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-1.5 h-6 bg-emerald-600 rounded-full"></div>
            <h4 className="font-bold text-emerald-600 uppercase tracking-wide text-sm">Resultaten</h4>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#0D3B52]/20 border-t-[#0D3B52]"></div>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-[#0D3B52]/10 to-[#0D3B52]/5 rounded-xl p-4 border-2 border-[#0D3B52]/20">
                <p className="text-xs font-semibold text-[#0D3B52]/70 mb-1 uppercase tracking-wide">Aantal matches in database</p>
                <p className="text-3xl font-bold text-[#0D3B52]">{result.count}</p>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-xl border-2 border-slate-200 p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Euro className="w-5 h-5 text-emerald-600" />
                    <h5 className="font-bold text-slate-800">Handelswaarde</h5>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border-2 border-emerald-200 mb-3">
                    <p className="text-xs font-semibold text-emerald-700 mb-1 uppercase tracking-wide">Gemiddelde</p>
                    <p className="text-2xl font-bold text-emerald-900">
                      {formatCurrency(result.avg_handelsprijs)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Min</p>
                      <p className="text-sm font-bold text-slate-800">
                        {formatCurrency(result.min_handelsprijs)}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Max</p>
                      <p className="text-sm font-bold text-slate-800">
                        {formatCurrency(result.max_handelsprijs)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border-2 border-slate-200 p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Euro className="w-5 h-5 text-[#0D3B52]" />
                    <h5 className="font-bold text-slate-800">Eindklantprijs</h5>
                  </div>
                  <div className="bg-gradient-to-br from-[#0D3B52]/10 to-[#0D3B52]/5 rounded-lg p-4 border-2 border-[#0D3B52]/20 mb-3">
                    <p className="text-xs font-semibold text-[#0D3B52]/70 mb-1 uppercase tracking-wide">Gemiddelde</p>
                    <p className="text-2xl font-bold text-[#0D3B52]">
                      {formatCurrency(result.avg_eindklantprijs)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Min</p>
                      <p className="text-sm font-bold text-slate-800">
                        {formatCurrency(result.min_eindklantprijs)}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Max</p>
                      <p className="text-sm font-bold text-slate-800">
                        {formatCurrency(result.max_eindklantprijs)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border-2 border-amber-200">
                <p className="text-xs font-medium text-amber-900">
                  Deze waardes zijn gebaseerd op {result.count} vergelijkbare machine(s) in de marktdata database.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-sm font-medium">
                Geen marktdata gevonden met de huidige filters
              </p>
            </div>
          )}
        </div>
      </div>

      {result && result.records.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-1.5 h-6 bg-[#0D3B52] rounded-full"></div>
            <h4 className="font-bold text-[#0D3B52] uppercase tracking-wide text-sm">Prijshistorie</h4>
          </div>

          <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0D3B52] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Dossier</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Merk & Model</th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer hover:bg-[#0D3B52]/80 select-none"
                      onClick={() => handleSort('year')}
                    >
                      Bouwjaar<SortIcon column="year" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer hover:bg-[#0D3B52]/80 select-none"
                      onClick={() => handleSort('hours')}
                    >
                      Uren<SortIcon column="hours" />
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide cursor-pointer hover:bg-[#0D3B52]/80 select-none"
                      onClick={() => handleSort('handelsprijs')}
                    >
                      Handelswaarde<SortIcon column="handelsprijs" />
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide cursor-pointer hover:bg-[#0D3B52]/80 select-none"
                      onClick={() => handleSort('eindklantprijs')}
                    >
                      Eindklantprijs<SortIcon column="eindklantprijs" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer hover:bg-[#0D3B52]/80 select-none"
                      onClick={() => handleSort('marktdata_invoerdatum')}
                    >
                      Datum<SortIcon column="marktdata_invoerdatum" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {result.records.map((record, index) => (
                    <tr key={record.dossier_number} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 text-sm font-medium">
                        {onNavigate ? (
                          <button
                            onClick={() => onNavigate('dossier-detail', record.id)}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {record.dossier_number}
                          </button>
                        ) : (
                          <span className="text-[#0D3B52]">{record.dossier_number}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="font-medium">{record.brand}</div>
                        <div className="text-xs text-slate-500">{record.model}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {record.year}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {record.hours !== null ? record.hours.toLocaleString('nl-NL') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {record.handelsprijs !== null ? (
                          <span className="text-emerald-700">{formatCurrency(record.handelsprijs)}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {record.eindklantprijs !== null ? (
                          <span className="text-[#0D3B52]">{formatCurrency(record.eindklantprijs)}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {record.marktdata_invoerdatum
                              ? new Date(record.marktdata_invoerdatum).toLocaleDateString('nl-NL')
                              : new Date(record.created_at).toLocaleDateString('nl-NL')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
