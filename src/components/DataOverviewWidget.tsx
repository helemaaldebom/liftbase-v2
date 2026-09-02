import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DataOverviewWidgetProps {
  onNavigate: (page: string, id?: string) => void;
}

interface DossierRecord {
  id: string;
  dossier_number: string;
  title: string;
  equipment_type: string;
  brand: string;
  model: string;
  year: number | null;
  hours: number | null;
  is_marktdata: boolean;
  status: string;
  handelsprijs: number | null;
  eindklantprijs: number | null;
  purchase_price: number | null;
  location: string | null;
  capacity_1st_row: number | null;
  capacity_kg: number | null;
}

function DataOverviewWidget({ onNavigate }: DataOverviewWidgetProps) {
  const { t } = useLanguage();
  const [records, setRecords] = useState<DossierRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DossierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  const [dataSource, setDataSource] = useState<'all' | 'dossier' | 'marktdata'>('all');
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedCapacity, setSelectedCapacity] = useState<string>('all');
  const [yearRange, setYearRange] = useState<{ min: number | ''; max: number | '' }>({ min: 1990, max: new Date().getFullYear() });
  const [hoursRange, setHoursRange] = useState<{ min: number | ''; max: number | '' }>({ min: 0, max: 50000 });
  const [capacityRange, setCapacityRange] = useState<{ min: number | ''; max: number | '' }>({ min: 0, max: 100000 });

  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableCapacities, setAvailableCapacities] = useState<number[]>([]);

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [records, dataSource, selectedEquipmentType, selectedBrand, selectedCapacity, yearRange, hoursRange, capacityRange]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dossiers')
        .select(`
          id,
          dossier_number,
          title,
          equipment_type,
          brand,
          model,
          year,
          hours,
          is_marktdata,
          status,
          handelsprijs,
          eindklantprijs,
          purchase_price,
          location,
          forklift_details(hours_on_clock, capacity_kg),
          empty_container_handler_details(hours_on_clock),
          reachstacker_details(hours_on_clock, capacity_1st_row),
          terminal_tractor_details(hours_on_clock)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedData = (data || []).map((record: any) => {
        const detailsHours =
          record.forklift_details?.hours_on_clock ||
          record.empty_container_handler_details?.hours_on_clock ||
          record.reachstacker_details?.hours_on_clock ||
          record.terminal_tractor_details?.hours_on_clock;

        return {
          id: record.id,
          dossier_number: record.dossier_number,
          title: record.title,
          equipment_type: record.equipment_type,
          brand: record.brand,
          model: record.model,
          year: record.year,
          hours: detailsHours || record.hours,
          is_marktdata: record.is_marktdata,
          status: record.status,
          handelsprijs: record.handelsprijs,
          eindklantprijs: record.eindklantprijs,
          purchase_price: record.purchase_price,
          location: record.location,
          capacity_1st_row: record.reachstacker_details?.capacity_1st_row || null,
          capacity_kg: record.forklift_details?.capacity_kg || null,
        };
      });

      setRecords(processedData);

      const brands = [...new Set(processedData.map(r => r.brand).filter(Boolean))].sort();
      setAvailableBrands(brands);

      // Get capacities based on selected equipment type
      // For reachstackers: use capacity_1st_row
      // For forklifts: use capacity_kg
      const reachstackerCapacities = processedData
        .filter(r => r.equipment_type === 'reachstacker' && r.capacity_1st_row)
        .map(r => r.capacity_1st_row);

      const forkliftCapacities = processedData
        .filter(r => (r.equipment_type === 'heavy_duty_forklift' || r.equipment_type === 'forklift') && r.capacity_kg)
        .map(r => r.capacity_kg);

      const allCapacities = [...new Set([...reachstackerCapacities, ...forkliftCapacities])]
        .filter(Boolean)
        .sort((a, b) => (a as number) - (b as number)) as number[];

      setAvailableCapacities(allCapacities);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];

    if (dataSource === 'dossier') {
      filtered = filtered.filter(r => !r.is_marktdata);
    } else if (dataSource === 'marktdata') {
      filtered = filtered.filter(r => r.is_marktdata);
    }

    if (selectedEquipmentType !== 'all') {
      filtered = filtered.filter(r => {
        if (selectedEquipmentType === 'heavy_duty_forklift') {
          return r.equipment_type === 'heavy_duty_forklift' || r.equipment_type === 'forklift';
        }
        return r.equipment_type === selectedEquipmentType;
      });
    }

    if (selectedBrand !== 'all') {
      filtered = filtered.filter(r => r.brand === selectedBrand);
    }

    if (selectedCapacity !== 'all') {
      if (selectedEquipmentType === 'reachstacker') {
        filtered = filtered.filter(r => r.capacity_1st_row === parseInt(selectedCapacity));
      }
    }

    // Apply capacity range filter for heavy duty forklifts
    // Een leeg min/max-veld betekent "geen grens"
    const lo = (v: number | '') => (v === '' ? -Infinity : v);
    const hi = (v: number | '') => (v === '' ? Infinity : v);

    if (selectedEquipmentType === 'heavy_duty_forklift') {
      filtered = filtered.filter(r => {
        if (r.capacity_kg === null) return true;
        return r.capacity_kg >= lo(capacityRange.min) && r.capacity_kg <= hi(capacityRange.max);
      });
    }

    filtered = filtered.filter(r => {
      if (!r.year) return true;
      return r.year >= lo(yearRange.min) && r.year <= hi(yearRange.max);
    });

    filtered = filtered.filter(r => {
      if (r.hours === null) return true;
      return r.hours >= lo(hoursRange.min) && r.hours <= hi(hoursRange.max);
    });

    setFilteredRecords(filtered);
  };

  const getEquipmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'heavy_duty_forklift': t('Heavy Duty Forklift'),
      'forklift': t('Heavy Duty Forklift'),
      'empty_container_handler': t('Empty Container Handler'),
      'reachstacker': t('Reachstacker'),
      'terminal_tractor': t('Terminal Tractor'),
      'other': t('Other')
    };
    return labels[type] || type;
  };

  const getStatusBadge = (record: DossierRecord) => {
    if (record.is_marktdata) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Marktdata
        </span>
      );
    }

    const statusColors: Record<string, string> = {
      'draft': 'bg-gray-100 text-gray-800',
      'stock': 'bg-green-100 text-green-800',
      'reserved': 'bg-yellow-100 text-yellow-800',
      'sold': 'bg-red-100 text-red-800',
      'archived': 'bg-slate-100 text-slate-800'
    };

    const colorClass = statusColors[record.status] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {record.status}
      </span>
    );
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-slate-600" />
          <h2 className="text-xl font-semibold text-slate-900">Data Overzicht</h2>
        </div>
        <p className="text-slate-600">Laden...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-slate-600" />
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Data Overzicht</h2>
              <p className="text-sm text-slate-600 mt-1">
                {filteredRecords.length} van {records.length} records
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="p-6 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Filters</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Databron
                </label>
                <select
                  value={dataSource}
                  onChange={(e) => setDataSource(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Alle data</option>
                  <option value="dossier">Alleen dossiers</option>
                  <option value="marktdata">Alleen marktdata</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type Machine
                </label>
                <select
                  value={selectedEquipmentType}
                  onChange={(e) => setSelectedEquipmentType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Alle types</option>
                  <option value="heavy_duty_forklift">Heavy Duty Forklift</option>
                  <option value="empty_container_handler">Empty Container Handler</option>
                  <option value="reachstacker">Reachstacker</option>
                  <option value="terminal_tractor">Terminal Tractor</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Merk
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Alle merken</option>
                  {availableBrands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              {selectedEquipmentType === 'reachstacker' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Hefcapaciteit 1e rij
                  </label>
                  <select
                    value={selectedCapacity}
                    onChange={(e) => setSelectedCapacity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Alle capaciteiten</option>
                    {availableCapacities
                      .filter(capacity => {
                        return records.some(r =>
                          r.equipment_type === 'reachstacker' &&
                          r.capacity_1st_row === capacity
                        );
                      })
                      .map(capacity => (
                        <option key={capacity} value={capacity.toString()}>
                          {capacity.toLocaleString('nl-NL')} kg
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}

              {selectedEquipmentType === 'heavy_duty_forklift' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Hefcapaciteit: {capacityRange.min === '' ? '' : capacityRange.min.toLocaleString('nl-NL')} - {capacityRange.max === '' ? '' : capacityRange.max.toLocaleString('nl-NL')} kg
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={capacityRange.min}
                      onChange={(e) => setCapacityRange({ ...capacityRange, min: e.target.value === '' ? '' : (parseInt(e.target.value) || 0) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Min kg"
                    />
                    <input
                      type="number"
                      value={capacityRange.max}
                      onChange={(e) => setCapacityRange({ ...capacityRange, max: e.target.value === '' ? '' : (parseInt(e.target.value) || 0) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Max kg"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bouwjaar: {yearRange.min} - {yearRange.max}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={yearRange.min}
                    onChange={(e) => setYearRange({ ...yearRange, min: e.target.value === '' ? '' : (parseInt(e.target.value) || 0) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={yearRange.max}
                    onChange={(e) => setYearRange({ ...yearRange, max: e.target.value === '' ? '' : (parseInt(e.target.value) || 0) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Urenstand: {hoursRange.min} - {hoursRange.max}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={hoursRange.min}
                    onChange={(e) => setHoursRange({ ...hoursRange, min: e.target.value === '' ? '' : (parseInt(e.target.value) || 0) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={hoursRange.max}
                    onChange={(e) => setHoursRange({ ...hoursRange, max: e.target.value === '' ? '' : (parseInt(e.target.value) || 0) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setDataSource('all');
                setSelectedEquipmentType('all');
                setSelectedBrand('all');
                setSelectedCapacity('all');
                setYearRange({ min: 1990, max: new Date().getFullYear() });
                setHoursRange({ min: 0, max: 50000 });
                setCapacityRange({ min: 0, max: 100000 });
              }}
              className="mt-4 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Reset filters
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Dossier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Machine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Capaciteit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Jaar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Uren
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Prijzen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Locatie
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                      Geen records gevonden met de geselecteerde filters
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      onClick={() => onNavigate('dossier-detail', record.id)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {record.dossier_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600">
                          {getEquipmentTypeLabel(record.equipment_type)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">
                          {record.brand} {record.model}
                        </div>
                        <div className="text-sm text-slate-500">
                          {record.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {record.equipment_type === 'reachstacker' && record.capacity_1st_row
                            ? `${record.capacity_1st_row.toLocaleString('nl-NL')} kg`
                            : (record.equipment_type === 'heavy_duty_forklift' || record.equipment_type === 'forklift') && record.capacity_kg
                            ? `${record.capacity_kg.toLocaleString('nl-NL')} kg`
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {record.year || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {record.hours ? record.hours.toLocaleString('nl-NL') : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs space-y-1">
                          {record.purchase_price && (
                            <div className="text-slate-600">
                              Inkoop: {formatCurrency(record.purchase_price)}
                            </div>
                          )}
                          {record.handelsprijs && (
                            <div className="text-slate-600">
                              Handel: {formatCurrency(record.handelsprijs)}
                            </div>
                          )}
                          {record.eindklantprijs && (
                            <div className="text-slate-600">
                              Eindklant: {formatCurrency(record.eindklantprijs)}
                            </div>
                          )}
                          {!record.purchase_price && !record.handelsprijs && !record.eindklantprijs && (
                            <div className="text-slate-400">-</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(record)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600">
                          {record.location || '-'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default DataOverviewWidget;
