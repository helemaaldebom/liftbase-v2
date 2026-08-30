import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];

async function fetchFromExchangeRateApi(baseCurrency: string): Promise<any> {
  const apiKey = Deno.env.get("EXCHANGERATE_API_KEY");
  if (!apiKey) {
    console.warn("ExchangeRate-API key not found");
    return null;
  }

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      provider: 'exchangerate-api',
      base: baseCurrency,
      rates: data.conversion_rates,
      timestamp: new Date(data.time_last_update_unix * 1000).toISOString()
    };
  } catch (error) {
    console.error("ExchangeRate-API error:", error);
    return null;
  }
}

async function fetchFromFixer(baseCurrency: string): Promise<any> {
  const apiKey = Deno.env.get("FIXER_API_KEY");
  if (!apiKey) {
    console.warn("Fixer.io key not found");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.fixer.io/latest?access_key=${apiKey}&base=${baseCurrency}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      provider: 'fixer',
      base: baseCurrency,
      rates: data.rates,
      timestamp: new Date(data.timestamp * 1000).toISOString()
    };
  } catch (error) {
    console.error("Fixer.io error:", error);
    return null;
  }
}

async function fetchFromCurrencyApi(baseCurrency: string): Promise<any> {
  const apiKey = Deno.env.get("CURRENCYAPI_KEY");
  if (!apiKey) {
    console.warn("CurrencyAPI key not found");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.currencyapi.com/v3/latest?apikey=${apiKey}&base_currency=${baseCurrency}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const rates: any = {};

    for (const [currency, info] of Object.entries(data.data)) {
      rates[currency] = (info as any).value;
    }

    return {
      provider: 'currencyapi',
      base: baseCurrency,
      rates: rates,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("CurrencyAPI error:", error);
    return null;
  }
}

async function fetchAllRates(baseCurrency: string = 'EUR') {
  const results = await Promise.allSettled([
    fetchFromExchangeRateApi(baseCurrency),
    fetchFromFixer(baseCurrency),
    fetchFromCurrencyApi(baseCurrency)
  ]);

  const successfulResults = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);

  return successfulResults;
}

function calculateAverageRates(allResults: any[], baseCurrency: string): Map<string, number> {
  const ratesByTarget = new Map<string, number[]>();

  for (const result of allResults) {
    if (!result || !result.rates) continue;

    for (const [targetCurrency, rate] of Object.entries(result.rates)) {
      if (targetCurrency === baseCurrency) continue;

      if (!ratesByTarget.has(targetCurrency)) {
        ratesByTarget.set(targetCurrency, []);
      }
      ratesByTarget.get(targetCurrency)!.push(rate as number);
    }
  }

  const averageRates = new Map<string, number>();

  for (const [currency, rates] of ratesByTarget.entries()) {
    const avg = rates.reduce((sum, r) => sum + r, 0) / rates.length;
    averageRates.set(currency, avg);
  }

  return averageRates;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const baseCurrency = url.searchParams.get('base') || 'EUR';

    console.log(`Fetching FX rates for base: ${baseCurrency}`);

    await supabase
      .from('fx_rates')
      .update({ is_latest: false })
      .eq('from_currency', baseCurrency);

    const allResults = await fetchAllRates(baseCurrency);

    if (allResults.length === 0) {
      return new Response(
        JSON.stringify({ error: "All FX providers failed", success: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ratesToInsert = [];

    for (const result of allResults) {
      if (!result || !result.rates) continue;

      for (const [targetCurrency, rate] of Object.entries(result.rates)) {
        if (targetCurrency === baseCurrency) continue;

        ratesToInsert.push({
          from_currency: baseCurrency,
          to_currency: targetCurrency,
          rate: rate as number,
          provider: result.provider,
          provider_timestamp: result.timestamp,
          is_latest: true,
          fetched_at: new Date().toISOString()
        });
      }
    }

    if (ratesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('fx_rates')
        .insert(ratesToInsert);

      if (insertError) {
        console.error("Error inserting FX rates:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to save rates", details: insertError }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const averageRates = calculateAverageRates(allResults, baseCurrency);
    const averageRatesObj: any = {};
    averageRates.forEach((rate, currency) => {
      averageRatesObj[currency] = rate;
    });

    return new Response(
      JSON.stringify({
        success: true,
        base_currency: baseCurrency,
        providers_count: allResults.length,
        rates_saved: ratesToInsert.length,
        average_rates: averageRatesObj,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error fetching FX rates:", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
