import { useState, useEffect, useRef } from 'react';
import { Search, FileText, Database, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

interface SearchResult {
  id: string;
  type: 'dossier' | 'marktdata';
  dossier_number: string;
  title: string;
  merk: string;
  type_model: string;
  serienummer: string | null;
  bouwjaar: number | null;
  is_marktdata: boolean;
}

interface GlobalSearchProps {
  onNavigate: (page: string, id?: string) => void;
}

export function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const performSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    setLoading(true);
    setIsOpen(true);

    try {
      const searchTerm = `%${searchQuery.trim()}%`;

      const queries = await Promise.all([
        supabase
          .from('dossiers')
          .select('id, dossier_number, title, brand, model, year, merk, type, serienummer, bouwjaar, is_marktdata, description, location, locatie, land, customer_name, forklift_details(serial_no), ech_details:empty_container_handler_details(serial_no), reachstacker_details(serial_no), terminal_tractor_details(serial_no)')
          .ilike('dossier_number', searchTerm)
          .limit(10),
        supabase
          .from('dossiers')
          .select('id, dossier_number, title, brand, model, year, merk, type, serienummer, bouwjaar, is_marktdata, description, location, locatie, land, customer_name, forklift_details(serial_no), ech_details:empty_container_handler_details(serial_no), reachstacker_details(serial_no), terminal_tractor_details(serial_no)')
          .ilike('brand', searchTerm)
          .limit(10),
        supabase
          .from('dossiers')
          .select('id, dossier_number, title, brand, model, year, merk, type, serienummer, bouwjaar, is_marktdata, description, location, locatie, land, customer_name, forklift_details(serial_no), ech_details:empty_container_handler_details(serial_no), reachstacker_details(serial_no), terminal_tractor_details(serial_no)')
          .ilike('model', searchTerm)
          .limit(10),
        supabase
          .from('dossiers')
          .select('id, dossier_number, title, brand, model, year, merk, type, serienummer, bouwjaar, is_marktdata, description, location, locatie, land, customer_name, forklift_details(serial_no), ech_details:empty_container_handler_details(serial_no), reachstacker_details(serial_no), terminal_tractor_details(serial_no)')
          .ilike('title', searchTerm)
          .limit(10),
        supabase
          .from('dossiers')
          .select('id, dossier_number, title, brand, model, year, merk, type, serienummer, bouwjaar, is_marktdata, description, location, locatie, land, customer_name, forklift_details(serial_no), ech_details:empty_container_handler_details(serial_no), reachstacker_details(serial_no), terminal_tractor_details(serial_no)')
          .ilike('merk', searchTerm)
          .limit(10),
        supabase
          .from('dossiers')
          .select('id, dossier_number, title, brand, model, year, merk, type, serienummer, bouwjaar, is_marktdata, description, location, locatie, land, customer_name, forklift_details(serial_no), ech_details:empty_container_handler_details(serial_no), reachstacker_details(serial_no), terminal_tractor_details(serial_no)')
          .ilike('type', searchTerm)
          .limit(10),
        supabase
          .from('dossiers')
          .select('id, dossier_number, title, brand, model, year, merk, type, serienummer, bouwjaar, is_marktdata, description, location, locatie, land, customer_name, forklift_details(serial_no), ech_details:empty_container_handler_details(serial_no), reachstacker_details(serial_no), terminal_tractor_details(serial_no)')
          .ilike('serienummer', searchTerm)
          .limit(10),
        supabase
          .from('dossiers')
          .select('id, dossier_number, title, brand, model, year, merk, type, serienummer, bouwjaar, is_marktdata, description, location, locatie, land, customer_name, forklift_details(serial_no), ech_details:empty_container_handler_details(serial_no), reachstacker_details(serial_no), terminal_tractor_details(serial_no)')
          .ilike('description', searchTerm)
          .limit(10),
        supabase
          .from('dossiers')
          .select('id, dossier_number, title, brand, model, year, merk, type, serienummer, bouwjaar, is_marktdata, description, location, locatie, land, customer_name, forklift_details(serial_no), ech_details:empty_container_handler_details(serial_no), reachstacker_details(serial_no), terminal_tractor_details(serial_no)')
          .ilike('location', searchTerm)
          .limit(10),
        supabase
          .from('dossiers')
          .select('id, dossier_number, title, brand, model, year, merk, type, serienummer, bouwjaar, is_marktdata, description, location, locatie, land, customer_name, forklift_details(serial_no), ech_details:empty_container_handler_details(serial_no), reachstacker_details(serial_no), terminal_tractor_details(serial_no)')
          .ilike('locatie', searchTerm)
          .limit(10),
        supabase
          .from('dossiers')
          .select('id, dossier_number, title, brand, model, year, merk, type, serienummer, bouwjaar, is_marktdata, description, location, locatie, land, customer_name, forklift_details(serial_no), ech_details:empty_container_handler_details(serial_no), reachstacker_details(serial_no), terminal_tractor_details(serial_no)')
          .ilike('land', searchTerm)
          .limit(10),
        supabase
          .from('dossiers')
          .select('id, dossier_number, title, brand, model, year, merk, type, serienummer, bouwjaar, is_marktdata, description, location, locatie, land, customer_name, forklift_details(serial_no), ech_details:empty_container_handler_details(serial_no), reachstacker_details(serial_no), terminal_tractor_details(serial_no)')
          .ilike('customer_name', searchTerm)
          .limit(10),
      ]);

      const forkliftQuery = await supabase
        .from('forklift_details')
        .select('dossier_id, serial_no')
        .ilike('serial_no', searchTerm)
        .limit(10);

      const echQuery = await supabase
        .from('empty_container_handler_details')
        .select('dossier_id, serial_no')
        .ilike('serial_no', searchTerm)
        .limit(10);

      const reachstackerQuery = await supabase
        .from('reachstacker_details')
        .select('dossier_id, serial_no')
        .ilike('serial_no', searchTerm)
        .limit(10);

      const terminalTractorQuery = await supabase
        .from('terminal_tractor_details')
        .select('dossier_id, serial_no')
        .ilike('serial_no', searchTerm)
        .limit(10);

      const detailsDossierIds = [
        ...(forkliftQuery.data || []),
        ...(echQuery.data || []),
        ...(reachstackerQuery.data || []),
        ...(terminalTractorQuery.data || [])
      ].map(d => d.dossier_id).filter(id => id);

      let detailsResults: any[] = [];
      if (detailsDossierIds.length > 0) {
        const { data } = await supabase
          .from('dossiers')
          .select('id, dossier_number, title, brand, model, year, merk, type, serienummer, bouwjaar, is_marktdata, description, location, locatie, land, customer_name, forklift_details(serial_no), ech_details:empty_container_handler_details(serial_no), reachstacker_details(serial_no), terminal_tractor_details(serial_no)')
          .in('id', detailsDossierIds)
          .limit(10);
        detailsResults = data || [];
      }

      const allResults = [...queries.flatMap(q => q.data || []), ...detailsResults];
      const uniqueResults = Array.from(
        new Map(allResults.map(item => [item.id, item])).values()
      ).slice(0, 10);

      const mappedResults: SearchResult[] = uniqueResults.map((item: any) => {
        let serialNo = item.serienummer;

        if (!serialNo && item.forklift_details && Array.isArray(item.forklift_details) && item.forklift_details[0]) {
          serialNo = item.forklift_details[0].serial_no;
        }
        if (!serialNo && item.ech_details && Array.isArray(item.ech_details) && item.ech_details[0]) {
          serialNo = item.ech_details[0].serial_no;
        }
        if (!serialNo && item.reachstacker_details && Array.isArray(item.reachstacker_details) && item.reachstacker_details[0]) {
          serialNo = item.reachstacker_details[0].serial_no;
        }
        if (!serialNo && item.terminal_tractor_details && Array.isArray(item.terminal_tractor_details) && item.terminal_tractor_details[0]) {
          serialNo = item.terminal_tractor_details[0].serial_no;
        }

        return {
          id: item.id,
          type: item.is_marktdata ? 'marktdata' : 'dossier',
          dossier_number: item.dossier_number,
          title: item.title,
          merk: item.merk || item.brand || '',
          type_model: item.type || item.model || '',
          serienummer: serialNo,
          bouwjaar: item.bouwjaar || item.year,
          is_marktdata: item.is_marktdata || false,
        };
      });

      setResults(mappedResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.is_marktdata) {
      onNavigate('marktdata-database');
    } else {
      onNavigate('dossier-detail', result.id);
    }
    setSearchQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-white/60" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Zoek op serienummer, type, merk, locatie, klant..."
          className="block w-full pl-10 pr-10 py-2.5 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/40 transition-all duration-200"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isOpen && (results.length > 0 || loading) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-slate-200 max-h-96 overflow-y-auto z-50">
          {loading ? (
            <div className="p-4 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-[#0D3B52]/20 border-t-[#0D3B52]"></div>
            </div>
          ) : (
            <>
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-700">
                  {results.length} {results.length === 1 ? 'resultaat' : 'resultaten'} gevonden
                </p>
              </div>
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 p-2 rounded-lg ${
                      result.is_marktdata
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-[#0D3B52]/10 text-[#0D3B52]'
                    }`}>
                      {result.is_marktdata ? (
                        <Database className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {result.dossier_number}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          result.is_marktdata
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {result.is_marktdata ? 'Marktdata' : 'Dossier'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium">
                        {result.merk} {result.type_model}
                      </p>
                      <div className="flex items-center space-x-3 mt-1 text-xs text-slate-500">
                        {result.serienummer && (
                          <span>S/N: {result.serienummer}</span>
                        )}
                        {result.bouwjaar && (
                          <span>Bouwjaar: {result.bouwjaar}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {isOpen && !loading && searchQuery.trim().length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-slate-200 p-4 z-50">
          <p className="text-sm text-slate-600 text-center">
            Geen resultaten gevonden voor "{searchQuery}"
          </p>
        </div>
      )}
    </div>
  );
}
