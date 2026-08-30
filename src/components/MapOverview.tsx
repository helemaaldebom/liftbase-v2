import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const markerStyles = `
  .custom-map-marker {
    border: none !important;
    background: transparent !important;
  }
  .custom-map-marker img {
    display: block;
  }
`;

interface DossierLocation {
  id: string;
  dossier_number: string;
  brand: string;
  model: string;
  equipment_type: string;
  location?: string;
  is_marktdata?: boolean;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  status?: string;
}

const equipmentTypeIcons: { [key: string]: string } = {
  'heavy_duty_forklift': '/icons_2024_tekengebied_1_kopie_6.png',
  'empty_container_handler': '/ICONS_2024_Tekengebied 1 kopie 8.png',
  'reachstacker': '/icons_2024_tekengebied_1_kopie_5.png',
  'terminal_tractor': '/ICONS_2024_Tekengebied 1 kopie 7.png'
};

const equipmentTypeLabels: { [key: string]: string } = {
  'heavy_duty_forklift': 'Heavy Duty Forklifts',
  'empty_container_handler': 'Empty Container Handlers',
  'reachstacker': 'Reachstackers',
  'terminal_tractor': 'Terminal Tractors'
};

const equipmentTypeColors: { [key: string]: string } = {
  'heavy_duty_forklift': '#3b82f6',
  'empty_container_handler': '#10b981',
  'reachstacker': '#f97316',
  'terminal_tractor': '#ef4444'
};

const createCustomIcon = (iconUrl: string, color: string) => {
  const markerHtml = `
    <div style="
      width: 50px;
      height: 50px;
      background: white;
      border-radius: 50%;
      border: 3px solid ${color};
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    ">
      <img src="${iconUrl}" style="
        width: 100%;
        height: 100%;
        object-fit: contain;
      " />
    </div>
  `;

  return L.divIcon({
    className: 'custom-map-marker',
    html: markerHtml,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25]
  });
};

const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    console.log('[Geocoding] Geocoding address:', address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'HC Lifters Taxatie App'
        }
      }
    );

    if (!response.ok) {
      console.error('[Geocoding] HTTP error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('[Geocoding] Response data:', data);

    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
      console.log('[Geocoding] Success:', result);
      return result;
    }

    console.log('[Geocoding] No results found for address:', address);
    return null;
  } catch (error) {
    console.error('[Geocoding] Error:', error);
    return null;
  }
};

interface MapOverviewProps {
  onNavigate: (page: string, id?: string) => void;
}

