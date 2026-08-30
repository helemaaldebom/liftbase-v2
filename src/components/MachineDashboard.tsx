import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Gauge, DollarSign, FileText, Edit2, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MachineDashboardProps {
  dossierId: string;
  customerId: string;
  currency?: 'original' | 'EUR' | 'USD';
}

interface MaintenanceCosts {
  preventive_cost: number;
  corrective_cost: number;
  tires_cost: number;
  total_cost: number;
  cost_per_hour: number | null;
  document_count: number;
  line_item_count: number;
  latest_maintenance_date: string | null;
  primary_currency: string;
}

interface LineItem {
  id: string;
  line_number: number;
  description: string;
  amount_excl_vat: number;
  currency: string;
  category: string;
  category_confidence: number;
  service_interval_hours: number | null;
  meter_reading: number | null;
  modified_by_customer: boolean;
  document_id: string;
  document_date: string;
  supplier_name: string;
}

export default function MachineDashboard({ dossierId, customerId, currency = 'original' }: MachineDashboardProps) {
  const [costs, setCosts] = useState<MaintenanceCosts | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<string>('');
  const [showApplyToFleet, setShowApplyToFleet] = useState(false);
  const [lastEditedItem, setLastEditedItem] = useState<LineItem | null>(null);

  useEffect(() => {
    fetchData();
  }, [dossierId, currency]);

  const fetchData = async () => {
    setLoading(true);

    const { data: costsData } = await supabase
      .from('maintenance_costs_by_dossier')
      .select('*')
      .eq('dossier_id', dossierId)
      .single();

    if (costsData) {
      setCosts(costsData);
    }

    const { data: items } = await supabase
      .from('maintenance_line_items')
      .select(`
        *,
        maintenance_documents (
          document_date,
          supplier_name
        )
      `)
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: false });

    if (items) {
      const formattedItems = items.map(item => ({
        ...item,
        document_date: item.maintenance_documents?.document_date || null,
        supplier_name: item.maintenance_documents?.supplier_name || 'Unknown'
      }));
      setLineItems(formattedItems);
    }

    setLoading(false);
  };

  const handleEditCategory = async (lineItem: LineItem) => {
    setEditingLineId(lineItem.id);
    setEditCategory(lineItem.category);
  };

  const handleSaveCategory = async () => {
    if (!editingLineId) return;

    const lineItem = lineItems.find(item => item.id === editingLineId);
    if (!lineItem) return;

    const { error } = await supabase
      .from('maintenance_line_items')
      .update({
        category: editCategory,
        modified_by_customer: true,
        modified_at: new Date().toISOString(),
        original_category: lineItem.category,
        classified_by: 'user'
      })
      .eq('id', editingLineId);

    if (!error) {
      setLastEditedItem(lineItem);
      setShowApplyToFleet(true);
      setEditingLineId(null);
      fetchData();
    }
  };

  const handleApplyRuleToFleet = async (applyToFleet: boolean) => {
    if (!lastEditedItem) return;

    if (applyToFleet) {
      const { error } = await supabase
        .from('customer_classification_rules')
        .insert({
          customer_id: customerId,
          match_type: 'keyword',
          match_value: lastEditedItem.description.toLowerCase(),
          match_field: 'description',
          target_category: editCategory,
          confidence_boost: 0.30,
          created_from_line_item_id: lastEditedItem.id,
          is_active: true
        });

      if (!error) {
        alert('Rule created successfully! Future documents with similar descriptions will be automatically categorized.');
      }
    }

    setShowApplyToFleet(false);
    setLastEditedItem(null);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'preventive':
        return 'text-green-600 bg-green-50';
      case 'corrective':
        return 'text-red-600 bg-red-50';
      case 'tires':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatCurrency = (amount: number, curr: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!costs) {
    return (
      <div className="text-center p-8 text-gray-500">
        No maintenance data available for this machine
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showApplyToFleet && lastEditedItem && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Apply this correction to your fleet?
          </h4>
          <p className="text-sm text-blue-700 mb-4">
            Future documents with similar descriptions will be automatically categorized as "{editCategory}".
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => handleApplyRuleToFleet(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Yes, Apply to Fleet
            </button>
            <button
              onClick={() => handleApplyRuleToFleet(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              No, Just This Machine
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <span className="text-xs font-medium text-green-600">PREVENTIVE</span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(costs.preventive_cost, costs.primary_currency)}
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <span className="text-xs font-medium text-red-600">CORRECTIVE</span>
          </div>
          <p className="text-2xl font-bold text-red-900">
            {formatCurrency(costs.corrective_cost, costs.primary_currency)}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Gauge className="w-6 h-6 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">TIRES</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(costs.tires_cost, costs.primary_currency)}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 text-gray-600" />
            <span className="text-xs font-medium text-gray-600">TOTAL</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(costs.total_cost, costs.primary_currency)}
          </p>
          {costs.cost_per_hour && (
            <p className="text-sm text-gray-600 mt-1">
              {formatCurrency(costs.cost_per_hour, costs.primary_currency)}/hr
            </p>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Maintenance History</h3>
          <div className="text-sm text-gray-500">
            {costs.document_count} documents • {costs.line_item_count} line items
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Supplier</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Amount</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Category</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Hours</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lineItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.document_date ? new Date(item.document_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.supplier_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                    {item.description}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatCurrency(item.amount_excl_vat, item.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {editingLineId === item.id ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="text-xs px-2 py-1 border rounded"
                        >
                          <option value="preventive">Preventive</option>
                          <option value="corrective">Corrective</option>
                          <option value="tires">Tires</option>
                          <option value="unclassified">Unclassified</option>
                        </select>
                        <button onClick={handleSaveCategory} className="text-green-600 hover:text-green-700">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingLineId(null)} className="text-red-600 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.meter_reading || '-'}
                    {item.service_interval_hours && ` (${item.service_interval_hours}h)`}
                  </td>
                  <td className="px-4 py-3">
                    {!editingLineId && (
                      <button
                        onClick={() => handleEditCategory(item)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {lineItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No maintenance records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
