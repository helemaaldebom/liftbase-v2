import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LineItem {
  line_number: number;
  description: string;
  amount_excl_vat: number;
  currency: string;
  category: string;
  category_confidence: number;
  service_interval_hours?: number;
  meter_reading?: number;
  serial_number?: string;
}

interface ExtractionResult {
  serial_numbers: string[];
  fleet_numbers: string[];
  document_date?: string;
  currency: string;
  supplier_name?: string;
  invoice_number?: string;
  line_items: LineItem[];
}

async function extractTextFromDocument(fileBase64: string, fileType: string): Promise<string> {
  try {
    const fileBytes = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));

    if (fileType.includes('pdf')) {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes);
      const textMatches = text.match(/\(([^)]+)\)/g);
      if (textMatches) {
        return textMatches.map(m => m.slice(1, -1)).join(' ');
      }
      return text.replace(/[^\x20-\x7E\n]/g, ' ').trim();
    } else if (fileType.includes('image')) {
      return '[IMAGE]';
    } else if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
      return new TextDecoder('utf-8', { fatal: false }).decode(fileBytes);
    }

    return new TextDecoder('utf-8', { fatal: false }).decode(fileBytes);
  } catch (e) {
    console.error('Text extraction error:', e);
    return '';
  }
}

async function extractFromImageWithVision(
  fileBase64: string,
  fileType: string,
  openaiApiKey: string
): Promise<ExtractionResult> {
  const mimeType = fileType.includes('png') ? 'image/png' :
                   fileType.includes('jpeg') || fileType.includes('jpg') ? 'image/jpeg' :
                   'image/png';

  const prompt = `You are an AI assistant specialized in extracting maintenance invoice data from equipment service documents.

Extract the following information from this maintenance invoice/work order image and return it as JSON:

{
  "serial_numbers": ["array of all serial numbers, chassis numbers, or machine IDs found"],
  "fleet_numbers": ["array of all fleet numbers or internal equipment IDs found"],
  "document_date": "invoice or service date in YYYY-MM-DD format",
  "currency": "currency code (EUR, USD, GBP, etc.)",
  "supplier_name": "company or dealer name providing the service",
  "invoice_number": "invoice or document number",
  "line_items": [
    {
      "line_number": 1,
      "description": "detailed description of the work or parts",
      "amount_excl_vat": 150.00,
      "currency": "EUR",
      "category": "preventive or corrective or tires",
      "category_confidence": 0.85,
      "service_interval_hours": 500,
      "meter_reading": 12500,
      "serial_number": "optional: if this line applies to specific serial"
    }
  ]
}

CATEGORIZATION RULES:
- "preventive": Scheduled maintenance at intervals (e.g., "500 hour service", "1000 hr maintenance", "annual inspection", "PM service")
- "corrective": Unplanned repairs (e.g., "hydraulic leak repair", "electrical fault", "replace damaged part", "cylinder repair")
- "tires": Tire-related work (e.g., "mount tires", "tire replacement", "wheel assembly", "tire repair", "X-ray scan tires")

IMPORTANT NOTES:
- Look for keywords like "chassis", "serial", "machine no", "equipment ID", "fleet no"
- Serial numbers are often alphanumeric like "ABC123456" or "12345-ABC"
- For service interval, look for phrases like "500 hrs", "1000 hour service", "2000h inspection"
- For meter reading, look for "hour meter: 12345" or "hours: 12345" or similar
- If multiple machines on one invoice, try to match line items to specific serials
- If you cannot confidently categorize, set category_confidence to 0.5 or lower
- Return amounts without currency symbols, as decimal numbers
- Extract amounts EXCLUDING VAT/tax where possible

Return ONLY valid JSON, no additional text.`;

  const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
          content: "You are a specialized AI for extracting maintenance invoice data. Return only valid JSON."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${fileBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.1,
    }),
  });

  const openaiData = await openaiResponse.json();

  if (!openaiResponse.ok) {
    throw new Error(`OpenAI Vision API error: ${JSON.stringify(openaiData)}`);
  }

  const extractedText = openaiData.choices[0].message.content;
  const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : extractedText);
}

function buildExtractionPrompt(documentText: string): string {
  return `You are an AI assistant specialized in extracting maintenance invoice data from equipment service documents.

Extract the following information from this maintenance invoice/work order and return it as JSON:

{
  "serial_numbers": ["array of all serial numbers, chassis numbers, or machine IDs found"],
  "fleet_numbers": ["array of all fleet numbers or internal equipment IDs found"],
  "document_date": "invoice or service date in YYYY-MM-DD format",
  "currency": "currency code (EUR, USD, GBP, etc.)",
  "supplier_name": "company or dealer name providing the service",
  "invoice_number": "invoice or document number",
  "line_items": [
    {
      "line_number": 1,
      "description": "detailed description of the work or parts",
      "amount_excl_vat": 150.00,
      "currency": "EUR",
      "category": "preventive or corrective or tires",
      "category_confidence": 0.85,
      "service_interval_hours": 500,
      "meter_reading": 12500,
      "serial_number": "optional: if this line applies to specific serial"
    }
  ]
}

CATEGORIZATION RULES:
- "preventive": Scheduled maintenance at intervals (e.g., "500 hour service", "1000 hr maintenance", "annual inspection", "PM service")
- "corrective": Unplanned repairs (e.g., "hydraulic leak repair", "electrical fault", "replace damaged part", "cylinder repair")
- "tires": Tire-related work (e.g., "mount tires", "tire replacement", "wheel assembly", "tire repair", "X-ray scan tires")

IMPORTANT NOTES:
- Look for keywords like "chassis", "serial", "machine no", "equipment ID", "fleet no"
- Serial numbers are often alphanumeric like "ABC123456" or "12345-ABC"
- For service interval, look for phrases like "500 hrs", "1000 hour service", "2000h inspection"
- For meter reading, look for "hour meter: 12345" or "hours: 12345" or similar
- If multiple machines on one invoice, try to match line items to specific serials
- If you cannot confidently categorize, set category_confidence to 0.5 or lower
- Return amounts without currency symbols, as decimal numbers
- Extract amounts EXCLUDING VAT/tax where possible

Document Text:
${documentText.substring(0, 12000)}

Return ONLY valid JSON, no additional text.`;
}

