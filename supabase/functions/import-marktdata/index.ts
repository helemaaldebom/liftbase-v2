import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CSVRow {
  [key: string]: string;
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "" || value === "0" || value === "#WAARDE!") {
    return null;
  }

  const cleaned = value.replace(/[€\s]/g, "");

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized = cleaned;

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".");
  }

  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower === "ja" || lower === "yes" || lower === "true";
}

function mapEquipmentType(type: string): string {
  const lower = type.toLowerCase().trim();
  const typeMap: Record<string, string> = {
    "heavy duty forklift": "forklift",
    "heavy_duty_forklift": "forklift",
    "forklift": "forklift",
    "heftruck": "forklift",
    "empty container handler": "empty_container_handler",
    "empty_container_handler": "empty_container_handler",
    "ech": "empty_container_handler",
    "reachstacker": "reachstacker",
    "reach stacker": "reachstacker",
    "terminal tractor": "terminal_tractor",
    "terminal_tractor": "terminal_tractor",
    "terminaltractor": "terminal_tractor",
    "overige": "other",
    "other": "other",
  };
  return typeMap[lower] || "other";
}

function getFieldValue(row: CSVRow, ...possibleKeys: string[]): string | undefined {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== '') {
      return row[key];
    }
  }
  return undefined;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { csvData } = await req.json();

    if (!csvData || !Array.isArray(csvData)) {
      throw new Error("Invalid CSV data provided");
    }

    const { data: managers } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("role", "manager")
      .limit(1);

    const managerId = managers && managers.length > 0 ? managers[0].id : null;

    if (!managerId) {
      throw new Error("No manager user found");
    }

    const records = [];
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    if (csvData.length > 0) {
      const firstRow = csvData[0] as CSVRow;
      console.log('Available columns:', Object.keys(firstRow));
      console.log('First row data sample:', {
        'Merk': firstRow['Merk'],
        'Type': firstRow['Type'],
        'Machinetype': firstRow['Machinetype']
      });
    }

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i] as CSVRow;
      try {
        const merk = getFieldValue(row, 'Merk', 'merk', 'brand');
        const type = getFieldValue(row, 'Type', 'type', 'model');
        const equipmentTypeRaw = getFieldValue(row, 'Machinetype', 'equipment_type', 'Type of machine', 'Machine Type');

        console.log(`Row ${i + 1} - merk: "${merk}", type: "${type}", equipmentType: "${equipmentTypeRaw}"`);

        if (!merk || !type) {
          skippedCount++;
          const errorMsg = `Rij ${i + 1}: Merk of Type ontbreekt (merk: "${merk}", type: "${type}")`;
          console.log(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        const equipmentType = equipmentTypeRaw ? mapEquipmentType(equipmentTypeRaw) : 'other';
        const bouwjaar = parseNumber(getFieldValue(row, 'Bouwjaar', 'bouwjaar', 'year', 'Year'));
        const uren = parseNumber(getFieldValue(row, 'Afgelezen urenstand', 'uren', 'hours', 'Hours'));
        const capaciteit = parseNumber(getFieldValue(row, 'Capaciteit', 'capaciteit', 'capacity'));
        const lastzwaartepunt = parseNumber(getFieldValue(row, 'Lastzwaartepunt (mm)', 'lastzwaartepunt', 'load_center'));
        const hefhoogte = parseNumber(getFieldValue(row, 'Hefhoogte', 'hefhoogte', 'Lifting height', 'lifting_height'));
        const inkoopprijs = parseNumber(getFieldValue(row, 'Inkoopprijs', 'inkoopprijs', 'purchase_price', 'Purchase price'));
        const handelsprijs = parseNumber(getFieldValue(row, 'Handelsprijs', 'handelsprijs', 'Trading price', 'trading_price'));
        const eindklantprijs = parseNumber(getFieldValue(row, 'Eindklantprijs', 'eindklantprijs', 'Enduser price', 'enduser_price'));
        const capacityRow1 = parseNumber(getFieldValue(row, 'Capaciteit 1e rij', 'capacity_row1', 'Capacity Row 1'));
        const capacityRow2 = parseNumber(getFieldValue(row, 'Capaciteit 2e rij', 'capacity_row2', 'Capacity Row 2'));
        const capacityRow3 = parseNumber(getFieldValue(row, 'Capaciteit 3e rij', 'capacity_row3', 'Capacity Row 3'));

        const title = `${merk} ${type} ${bouwjaar || ""}`.trim();

        const locatie = getFieldValue(row, 'Locatie', 'locatie', 'location', 'Location');
        const serienummer = getFieldValue(row, 'Serienummer', 'serienummer', 'serial_number', 'Serial Number');
        const brandstof = getFieldValue(row, 'Brandstof / aandrijving', 'brandstof', 'fuel', 'Fuel');
        const masttype = getFieldValue(row, 'Mast type', 'masttype', 'mast_type');
        const aanbouwdeel = getFieldValue(row, 'Aanbouwdeel', 'aanbouwdeel', 'Attachment', 'attachment');
        const remarks = getFieldValue(row, 'Notities', 'marktdata_notities', 'Remarks', 'remarks', 'description');
        const dossierNumber = getFieldValue(row, 'Dossiernummer', 'dossier_number', 'dossier', 'Dossier');
        const land = getFieldValue(row, 'Land', 'land', 'country', 'Country');
        const verkoopdatum = getFieldValue(row, 'Verkoopdatum', 'verkoopdatum', 'sale_date', 'Sale Date');

        const record = {
          title,
          equipment_type: equipmentType,
          brand: merk || "",
          model: type || "",
          year: bouwjaar,
          location: locatie || null,
          description: remarks || "",
          is_marktdata: true,
          status: "archived",
          created_by: managerId,
          purchase_price: inkoopprijs,
          handelsprijs,
          eindklantprijs,
          dossier_number: dossierNumber || `IMPORT-${Date.now()}-${i}`,
          marktdata_notities: remarks || "",
          marktdata_ingevoerd_door: managerId,
          marktdata_invoerdatum: new Date().toISOString(),
          serial_number: serienummer || null,
          fuel_type: brandstof || null,
          capacity: capaciteit,
          lastzwaartepunt: lastzwaartepunt,
          lifting_height: hefhoogte,
          free_lift: parseNumber(getFieldValue(row, 'Vrije hef', 'vrije_hef', 'free_lift', 'Free Lift')),
          hours: uren,
          mast_type: masttype || null,
          attachment: aanbouwdeel || null,
          country: land || null,
          sale_date: verkoopdatum || null,
          capacity_row1: capacityRow1,
          capacity_row2: capacityRow2,
          capacity_row3: capacityRow3,
        };

        if (record.dossier_number && !record.dossier_number.startsWith('IMPORT-')) {
          const { data: existing } = await supabase
            .from("dossiers")
            .select("id")
            .eq("dossier_number", record.dossier_number)
            .maybeSingle();

          if (existing) {
            skippedCount++;
            console.log(`Skipping duplicate dossier_number: ${record.dossier_number}`);
            continue;
          }
        }

        const { error } = await supabase
          .from("dossiers")
          .insert(record);

        if (error) {
          if (error.code === '23505') {
            skippedCount++;
            console.log(`Skipped duplicate: ${record.title}`);
          } else {
            errorCount++;
            errors.push(`Rij ${i + 1} (${record.title}): ${error.message}`);
            console.error('Insert error for row', i + 1, ':', error);
          }
        } else {
          successCount++;
        }
      } catch (err) {
        errorCount++;
        const errorMsg = `Rij ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`;
        errors.push(errorMsg);
        console.error('Processing error for row', i + 1, ':', err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: successCount,
        errors: errorCount,
        skipped: skippedCount,
        errorDetails: errors.slice(0, 10),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
