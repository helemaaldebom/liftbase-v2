import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Download, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface FleetDashboardProps {
  customerId: string;
  currency?: 'original' | 'EUR' | 'USD';
}

interface MachineData {
  dossier_id: string;
  dossiernummer: string;
  merk: string;
  model: string;
  uren: number;
  preventive_cost: number;
  corrective_cost: number;
  tires_cost: number;
  total_cost: number;
  cost_per_hour: number | null;
  document_count: number;
  primary_currency: string;
}

interface FleetSummary {
  machine_count: number;
  total_documents: number;
  total_preventive: number;
  total_corrective: number;
  total_tires: number;
  total_cost: number;
  avg_cost_per_machine: number;
}

export default function FleetDashboard({ customerId, currency = 'original' }: FleetDashboardProps) {
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [machines, setMachines] = useState<MachineData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [customerId, currency]);

  const fetchData = async () => {
    setLoading(true);

    const { data: summaryData } = await supabase
      .from('maintenance_costs_by_fleet')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    if (summaryData) {
      setSummary(summaryData);
    }

    const { data: machinesData } = await supabase
      .from('maintenance_costs_by_dossier')
      .select(`
        *,
        dossiers (merk, model, uren)
      `)
      .eq('customer_id', customerId)
      .order('total_cost', { ascending: false });

    if (machinesData) {
      const formatted = machinesData.map(m => ({
        dossier_id: m.dossier_id,
        dossiernummer: m.dossiernummer,
        merk: m.dossiers?.merk || 'Unknown',
        model: m.dossiers?.model || 'Unknown',
        uren: m.dossiers?.uren || 0,
        preventive_cost: m.preventive_cost || 0,
        corrective_cost: m.corrective_cost || 0,
        tires_cost: m.tires_cost || 0,
        total_cost: m.total_cost || 0,
        cost_per_hour: m.cost_per_hour,
        document_count: m.document_count || 0,
        primary_currency: m.primary_currency || 'EUR'
      }));
      setMachines(formatted);
    }

    setLoading(false);
  };

  const exportToExcel = () => {
    const exportData = machines.map(m => ({
      'Dossier': m.dossiernummer,
      'Brand': m.merk,
      'Model': m.model,
      'Hours': m.uren,
      'Preventive': m.preventive_cost,
      'Corrective': m.corrective_cost,
      'Tires': m.tires_cost,
      'Total': m.total_cost,
      'Cost/Hour': m.cost_per_hour || 'N/A',
      'Documents': m.document_count,
      'Currency': m.primary_currency
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fleet Maintenance');
    XLSX.writeFile(wb, `fleet_maintenance_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatCurrency = (amount: number, curr: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr
    }).format(amount);
  };

  const topTenByCostPerHour = machines
    .filter(m => m.cost_per_hour !== null && m.cost_per_hour > 0)
    .sort((a, b) => (b.cost_per_hour || 0) - (a.cost_per_hour || 0))
    .slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Machines</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{summary.machine_count}</p>
              <p className="text-sm text-gray-500 mt-1">{summary.total_documents} documents</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <span className="text-xs font-medium text-green-600">PREVENTIVE</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(summary.total_preventive)}
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-6 h-6 text-red-600" />
                <span className="text-xs font-medium text-red-600">CORRECTIVE</span>
              </div>
              <p className="text-2xl font-bold text-red-900">
                {formatCurrency(summary.total_corrective)}
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-6 h-6 text-gray-600" />
                <span className="text-xs font-medium text-gray-600">TOTAL COST</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.total_cost)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Avg: {formatCurrency(summary.avg_cost_per_machine)}
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4">
              🏆 Top 10 Most Expensive Machines (by Cost per Hour)
            </h3>
            <div className="space-y-2">
              {topTenByCostPerHour.length > 0 ? (
                topTenByCostPerHour.map((machine, index) => (
                  <div key={machine.dossier_id} className="bg-white rounded p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {machine.dossiernummer} - {machine.merk} {machine.model}
                        </p>
                        <p className="text-sm text-gray-500">
                          {machine.uren.toLocaleString()} hours • {machine.document_count} documents
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-yellow-900">
                        {formatCurrency(machine.cost_per_hour || 0, machine.primary_currency)}/hr
                      </p>
                      <p className="text-sm text-gray-600">
                        Total: {formatCurrency(machine.total_cost, machine.primary_currency)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No machines with hour data available
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">All Machines</h3>
          <button
            onClick={exportToExcel}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Dossier</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Machine</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Hours</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Preventive</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Corrective</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Tires</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Total</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Cost/Hour</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Docs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {machines.map(machine => (
                <tr key={machine.dossier_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {machine.dossiernummer}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {machine.merk} {machine.model}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    {machine.uren.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                    {formatCurrency(machine.preventive_cost, machine.primary_currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                    {formatCurrency(machine.corrective_cost, machine.primary_currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">
                    {formatCurrency(machine.tires_cost, machine.primary_currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                    {formatCurrency(machine.total_cost, machine.primary_currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    {machine.cost_per_hour
                      ? formatCurrency(machine.cost_per_hour, machine.primary_currency)
                      : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-700">
                    {machine.document_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {machines.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No maintenance data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