async function matchDocumentToDossiers(
  supabaseClient: any,
  customerId: string,
  serialNumbers: string[],
  fleetNumbers: string[]
) {
  const matches = [];

  for (const serial of serialNumbers) {
    if (!serial) continue;

    const { data, error } = await supabaseClient
      .from('dossiers')
      .select('id, dossiernummer, serienummer, fleet_number')
      .eq('customer_id', customerId)
      .ilike('serienummer', `%${serial}%`)
      .limit(10);

    if (data && data.length > 0) {
      matches.push(...data.map(d => ({ ...d, matched_by: 'serial', matched_value: serial })));
    }
  }

  if (matches.length === 0) {
    for (const fleet of fleetNumbers) {
      if (!fleet) continue;

      const { data, error } = await supabaseClient
        .from('dossiers')
        .select('id, dossiernummer, serienummer, fleet_number')
        .eq('customer_id', customerId)
        .ilike('fleet_number', `%${fleet}%`)
        .limit(10);

      if (data && data.length > 0) {
        matches.push(...data.map(d => ({ ...d, matched_by: 'fleet', matched_value: fleet })));
      }
    }
  }

  return matches;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { document_id, file_base64, file_type, customer_id } = await req.json();

    if (!document_id || !customer_id) {
      return new Response(
        JSON.stringify({ error: "document_id and customer_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from('maintenance_documents')
      .update({ extraction_status: 'processing' })
      .eq('id', document_id);

    let extractedData: ExtractionResult;

    if (file_type.includes('image')) {
      try {
        extractedData = await extractFromImageWithVision(file_base64, file_type, openaiApiKey);
      } catch (e) {
        await supabase
          .from('maintenance_documents')
          .update({
            extraction_status: 'failed',
            extraction_error: 'Vision API error: ' + e.message
          })
          .eq('id', document_id);

        return new Response(
          JSON.stringify({ error: "Failed to process image", details: e.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const documentText = await extractTextFromDocument(file_base64, file_type);

      if (!documentText || documentText.trim().length < 20) {
        await supabase
          .from('maintenance_documents')
          .update({
            extraction_status: 'failed',
            extraction_error: 'Could not extract text from document'
          })
          .eq('id', document_id);

        return new Response(
          JSON.stringify({ error: "Could not extract text from document" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const prompt = buildExtractionPrompt(documentText);

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
              content: "You are a specialized AI for extracting maintenance invoice data. Return only valid JSON."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      const openaiData = await openaiResponse.json();

      if (!openaiResponse.ok) {
        await supabase
          .from('maintenance_documents')
          .update({
            extraction_status: 'failed',
            extraction_error: JSON.stringify(openaiData)
          })
          .eq('id', document_id);

        return new Response(
          JSON.stringify({ error: "OpenAI API error", details: openaiData }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const extractedText = openaiData.choices[0].message.content;

      try {
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        extractedData = JSON.parse(jsonMatch ? jsonMatch[0] : extractedText);
      } catch (e) {
        await supabase
          .from('maintenance_documents')
          .update({
            extraction_status: 'failed',
            extraction_error: 'Failed to parse JSON: ' + e.message
          })
          .eq('id', document_id);

        return new Response(
          JSON.stringify({ error: "Failed to parse extraction result" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const matches = await matchDocumentToDossiers(
      supabase,
      customer_id,
      extractedData.serial_numbers || [],
      extractedData.fleet_numbers || []
    );

    let matchStatus = 'unmatched';
    let dossierId = null;

    if (matches.length === 1) {
      matchStatus = 'matched';
      dossierId = matches[0].id;
    } else if (matches.length > 1) {
      matchStatus = 'ambiguous';
    }

    await supabase
      .from('maintenance_documents')
      .update({
        extraction_status: 'completed',
        extraction_completed_at: new Date().toISOString(),
        raw_extraction_data: extractedData,
        serial_numbers: extractedData.serial_numbers,
        fleet_numbers: extractedData.fleet_numbers,
        document_date: extractedData.document_date,
        currency: extractedData.currency || 'EUR',
        supplier_name: extractedData.supplier_name,
        invoice_number: extractedData.invoice_number,
        match_status: matchStatus,
        dossier_id: dossierId,
        processed_at: new Date().toISOString()
      })
      .eq('id', document_id);

    if (extractedData.line_items && extractedData.line_items.length > 0) {
      const lineItemsToInsert = extractedData.line_items.map((item, index) => ({
        document_id: document_id,
        dossier_id: dossierId,
        line_number: item.line_number || (index + 1),
        description: item.description || '',
        amount_excl_vat: item.amount_excl_vat || 0,
        currency: item.currency || extractedData.currency || 'EUR',
        category: item.category || 'unclassified',
        category_confidence: item.category_confidence || 0.5,
        classified_by: 'ai',
        service_interval_hours: item.service_interval_hours,
        meter_reading: item.meter_reading
      }));

      await supabase
        .from('maintenance_line_items')
        .insert(lineItemsToInsert);
    }

    return new Response(
      JSON.stringify({
        success: true,
        extracted_data: extractedData,
        matches: matches,
        match_status: matchStatus,
        dossier_id: dossierId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing document:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
