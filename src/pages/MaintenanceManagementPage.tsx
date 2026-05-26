import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Key, Calendar, CheckCircle, XCircle, FileText, TrendingUp, TrendingDown, DollarSign, Package, X, ArrowLeft, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MaintenanceUpload from '../components/MaintenanceUpload';

interface MaintenanceManagementPageProps {
  onNavigate: (page: string) => void;
}

interface Customer {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

interface TemporaryAccess {
  id: string;
  dossier: {
    dossiernummer: string;
  };
  customer: {
    company_name: string;
  };
  expires_at: string;
  granted_at: string;
  revoked_at: string | null;
}

interface MaintenanceDocument {
  id: string;
  file_name: string;
  uploaded_at: string;
  extraction_status: string;
  match_status: string;
  serial_numbers: string[];
  supplier_name: string;
  document_date: string;
  total_amount: number;
  currency: string;
  customer: {
    company_name: string;
  };
  dossier: {
    dossiernummer: string;
  } | null;
}

interface CostStatistics {
  total_cost: number;
  preventive_cost: number;
  corrective_cost: number;
  tires_cost: number;
  document_count: number;
  avg_cost_per_document: number;
}

export default function MaintenanceManagementPage({ onNavigate }: MaintenanceManagementPageProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [temporaryAccesses, setTemporaryAccesses] = useState<TemporaryAccess[]>([]);
  const [documents, setDocuments] = useState<MaintenanceDocument[]>([]);
  const [statistics, setStatistics] = useState<CostStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedDossier, setSelectedDossier] = useState<string>('');
  const [expiryDays, setExpiryDays] = useState(30);
  const [selectedCustomerForUpload, setSelectedCustomerForUpload] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'customers' | 'documents' | 'dashboard'>('dashboard');
  const [realCustomerId, setRealCustomerId] = useState<string>('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [newCustomer, setNewCustomer] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    default_currency: 'EUR'
  });

  // Create real customer record for virtual customers (eindgebruikers or dossier customers)
  const ensureCustomerRecord = async (customerId: string): Promise<string> => {
    // If it's a virtual customer from user_profiles (starts with user_), create a real customer record
    if (customerId.startsWith('user_')) {
      const userId = customerId.replace('user_', '');

      // Get user details
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (!userData) {
        throw new Error('User not found');
      }

      // Create customer record
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          user_id: userId,
          company_name: userData.full_name || userData.email,
          contact_person: userData.full_name || '',
          email: userData.email,
          is_active: true,
          default_currency: 'EUR'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating customer record:', error);
        throw error;
      }

      return newCustomer.id;
    }

    // If it's a virtual customer from dossiers (starts with dossier_), create a real customer record
    if (customerId.startsWith('dossier_')) {
      // Find the original company name from the customers list
      const virtualCustomer = customers.find(c => c.id === customerId);
      if (!virtualCustomer) {
        throw new Error('Virtual customer not found');
      }

      // Create customer record
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          company_name: virtualCustomer.company_name,
          contact_person: '',
          email: '',
          is_active: true,
          default_currency: 'EUR'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating customer record:', error);
        throw error;
      }

      return newCustomer.id;
    }

    // If it's already a real customer, return it as is
    return customerId;
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When a customer is selected for upload, ensure they have a real customer record
  useEffect(() => {
    if (selectedCustomerForUpload) {
      ensureCustomerRecord(selectedCustomerForUpload).then(realId => {
        setRealCustomerId(realId);
      });
    } else {
      setRealCustomerId('');
    }
  }, [selectedCustomerForUpload]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch existing customers from customers table
    const { data: customersData } = await supabase
      .from('customers')
      .select('*')
      .order('company_name');

    // Fetch eindgebruikers from user_profiles who don't have a customer record yet
    const { data: eindgebruikers } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, active')
      .eq('role', 'eindgebruiker')
      .eq('active', true);

    // Fetch all unique customer names from dossiers
    const { data: dossierCustomers } = await supabase
      .from('dossiers')
      .select('customer_name')
      .not('customer_name', 'is', null)
      .neq('customer_name', '');

    // Combine all sources
    const allCustomers: Customer[] = [];
    const customerNameSet = new Set<string>();

    // Add existing customers (filter out duplicates within customers table)
    if (customersData) {
      customersData.forEach(customer => {
        const normalizedName = customer.company_name.trim().toLowerCase();
        // Only add if we haven't seen this name before
        if (!customerNameSet.has(normalizedName)) {
          allCustomers.push(customer);
          customerNameSet.add(normalizedName);
        }
      });
    }

    // Add eindgebruikers as virtual customers if they don't exist in customers table
    if (eindgebruikers) {
      for (const user of eindgebruikers) {
        // Check if this user already has a customer record
        const hasCustomerRecord = customersData?.some(c => c.user_id === user.id);
        if (!hasCustomerRecord) {
          const userName = user.full_name || user.email;
          // Create a virtual customer from user_profile
          allCustomers.push({
            id: `user_${user.id}`, // Prefix to distinguish from real customers
            company_name: userName,
            contact_person: user.full_name || '',
            email: user.email,
            phone: '',
            is_active: user.active,
            created_at: new Date().toISOString()
          } as Customer);
          customerNameSet.add(userName.trim().toLowerCase());
        }
      }
    }

    // Add customers from dossiers who don't exist in customers table or user_profiles
    if (dossierCustomers) {
      const uniqueDossierCustomers = Array.from(
        new Set(dossierCustomers.map(d => d.customer_name).filter(Boolean))
      ).sort();

      for (const customerName of uniqueDossierCustomers) {
        const normalizedName = customerName.trim().toLowerCase();
        if (!customerNameSet.has(normalizedName)) {
          // Create a virtual customer from dossier
          allCustomers.push({
            id: `dossier_${customerName.replace(/\s+/g, '_')}`,
            company_name: customerName,
            contact_person: '',
            email: '',
            phone: '',
            is_active: true,
            created_at: new Date().toISOString()
          } as Customer);
          customerNameSet.add(normalizedName);
        }
      }
    }

    // Sort all customers by company name
    allCustomers.sort((a, b) => a.company_name.localeCompare(b.company_name));

    setCustomers(allCustomers);

    const { data: accessData } = await supabase
      .from('temporary_dossier_access')
      .select(`
        *,
        dossier:dossiers(dossiernummer),
        customer:customers(company_name)
      `)
      .order('expires_at', { ascending: false });

    if (accessData) {
      setTemporaryAccesses(accessData as any);
    }

    const { data: documentsData, error: docsError } = await supabase
      .from('maintenance_documents')
      .select(`
        id,
        file_name,
        uploaded_at,
        extraction_status,
        match_status,
        serial_numbers,
        supplier_name,
        document_date,
        currency,
        customer_id,
        dossier:dossiers(dossiernummer)
      `)
      .order('uploaded_at', { ascending: false })
      .limit(50);

    if (docsError) {
      console.error('Error fetching documents:', docsError);
    }

    if (documentsData) {
      console.log('Raw documents data:', documentsData.length);
      const enrichedDocs = await Promise.all(
        documentsData.map(async (doc) => {
          try {
            const { data: lineItems } = await supabase
              .from('maintenance_line_items')
              .select('amount_excl_vat')
              .eq('document_id', doc.id);

            const totalAmount = lineItems?.reduce((sum, item) => sum + (item.amount_excl_vat || 0), 0) || 0;

            // Get customer info - use maybeSingle() to avoid errors if not found
            const { data: customerData, error: custError } = await supabase
              .from('customers')
              .select('company_name')
              .eq('id', doc.customer_id)
              .maybeSingle();

            if (custError) {
              console.error('Error fetching customer for doc:', doc.id, custError);
            }

            return {
              ...doc,
              total_amount: totalAmount,
              customer: customerData || { company_name: 'Unknown Customer' }
            };
          } catch (err) {
            console.error('Error enriching document:', doc.id, err);
            return {
              ...doc,
              total_amount: 0,
              customer: { company_name: 'Unknown Customer' }
            };
          }
        })
      );
      console.log('Enriched documents:', enrichedDocs);
      setDocuments(enrichedDocs as any);
    } else {
      console.log('No documents found in query');
    }

    await fetchStatistics();
    setLoading(false);
  };

  const fetchStatistics = async () => {
    const { data: lineItems } = await supabase
      .from('maintenance_line_items')
      .select('amount_excl_vat, category, currency');

    if (!lineItems) return;

    const stats: CostStatistics = {
      total_cost: 0,
      preventive_cost: 0,
      corrective_cost: 0,
      tires_cost: 0,
      document_count: 0,
      avg_cost_per_document: 0
    };

    lineItems.forEach(item => {
      const amount = item.amount_excl_vat || 0;
      stats.total_cost += amount;

      if (item.category === 'preventive') {
        stats.preventive_cost += amount;
      } else if (item.category === 'corrective') {
        stats.corrective_cost += amount;
      } else if (item.category === 'tires') {
        stats.tires_cost += amount;
      }
    });

    const { count } = await supabase
      .from('maintenance_documents')
      .select('id', { count: 'exact', head: true });

    stats.document_count = count || 0;
    stats.avg_cost_per_document = stats.document_count > 0 ? stats.total_cost / stats.document_count : 0;

    setStatistics(stats);
  };


  const handleGrantTemporaryAccess = async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase
      .from('temporary_dossier_access')
      .insert({
        dossier_id: selectedDossier,
        customer_id: selectedCustomer,
        granted_by: userData.user.id,
        expires_at: expiresAt.toISOString()
      });

    if (!error) {
      setShowAccessModal(false);
      setSelectedCustomer('');
      setSelectedDossier('');
      fetchData();
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    const { error } = await supabase
      .from('temporary_dossier_access')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', accessId);

    if (!error) {
      fetchData();
    }
  };

  const handleToggleCustomerStatus = async (customerId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('customers')
      .update({ is_active: !currentStatus })
      .eq('id', customerId);

    if (!error) {
      fetchData();
    }
  };

  const handleConvertToRealCustomer = (customer: Customer) => {
    // Pre-fill the form with existing data
    setNewCustomer({
      company_name: customer.company_name,
      contact_person: customer.contact_person || '',
      email: customer.email || '',
      phone: customer.phone || '',
      default_currency: 'EUR'
    });
    setEditingCustomer(customer);
    setShowNewCustomerModal(true);
  };

  const handleSaveCustomer = async () => {
    if (editingCustomer) {
      // Converting virtual customer to real customer
      const { data: newCustomerData, error: insertError } = await supabase
        .from('customers')
        .insert({
          company_name: newCustomer.company_name,
          contact_person: newCustomer.contact_person,
          email: newCustomer.email,
          phone: newCustomer.phone,
          default_currency: newCustomer.default_currency,
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating customer:', insertError);
        return;
      }

      // If this was a dossier customer, update all dossiers to use the exact same name
      if (editingCustomer.id.startsWith('dossier_')) {
        await supabase
          .from('dossiers')
          .update({ customer_name: newCustomer.company_name })
          .eq('customer_name', editingCustomer.company_name);
      }

      setShowNewCustomerModal(false);
      setEditingCustomer(null);
      setNewCustomer({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        default_currency: 'EUR'
      });
      fetchData();
    } else {
      // Creating new customer
      const { error } = await supabase
        .from('customers')
        .insert(newCustomer);

      if (!error) {
        setShowNewCustomerModal(false);
        setNewCustomer({
          company_name: '',
          contact_person: '',
          email: '',
          phone: '',
          default_currency: 'EUR'
        });
        fetchData();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Terug naar Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Maintenance Cost Dashboard</h1>
          <p className="text-gray-600">Track maintenance costs and manage customer documents</p>
        </div>

        <div className="mb-6 flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'dashboard'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'documents'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'customers'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Customers
          </button>
        </div>

        {activeTab === 'dashboard' && statistics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Cost</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      €{statistics.total_cost.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <DollarSign className="w-12 h-12 text-blue-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Preventive</p>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                      €{statistics.preventive_cost.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Corrective</p>
                    <p className="text-2xl font-bold text-red-600 mt-2">
                      €{statistics.corrective_cost.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <TrendingDown className="w-12 h-12 text-red-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tires</p>
                    <p className="text-2xl font-bold text-orange-600 mt-2">
                      €{statistics.tires_cost.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Package className="w-12 h-12 text-orange-600 opacity-20" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Preventive</span>
                      <span className="font-medium text-gray-900">
                        {((statistics.preventive_cost / statistics.total_cost) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(statistics.preventive_cost / statistics.total_cost) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Corrective</span>
                      <span className="font-medium text-gray-900">
                        {((statistics.corrective_cost / statistics.total_cost) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{ width: `${(statistics.corrective_cost / statistics.total_cost) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Tires</span>
                      <span className="font-medium text-gray-900">
                        {((statistics.tires_cost / statistics.total_cost) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full"
                        style={{ width: `${(statistics.tires_cost / statistics.total_cost) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Documents</span>
                    <span className="font-semibold text-gray-900">{statistics.document_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Cost/Document</span>
                    <span className="font-semibold text-gray-900">
                      €{statistics.avg_cost_per_document.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Customers</span>
                    <span className="font-semibold text-gray-900">
                      {customers.filter(c => c.is_active).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Documents</h3>
                <button
                  onClick={() => setActiveTab('documents')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All
                </button>
              </div>
              <div className="space-y-2">
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No documents uploaded yet</p>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="mt-3 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Upload your first document
                    </button>
                  </div>
                ) : (
                  documents.slice(0, 10).map(doc => (
                    <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{doc.file_name}</p>
                            <p className="text-sm text-gray-500">
                              {doc.customer?.company_name} • {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {doc.total_amount > 0 ? (
                            <>
                              <p className="font-semibold text-gray-900">
                                €{doc.total_amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-gray-500">{doc.currency}</p>
                            </>
                          ) : (
                            <p className="text-xs text-gray-500">No cost data</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Maintenance Documents</h2>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Document</span>
                </button>
              </div>

              <div className="space-y-2">
                {documents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg mb-2">No maintenance documents yet</p>
                    <p className="text-sm mb-4">Upload documents to track maintenance costs and history</p>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Upload First Document
                    </button>
                  </div>
                ) : (
                  documents.map(doc => (
                    <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                        <FileText className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <p className="font-medium text-gray-900">{doc.file_name}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {doc.customer?.company_name}
                          </p>
                          {doc.serial_numbers && doc.serial_numbers.length > 0 && (
                            <p className="text-sm text-gray-500 mt-1">
                              Serial: {doc.serial_numbers.join(', ')}
                            </p>
                          )}
                          {doc.supplier_name && (
                            <p className="text-sm text-gray-500">
                              Supplier: {doc.supplier_name}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                doc.extraction_status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : doc.extraction_status === 'processing'
                                  ? 'bg-blue-100 text-blue-800'
                                  : doc.extraction_status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : doc.extraction_status === 'manual_review_required'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {doc.extraction_status === 'manual_review_required' ? 'Manual Review' : doc.extraction_status}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                doc.match_status === 'matched'
                                  ? 'bg-green-100 text-green-800'
                                  : doc.match_status === 'ambiguous'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {doc.match_status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {doc.total_amount > 0 ? (
                          <p className="font-semibold text-gray-900">
                            €{doc.total_amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">No cost data</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                        {doc.dossier && (
                          <p className="text-xs text-blue-600 mt-1">
                            {doc.dossier.dossiernummer}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Customers</h2>
                <button
                  onClick={() => setShowNewCustomerModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Customer</span>
                </button>
              </div>

              <div className="space-y-2">
                {customers.map(customer => {
                  const isVirtual = customer.id.startsWith('dossier_') || customer.id.startsWith('user_');
                  const isRealCustomer = !isVirtual;

                  return (
                    <div
                      key={customer.id}
                      className={`border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 ${
                        isVirtual ? 'border-yellow-300 bg-yellow-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <Users className={`w-6 h-6 ${isVirtual ? 'text-yellow-500' : 'text-gray-400'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{customer.company_name}</h3>
                            {isVirtual && (
                              <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                                Niet volledig
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{customer.contact_person || '-'}</p>
                          <p className="text-sm text-gray-500">{customer.email || '-'}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isVirtual ? (
                          <button
                            onClick={() => handleConvertToRealCustomer(customer)}
                            className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            title="Converteer naar volledige klant met contactgegevens"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>Gegevens toevoegen</span>
                          </button>
                        ) : (
                          <>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                customer.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {customer.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              onClick={() => handleToggleCustomerStatus(customer.id, customer.is_active)}
                              className="p-2 hover:bg-gray-100 rounded"
                            >
                              {customer.is_active ? (
                                <XCircle className="w-4 h-4 text-red-600" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Temporary Access</h2>
                <button
                  onClick={() => setShowAccessModal(true)}
                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {temporaryAccesses.slice(0, 10).map(access => {
                  const isExpired = new Date(access.expires_at) < new Date();
                  const isRevoked = access.revoked_at !== null;

                  return (
                    <div
                      key={access.id}
                      className={`border rounded p-3 ${
                        isExpired || isRevoked ? 'bg-gray-50' : 'bg-blue-50'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {access.dossier?.dossiernummer}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {access.customer?.company_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Expires: {new Date(access.expires_at).toLocaleDateString()}
                      </div>
                      {!isExpired && !isRevoked && (
                        <button
                          onClick={() => handleRevokeAccess(access.id)}
                          className="text-xs text-red-600 hover:text-red-700 mt-2"
                        >
                          Revoke
                        </button>
                      )}
                      {(isExpired || isRevoked) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {isRevoked ? 'Revoked' : 'Expired'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {editingCustomer ? 'Klantgegevens aanvullen' : 'New Customer'}
            </h3>
            {editingCustomer && (
              <p className="text-sm text-gray-600 mb-4">
                Voeg contactgegevens toe voor: <span className="font-semibold">{editingCustomer.company_name}</span>
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={newCustomer.company_name}
                  onChange={e => setNewCustomer({ ...newCustomer, company_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={newCustomer.contact_person}
                  onChange={e => setNewCustomer({ ...newCustomer, contact_person: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Currency
                </label>
                <select
                  value={newCustomer.default_currency}
                  onChange={e => setNewCustomer({ ...newCustomer, default_currency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewCustomerModal(false);
                  setEditingCustomer(null);
                  setNewCustomer({
                    company_name: '',
                    contact_person: '',
                    email: '',
                    phone: '',
                    default_currency: 'EUR'
                  });
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomer}
                disabled={!newCustomer.company_name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingCustomer ? 'Opslaan' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Upload Maintenance Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Customer *
              </label>
              <select
                value={selectedCustomerForUpload}
                onChange={(e) => setSelectedCustomerForUpload(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">-- Select Customer --</option>
                {customers
                  .filter(c => c.is_active)
                  .map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.company_name}
                    </option>
                  ))}
              </select>
            </div>

            {selectedCustomerForUpload && realCustomerId && (
              <MaintenanceUpload
                customerId={realCustomerId}
                onUploadComplete={() => {
                  setShowUploadModal(false);
                  setSelectedCustomerForUpload('');
                  setRealCustomerId('');
                  fetchData();
                }}
              />
            )}

            {selectedCustomerForUpload && !realCustomerId && (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Creating customer record...
              </div>
            )}

            {!selectedCustomerForUpload && (
              <div className="text-center py-8 text-gray-500">
                Please select a customer to upload documents
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