export default function MapOverview({ onNavigate }: MapOverviewProps) {
  const { user } = useAuth();
  const [dossiers, setDossiers] = useState<DossierLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocodingProgress, setGeocodingProgress] = useState<{ current: number; total: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEquipmentTypes, setSelectedEquipmentTypes] = useState<Set<string>>(new Set(Object.keys(equipmentTypeIcons)));
  const [failedGeocoding, setFailedGeocoding] = useState<{ dossierNumber: string; location: string }[]>([]);

  useEffect(() => {
    if (user) {
      loadDossiers();
    }
  }, [user]);

  const loadDossiers = async () => {
    console.log('[MapOverview] Starting loadDossiers, user:', user?.id);

    try {
      setLoading(true);

      if (!user) {
        console.log('[MapOverview] No user, skipping load');
        setDossiers([]);
        return;
      }

      console.log('[MapOverview] Fetching dossiers from Supabase...');
      const { data, error } = await supabase
        .from('dossiers')
        .select('id, dossier_number, brand, model, equipment_type, location, is_marktdata, latitude, longitude, status')
        .or('is_marktdata.is.null,is_marktdata.eq.false')
        .order('dossier_number', { ascending: false });

      if (error) {
        console.error('[MapOverview] Supabase error:', error);
        console.error('[MapOverview] Error details:', JSON.stringify(error, null, 2));
        setDossiers([]);
        return;
      }

      console.log('[MapOverview] Loaded dossiers:', data?.length || 0);
      console.log('[MapOverview] All dossiers:', data?.map(d => ({
        number: d.dossier_number,
        location: d.location,
        lat: d.latitude,
        lng: d.longitude,
        is_marktdata: d.is_marktdata
      })));

      if (!data || data.length === 0) {
        console.log('[MapOverview] No dossiers found');
        setDossiers([]);
        return;
      }

      const dossiersWithLocation = data.filter(d => {
        const hasLocation = d.location && d.location.trim() !== '';
        if (!hasLocation) {
          console.log(`[MapOverview] ${d.dossier_number} has no location`);
        }
        return hasLocation;
      });
      console.log('[MapOverview] Dossiers with location:', dossiersWithLocation.length);

      if (dossiersWithLocation.length === 0) {
        setDossiers([]);
        return;
      }

      const alreadyGeocoded = dossiersWithLocation.filter(d => d.latitude && d.longitude);
      const needsGeocoding = dossiersWithLocation.filter(d => !d.latitude || !d.longitude);

      console.log('[MapOverview] Already geocoded:', alreadyGeocoded.length);
      console.log('[MapOverview] Needs geocoding:', needsGeocoding.length);

      const geocodedDossiers: DossierLocation[] = alreadyGeocoded.map(d => ({
        ...d,
        lat: d.latitude!,
        lng: d.longitude!
      }));

      const failed: { dossierNumber: string; location: string }[] = [];

      if (needsGeocoding.length > 0) {
        setGeocodingProgress({ current: 0, total: needsGeocoding.length });

        for (let i = 0; i < needsGeocoding.length; i++) {
          const dossier = needsGeocoding[i];
          setGeocodingProgress({ current: i + 1, total: needsGeocoding.length });

          const locationString = dossier.location || '';
          console.log(`[MapOverview] Geocoding ${i + 1}/${needsGeocoding.length}: ${dossier.dossier_number} (${dossier.status})`);
          console.log(`[MapOverview] Location: ${locationString}`);
          const coords = await geocodeAddress(locationString);

          if (coords) {
            console.log(`[MapOverview] Geocoded ${dossier.dossier_number} successfully:`, coords);
            geocodedDossiers.push({
              ...dossier,
              lat: coords.lat,
              lng: coords.lng
            });

            const { error: updateError } = await supabase
              .from('dossiers')
              .update({
                latitude: coords.lat,
                longitude: coords.lng
              })
              .eq('id', dossier.id);

            if (updateError) {
              console.error(`[MapOverview] Failed to save coordinates for ${dossier.dossier_number}:`, updateError);
            } else {
              console.log(`[MapOverview] Saved coordinates for ${dossier.dossier_number}`);
            }
          } else {
            console.error(`[MapOverview] Failed to geocode ${dossier.dossier_number} with location: ${locationString}`);
            failed.push({
              dossierNumber: dossier.dossier_number,
              location: locationString
            });
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setFailedGeocoding(failed);

      console.log('[MapOverview] Total on map:', geocodedDossiers.length);
      setDossiers(geocodedDossiers);
    } catch (error: any) {
      console.error('[MapOverview] Error:', error);
      setDossiers([]);
    } finally {
      setLoading(false);
      setGeocodingProgress(null);
    }
  };

  const toggleEquipmentType = (type: string) => {
    const newTypes = new Set(selectedEquipmentTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedEquipmentTypes(newTypes);
  };

  const filteredDossiers = dossiers.filter(dossier => {
    let matchesStatus = false;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else {
      matchesStatus = dossier.status === statusFilter;
    }
    const matchesEquipmentType = selectedEquipmentTypes.has(dossier.equipment_type);
    return matchesStatus && matchesEquipmentType;
  });

  // Group dossiers by location and add offset for overlapping markers
  const dossiersWithOffset = (() => {
    const locationGroups = new Map<string, DossierLocation[]>();

    // Group dossiers by rounded coordinates (to catch near-identical locations)
    filteredDossiers.forEach(dossier => {
      if (dossier.lat && dossier.lng) {
        // Round to 5 decimal places (~1.1m precision) to group nearby locations
        const key = `${dossier.lat.toFixed(5)},${dossier.lng.toFixed(5)}`;
        if (!locationGroups.has(key)) {
          locationGroups.set(key, []);
        }
        locationGroups.get(key)!.push(dossier);
      }
    });

    // Add offset to overlapping markers
    const result: (DossierLocation & { offsetLat?: number; offsetLng?: number })[] = [];
    locationGroups.forEach(group => {
      if (group.length === 1) {
        result.push(group[0]);
      } else {
        // Multiple markers at same location - arrange in a circle
        const radius = 0.002; // About 200m offset
        group.forEach((dossier, index) => {
          const angle = (2 * Math.PI * index) / group.length;
          const offsetLat = (dossier.lat || 0) + radius * Math.cos(angle);
          const offsetLng = (dossier.lng || 0) + radius * Math.sin(angle);
          result.push({
            ...dossier,
            offsetLat,
            offsetLng
          });
        });
      }
    });

    return result;
  })();

  const getCenter = (): [number, number] => {
    if (dossiersWithOffset.length === 0) {
      return [52.1326, 5.2913];
    }

    const validDossiers = dossiersWithOffset.filter(d => d.lat && d.lng);
    if (validDossiers.length === 0) {
      return [52.1326, 5.2913];
    }

    const avgLat = validDossiers.reduce((sum, d) => sum + (d.lat || 0), 0) / validDossiers.length;
    const avgLng = validDossiers.reduce((sum, d) => sum + (d.lng || 0), 0) / validDossiers.length;

    return [avgLat, avgLng];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Alle Machines op de Kaart</h2>
        </div>
        <div className="flex flex-col items-center justify-center h-[500px] text-gray-500">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          {geocodingProgress && geocodingProgress.total > 0 && (
            <p>
              Locaties ophalen: {geocodingProgress.current} / {geocodingProgress.total}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (dossiers.length === 0 || dossiersWithOffset.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Alle Machines op de Kaart</h2>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">Alle statussen</option>
              <option value="open">Open</option>
              <option value="stock">Stock</option>
              <option value="bidding">Bieden actief</option>
              <option value="sold">Verkocht</option>
              <option value="archived">Gearchiveerd</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mb-4 flex-wrap">
          {Object.entries(equipmentTypeIcons).map(([type, iconUrl]) => {
            const isSelected = selectedEquipmentTypes.has(type);
            const color = equipmentTypeColors[type] || '#3b82f6';
            return (
              <button
                key={type}
                onClick={() => toggleEquipmentType(type)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  isSelected
                    ? 'shadow-md'
                    : 'bg-gray-50 border-2 border-gray-300 opacity-50 hover:opacity-75'
                }`}
                style={isSelected ? {
                  backgroundColor: `${color}15`,
                  borderWidth: '2px',
                  borderColor: color
                } : {}}
              >
                <div
                  className="w-8 h-8 rounded-full shadow bg-white flex items-center justify-center p-1"
                  style={{
                    borderWidth: '2px',
                    borderColor: isSelected ? color : '#9ca3af'
                  }}
                >
                  <img src={iconUrl} alt={type} className="w-full h-full object-contain" />
                </div>
                <span
                  className={`text-sm font-medium ${isSelected ? '' : 'text-gray-500'}`}
                  style={isSelected ? { color: color } : {}}
                >
                  {equipmentTypeLabels[type]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col items-center justify-center h-[500px] text-gray-500 space-y-4">
          <MapPin className="w-16 h-16 text-gray-300" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-600 mb-2">
              {dossiers.length === 0
                ? 'Geen dossiers met locatiegegevens gevonden'
                : 'Geen machines gevonden met deze filters'}
            </p>
            <p className="text-sm text-gray-500">
              {dossiers.length === 0
                ? 'Voeg een locatie toe aan je dossiers om ze op de kaart te zien'
                : 'Pas je filters aan om meer resultaten te zien'}
            </p>
            {dossiers.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">Tip: Vul het "Locatie" veld in bij een dossier</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const center = getCenter();
  const mapKey = `map-${dossiers.length}`;

  return (
    <>
      <style>{markerStyles}</style>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Alle Machines op de Kaart</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {dossiersWithOffset.length} {dossiersWithOffset.length === 1 ? 'machine' : 'machines'} getoond
            </div>
            <button
              onClick={loadDossiers}
              disabled={loading}
              className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 Herlaad Locaties
            </button>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">Alle statussen</option>
              <option value="open">Open</option>
              <option value="stock">Stock</option>
              <option value="bidding">Bieden actief</option>
              <option value="sold">Verkocht</option>
              <option value="archived">Gearchiveerd</option>
            </select>
          </div>
        </div>

        {failedGeocoding.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-yellow-600 mt-0.5">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  {failedGeocoding.length} {failedGeocoding.length === 1 ? 'dossier' : 'dossiers'} kunnen niet op de kaart worden getoond
                </h3>
                <p className="text-sm text-yellow-700 mb-2">
                  De volgende dossiers hebben een locatie, maar de GPS-coördinaten konden niet worden gevonden:
                </p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {failedGeocoding.map((failed, idx) => (
                    <li key={idx} className="font-mono">
                      {failed.dossierNumber}: {failed.location}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-yellow-700 mt-3">
                  Tip: Controleer of de locatie correct is gespeld en probeer "Herlaad Locaties" om het opnieuw te proberen.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-4 flex-wrap">
          {Object.entries(equipmentTypeIcons).map(([type, iconUrl]) => {
            const isSelected = selectedEquipmentTypes.has(type);
            const color = equipmentTypeColors[type] || '#3b82f6';
            return (
              <button
                key={type}
                onClick={() => toggleEquipmentType(type)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  isSelected
                    ? 'shadow-md'
                    : 'bg-gray-50 border-2 border-gray-300 opacity-50 hover:opacity-75'
                }`}
                style={isSelected ? {
                  backgroundColor: `${color}15`,
                  borderWidth: '2px',
                  borderColor: color
                } : {}}
              >
                <div
                  className="w-8 h-8 rounded-full shadow bg-white flex items-center justify-center p-1"
                  style={{
                    borderWidth: '2px',
                    borderColor: isSelected ? color : '#9ca3af'
                  }}
                >
                  <img src={iconUrl} alt={type} className="w-full h-full object-contain" />
                </div>
                <span
                  className={`text-sm font-medium ${isSelected ? '' : 'text-gray-500'}`}
                  style={isSelected ? { color: color } : {}}
                >
                  {equipmentTypeLabels[type]}
                </span>
              </button>
            );
          })}
        </div>

      <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200 relative">
        <MapContainer
          key={mapKey}
          center={center}
          zoom={7}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {dossiersWithOffset.map((dossier) => {
            if (!dossier.lat || !dossier.lng) return null;

            const equipmentType = dossier.equipment_type || 'heavy_duty_forklift';
            const iconUrl = equipmentTypeIcons[equipmentType] || equipmentTypeIcons['heavy_duty_forklift'];
            const color = equipmentTypeColors[equipmentType] || equipmentTypeColors['heavy_duty_forklift'];
            const icon = createCustomIcon(iconUrl, color);

            // Use offset coordinates if they exist, otherwise use original
            const markerLat = dossier.offsetLat || dossier.lat;
            const markerLng = dossier.offsetLng || dossier.lng;

            return (
              <Marker
                key={dossier.id}
                position={[markerLat, markerLng]}
                icon={icon}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-800 mb-1">
                      {dossier.dossier_number}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Type:</strong> {equipmentTypeLabels[equipmentType] || equipmentType}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Merk:</strong> {dossier.brand || 'Onbekend'}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Model:</strong> {dossier.model || 'Onbekend'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Locatie:</strong> {dossier.location}
                    </p>
                    <button
                      onClick={() => onNavigate('dossier-detail', dossier.id)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block cursor-pointer"
                    >
                      Bekijk dossier →
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
    </>
  );
}
