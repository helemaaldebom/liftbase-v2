import { useState, useEffect } from 'react';
import { TrendingUp, Info, X, RefreshCw } from 'lucide-react';
import { getPriceSuggestion, type PriceSuggestion as PriceSuggestionType } from '../utils/priceSuggestion';

interface PriceSuggestionProps {
  merk: string;
  type: string;
  bouwjaar: number;
  uren?: number | null;
}

export function PriceSuggestion({ merk, type, bouwjaar, uren }: PriceSuggestionProps) {
  const [suggestion, setSuggestion] = useState<PriceSuggestionType | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadSuggestion();
  }, [merk, type, bouwjaar, uren]);

  const loadSuggestion = async () => {
    if (!merk || !type || !bouwjaar) return;

    setLoading(true);
    try {
      const result = await getPriceSuggestion({ merk, type, bouwjaar, uren });
      setSuggestion(result);
    } catch (error) {
      console.error('Error loading price suggestion:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-800">Marktprijzen ophalen...</span>
        </div>
      </div>
    );
  }

  if (!suggestion || suggestion.references.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-600">
            Geen vergelijkbare marktdata beschikbaar voor deze machine
          </span>
        </div>
      </div>
    );
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-orange-100 text-orange-800 border-orange-300';
    }
  };

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'Hoge betrouwbaarheid';
      case 'medium':
        return 'Gemiddelde betrouwbaarheid';
      default:
        return 'Lage betrouwbaarheid';
    }
  };

  return (
    <div className="space-y-4">
      <div className={`border rounded-lg p-4 ${getConfidenceColor(suggestion.confidence)}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <h3 className="font-semibold">Automatische Prijssuggestie</h3>
          </div>
          <span className="text-xs px-2 py-1 bg-white rounded-full">
            {getConfidenceLabel(suggestion.confidence)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {suggestion.suggestedHandelsprijs && (
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-slate-600 mb-1">Handelsprijs (geschat)</div>
              <div className="text-2xl font-bold text-green-600">
                € {suggestion.suggestedHandelsprijs.toLocaleString('nl-NL')}
              </div>
            </div>
          )}
          {suggestion.suggestedEindklantprijs && (
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-slate-600 mb-1">Eindklantprijs (geschat)</div>
              <div className="text-2xl font-bold text-blue-600">
                € {suggestion.suggestedEindklantprijs.toLocaleString('nl-NL')}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-3 text-sm underline hover:no-underline"
        >
          {showDetails ? 'Verberg' : 'Toon'} referenties ({suggestion.references.length})
        </button>
      </div>

      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900">
                  Marktdata Referenties
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {suggestion.references.map((ref, index) => (
                  <div
                    key={ref.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          Referentie #{index + 1}
                        </h4>
                        <p className="text-sm text-slate-600">
                          {ref.merk} {ref.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Relevantie score</div>
                        <div className="text-lg font-semibold text-blue-600">
                          {Math.round(ref.score)}/100
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Bouwjaar:</span>
                        <span className="ml-2 font-medium">{ref.bouwjaar}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Uren:</span>
                        <span className="ml-2 font-medium">
                          {ref.uren ? ref.uren.toLocaleString() : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Handelsprijs:</span>
                        <span className="ml-2 font-medium text-green-600">
                          {ref.handelsprijs
                            ? `€ ${ref.handelsprijs.toLocaleString('nl-NL')}`
                            : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Eindklantprijs:</span>
                        <span className="ml-2 font-medium text-blue-600">
                          {ref.eindklantprijs
                            ? `€ ${ref.eindklantprijs.toLocaleString('nl-NL')}`
                            : '-'}
                        </span>
                      </div>
                    </div>

                    {ref.verkoopdatum && (
                      <div className="mt-2 text-xs text-slate-500">
                        Verkocht op: {new Date(ref.verkoopdatum).toLocaleDateString('nl-NL')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t">
                <div className="bg-blue-50 rounded-lg p-4 text-sm">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    Hoe wordt de prijssuggestie berekend?
                  </h4>
                  <ul className="space-y-1 text-blue-800">
                    <li>• Zoekt naar machines met hetzelfde merk en type</li>
                    <li>• Filtert op bouwjaar (±3 jaar) en urenstand (±10.000 uur)</li>
                    <li>• Selecteert de 3 meest vergelijkbare machines</li>
                    <li>• Geeft voorrang aan recente observaties</li>
                    <li>• Berekent een gewogen gemiddelde prijs</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-6 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
