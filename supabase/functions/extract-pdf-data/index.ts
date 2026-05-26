import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function extractTextFromPDF(pdfBase64: string): Promise<string> {
  try {
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const text = new TextDecoder().decode(pdfBytes);

    const textMatches = text.match(/\(([^)]+)\)/g);
    if (textMatches) {
      return textMatches.map(m => m.slice(1, -1)).join(' ');
    }

    return text.replace(/[^\x20-\x7E\n]/g, ' ').trim();
  } catch (e) {
    console.error('Text extraction error:', e);
    return '';
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { pdfBase64, equipmentType } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: "PDF data is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("VITE_OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const pdfText = await extractTextFromPDF(pdfBase64);

    if (!pdfText || pdfText.trim().length < 50) {
      return new Response(
        JSON.stringify({
          error: "Could not extract sufficient text from PDF. The PDF might be an image-only document. Please try uploading a screenshot instead."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const extractionPrompt = getExtractionPrompt(equipmentType, pdfText);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a data extraction assistant specialized in extracting technical specifications from equipment documentation. Extract equipment data from the provided text and return it as structured JSON. Be precise with numeric values and units."
          },
          {
            role: "user",
            content: extractionPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to analyze PDF", details: data }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const extractedText = data.choices[0].message.content;
    let extractedData;

    try {
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(extractedText);
      }
    } catch (e) {
      console.error("Failed to parse JSON from response:", e);
      return new Response(
        JSON.stringify({
          error: "Failed to parse extracted data",
          rawResponse: extractedText
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ data: extractedData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getExtractionPrompt(equipmentType: string, pdfText: string): string {
  const basePrompt = `Extract the following information from the provided PDF text and return it as a JSON object. Look carefully at all specifications in the text.`;

  const fieldsByType = {
    forklift: `
      {
        "merk": "brand/manufacturer",
        "type": "model",
        "bouwjaar": year as number,
        "serienummer": "serial number",
        "uren": hours as number,
        "capaciteit": capacity in kg as number,
        "hefhoogte": lifting height in mm as number,
        "brandstof": "fuel type (diesel/electric/lpg/gas)",
        "masttype": "mast type",
        "lastzwaartepunt": "load center in mm as number",
        "vrije_hef": "free lift in mm as number",
        "aanbouwdeel": "attachment",
        "locatie": "location",
        "land": "country",
        "verkoopprijs": price as number,
        "description": "any additional notes or description"
      }
    `,
    "empty_container_handler": `
      {
        "merk": "brand/manufacturer",
        "type": "model",
        "bouwjaar": year as number,
        "serienummer": "serial number",
        "uren": hours as number,
        "capaciteit": capacity in kg as number,
        "hefhoogte": lifting height in mm as number,
        "brandstof": "fuel type",
        "locatie": "location",
        "land": "country",
        "verkoopprijs": price as number,
        "description": "any additional notes"
      }
    `,
    reachstacker: `
      {
        "merk": "brand/manufacturer",
        "type": "model",
        "bouwjaar": year as number,
        "serienummer": "serial number",
        "uren": hours as number,
        "capaciteit": capacity in kg as number,
        "hefhoogte": lifting height in mm as number,
        "brandstof": "fuel type",
        "locatie": "location",
        "land": "country",
        "verkoopprijs": price as number,
        "description": "any additional notes"
      }
    `,
    "terminal_tractor": `
      {
        "merk": "brand/manufacturer",
        "type": "model",
        "bouwjaar": year as number,
        "serienummer": "serial number",
        "uren": hours as number,
        "brandstof": "fuel type",
        "locatie": "location",
        "land": "country",
        "verkoopprijs": price as number,
        "description": "any additional notes"
      }
    `,
  };

  const fields = fieldsByType[equipmentType] || fieldsByType.forklift;

  return `${basePrompt}

Expected JSON format:
${fields}

Important:
- Carefully read all specifications in the text
- Extract information that is clearly visible
- Use null for any fields that are not present or not found
- Return ONLY the JSON object, no additional text or explanations
- Ensure all numeric values are actual numbers, not strings
- For prices, extract only the numeric value without currency symbols
- For dimensions (hefhoogte, lastzwaartepunt, vrije_hef), convert to mm if needed
- For capacity (capaciteit), convert to kg if needed

PDF Text:
${pdfText.substring(0, 8000)}
`;
}
