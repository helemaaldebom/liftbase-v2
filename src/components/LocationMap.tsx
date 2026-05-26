import { MapPin, ExternalLink, Navigation } from 'lucide-react';

interface LocationMapProps {
  location: string;
}

export function LocationMap({ location }: LocationMapProps) {
  if (!location) return null;

  const encodedLocation = encodeURIComponent(location);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;

  return (
    <div className="mt-6 border-t border-slate-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-slate-600" />
          <span>Locatie op kaart</span>
        </h3>
      </div>

      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative w-full h-[400px] rounded-lg overflow-hidden border-2 border-slate-200 shadow-sm hover:border-blue-400 transition-all duration-200 group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-100">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
                <MapPin className="relative w-16 h-16 text-blue-600" strokeWidth={1.5} />
              </div>
              <h4 className="text-xl font-semibold text-slate-800 mb-2">
                {location}
              </h4>
              <div className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium shadow-lg group-hover:bg-blue-700 group-hover:shadow-xl transition-all duration-200">
                <Navigation className="w-5 h-5" />
                <span>Bekijk op Google Maps</span>
                <ExternalLink className="w-4 h-4" />
              </div>
              <p className="text-sm text-slate-600 mt-4 max-w-md mx-auto">
                Klik om de locatie te bekijken in Google Maps met routebeschrijving en street view
              </p>
            </div>
          </div>
        </div>
      </a>

      <div className="flex items-center justify-between mt-3 px-1">
        <p className="text-xs text-slate-500">
          <MapPin className="w-3 h-3 inline-block mr-1" />
          {location}
        </p>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
        >
          <span>Open extern</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
