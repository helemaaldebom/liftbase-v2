import { supabase } from '../lib/supabase';

export interface PriceSuggestionParams {
  merk: string;
  type: string;
  bouwjaar: number;
  uren?: number | null;
}

export interface PriceReference {
  id: string;
  brand: string;
  model: string;
  year: number;
  hours: number | null;
  handelsprijs: number | null;
  eindklantprijs: number | null;
  sale_date: string | null;
  marktdata_invoerdatum: string | null;
  created_at: string;
  score: number;
}

export interface PriceSuggestion {
  suggestedHandelsprijs: number | null;
  suggestedEindklantprijs: number | null;
  references: PriceReference[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Calculates an automatic price suggestion based on comparable market data
 *
 * Matching criteria:
 * - Same merk (brand)
 * - Same type (model)
 * - Year of manufacture ±3 years
 * - Running hours ±10,000 hours (if provided)
 * - Prioritizes recent observations
 *
 * Returns top 3 most relevant references with suggested prices
 */
export async function getPriceSuggestion(
  params: PriceSuggestionParams
): Promise<PriceSuggestion> {
  try {
    const { merk, type, bouwjaar, uren } = params;

    // Query for comparable machines
    let query = supabase
      .from('dossiers')
      .select('id, brand, model, year, hours, handelsprijs, eindklantprijs, sale_date, marktdata_invoerdatum, created_at')
      .eq('is_marktdata', true)
      .eq('brand', merk)
      .eq('model', type)
      .gte('year', bouwjaar - 3)
      .lte('year', bouwjaar + 3)
      .or('handelsprijs.not.is.null,eindklantprijs.not.is.null');

    // Add uren filter if provided
    if (uren) {
      query = query
        .gte('hours', uren - 10000)
        .lte('hours', uren + 10000);
    }

    const { data: comparableRecords, error } = await query;

    if (error) throw error;

    if (!comparableRecords || comparableRecords.length === 0) {
      return {
        suggestedHandelsprijs: null,
        suggestedEindklantprijs: null,
        references: [],
        confidence: 'low'
      };
    }

    // Score and sort records by relevance
    const scoredRecords: PriceReference[] = comparableRecords.map(record => {
      let score = 100;

      // Year difference penalty (max -30 points)
      const yearDiff = Math.abs(record.year - bouwjaar);
      score -= yearDiff * 10;

      // Hours difference penalty (max -30 points) if both have hours
      if (uren && record.hours) {
        const hoursDiff = Math.abs(record.hours - uren);
        score -= Math.min(30, (hoursDiff / 10000) * 30);
      }

      // Recency bonus (newer = better, up to +40 points)
      const recordDate = new Date(record.marktdata_invoerdatum || record.created_at);
      const daysSinceRecord = (Date.now() - recordDate.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 40 - (daysSinceRecord / 365) * 40);
      score += recencyScore;

      return {
        ...record,
        score
      };
    });

    // Sort by score (highest first) and take top 3
    const topReferences = scoredRecords
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Calculate suggested prices as weighted average
    const totalWeight = topReferences.reduce((sum, ref) => sum + ref.score, 0);

    const suggestedHandelsprijs = calculateWeightedAverage(
      topReferences.filter(r => r.handelsprijs !== null),
      'handelsprijs',
      totalWeight
    );

    const suggestedEindklantprijs = calculateWeightedAverage(
      topReferences.filter(r => r.eindklantprijs !== null),
      'eindklantprijs',
      totalWeight
    );

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'low';
    const avgScore = totalWeight / topReferences.length;

    if (topReferences.length >= 3 && avgScore >= 80) {
      confidence = 'high';
    } else if (topReferences.length >= 2 && avgScore >= 60) {
      confidence = 'medium';
    }

    return {
      suggestedHandelsprijs,
      suggestedEindklantprijs,
      references: topReferences,
      confidence
    };
  } catch (error) {
    console.error('Error calculating price suggestion:', error);
    return {
      suggestedHandelsprijs: null,
      suggestedEindklantprijs: null,
      references: [],
      confidence: 'low'
    };
  }
}

function calculateWeightedAverage(
  records: PriceReference[],
  priceField: 'handelsprijs' | 'eindklantprijs',
  totalWeight: number
): number | null {
  if (records.length === 0) return null;

  const weightedSum = records.reduce((sum, record) => {
    const price = record[priceField];
    return price ? sum + (price * record.score) : sum;
  }, 0);

  const validWeight = records.reduce((sum, record) => {
    return record[priceField] ? sum + record.score : sum;
  }, 0);

  return validWeight > 0 ? Math.round(weightedSum / validWeight) : null;
}
