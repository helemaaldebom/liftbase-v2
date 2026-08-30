import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, X } from 'lucide-react';

interface Customer {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  user_id?: string;
}

interface CustomerSelectorProps {
  value: string | null;
  customerId: string | null;
  onChange: (customerId: string | null, customerName: string | null) => void;
  disabled?: boolean;
}

export function CustomerSelector({ value, customerId, onChange, disabled = false }: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'select' | 'custom'>(customerId ? 'select' : value ? 'custom' : 'select');
  const [customName, setCustomName] = useState(value || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(customerId);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    // Update selected customer ID when prop changes
    if (customerId) {
      // Check if this is a real UUID (from database)
      const matchingCustomer = customers.find(c => {
        // Check if customer ID matches directly
        if (c.id === customerId) return true;
        // Check if it's a user-based customer (strip user_ prefix)
        if (c.id.startsWith('user_') && c.id.replace('user_', '') === customerId) return true;
        return false;
      });

      if (matchingCustomer) {
        setSelectedCustomerId(matchingCustomer.id);
        setMode('select');
      }
    } else if (value && !customerId) {
      // Custom name mode
      setMode('custom');
      setCustomName(value);
    }
  }, [customerId, value, customers]);

  const loadCustomers = async () => {
    try {
      // Fetch existing customers from customers table
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, company_name, contact_person, email, user_id')
        .eq('is_active', true)
        .order('company_name');

      // Fetch eindgebruikers from user_profiles
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
          if (!customerNameSet.has(normalizedName)) {
            allCustomers.push(customer);
            customerNameSet.add(normalizedName);
          }
        });
      }

      // Add eindgebruikers as virtual customers if they don't exist in customers table
      if (eindgebruikers) {
        for (const user of eindgebruikers) {
          const hasCustomerRecord = customersData?.some(c => c.user_id === user.id);
          if (!hasCustomerRecord) {
            const userName = user.full_name || user.email;
            const normalizedName = userName.trim().toLowerCase();
            if (!customerNameSet.has(normalizedName)) {
              allCustomers.push({
                id: `user_${user.id}`,
                company_name: userName,
                contact_person: user.full_name || '',
                email: user.email
              });
              customerNameSet.add(normalizedName);
            }
          }
        }
      }

      // Add customers from dossiers who don't exist in customers table or user_profiles
      if (dossierCustomers) {
        const uniqueDossierCustomers = Array.from(
          new Set(dossierCustomers.map(d => d.customer_name).filter(Boolean))
        );

        for (const customerName of uniqueDossierCustomers) {
          const normalizedName = customerName.trim().toLowerCase();
          if (!customerNameSet.has(normalizedName)) {
            allCustomers.push({
              id: `dossier_${customerName.replace(/\s+/g, '_')}`,
              company_name: customerName,
              contact_person: '',
              email: ''
            });
            customerNameSet.add(normalizedName);
          }
        }
      }

      // Sort all customers by company name
      allCustomers.sort((a, b) => a.company_name.localeCompare(b.company_name));

      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId === 'custom') {
      setMode('custom');
      setSelectedCustomerId(null);
      onChange(null, customName);
    } else if (selectedId) {
      const customer = customers.find(c => c.id === selectedId);
      setSelectedCustomerId(selectedId);

      // Determine the real customer_id to pass to the database
      let realCustomerId: string | null = null;

      if (selectedId.startsWith('dossier_')) {
        // This is a customer name from a dossier - don't pass a customer_id
        realCustomerId = null;
      } else if (selectedId.startsWith('user_')) {
        // This is an eindgebruiker - extract the user ID
        realCustomerId = selectedId.replace('user_', '');
      } else {
        // This is a real customer ID from the customers table
        realCustomerId = selectedId;
      }

      onChange(realCustomerId, customer?.company_name || null);
    } else {
      setSelectedCustomerId(null);
      onChange(null, null);
    }
  };

  const handleCustomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setCustomName(name);
    onChange(null, name || null);
  };

  const switchToSelect = () => {
    setMode('select');
    setCustomName('');
    setSelectedCustomerId(null);
    onChange(null, null);
  };

  if (loading) {
    return (
      <div className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500">
        Klanten laden...
      </div>
    );
  }

  if (mode === 'custom') {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={customName}
            onChange={handleCustomNameChange}
            disabled={disabled}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Vrije invoer klantnaam"
          />
          <button
            type="button"
            onClick={switchToSelect}
            disabled={disabled}
            className="px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition flex items-center gap-1"
            title="Selecteer uit maintenance dashboard"
          >
            <Building2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Vrije invoer - klik op het icoon om een klant uit het maintenance dashboard te selecteren
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={selectedCustomerId || ''}
        onChange={handleSelectChange}
        disabled={disabled}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Geen klant geselecteerd</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.company_name}
            {customer.contact_person && ` (${customer.contact_person})`}
          </option>
        ))}
        <option value="custom">--- Vrije invoer ---</option>
      </select>
      {customers.length === 0 && (
        <p className="text-xs text-slate-500">
          Geen klanten beschikbaar. Maak eerst klanten aan in het Maintenance Dashboard.
        </p>
      )}
    </div>
  );
}
