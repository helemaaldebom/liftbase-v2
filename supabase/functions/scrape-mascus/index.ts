import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Equipment types we want to scrape
const TARGET_EQUIPMENT_TYPES = [
  "reachstacker",
  "empty container handler",
  "terminal tractor",
  "forklift" // Will filter on capacity >= 10 ton
];

interface MascusListing {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  year?: number;
  hours?: number;
  location?: string;
  url: string;
  brand?: string;
  model?: string;
  capacity?: number;
  equipmentType?: string;
  description?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Mascus API credentials from environment
    const mascusApiKey = Deno.env.get("MASCUS_API_KEY");
    
    if (!mascusApiKey) {
      throw new Error("MASCUS_API_KEY not configured");
    }

    console.log("Starting Mascus scraping...");
    
    const scrapedListings: MascusListing[] = [];
    const errors: string[] = [];

    // TODO: Implement actual Mascus API calls
    // For now, this is a placeholder structure
    
    // Example structure for API call:
    // const response = await fetch(`https://api.mascus.com/v1/listings?api_key=${mascusApiKey}&category=material-handling`);
    // const data = await response.json();

    // Filter and process listings
    const validListings = scrapedListings.filter(listing => {
      // RULE 1: Must have a price
      if (!listing.price || listing.price <= 0) {
        console.log(`Skipping ${listing.title} - No price`);
        return false;
      }

      // RULE 2: Must be target equipment type
      const isTargetType = TARGET_EQUIPMENT_TYPES.some(type => 
        listing.title?.toLowerCase().includes(type) ||
        listing.equipmentType?.toLowerCase().includes(type)
      );

      if (!isTargetType) {
        console.log(`Skipping ${listing.title} - Not target equipment type`);
        return false;
      }

      // RULE 3: For forklifts, capacity must be >= 10 ton
      if (listing.equipmentType?.toLowerCase().includes("forklift")) {
        if (!listing.capacity || listing.capacity < 10) {
          console.log(`Skipping ${listing.title} - Forklift capacity < 10 ton`);
          return false;
        }
      }

      return true;
    });

    console.log(`Found ${validListings.length} valid listings out of ${scrapedListings.length} total`);

    // Check for duplicates and insert into database
    let insertedCount = 0;
    let duplicateCount = 0;

    for (const listing of validListings) {
      try {
        // Check if URL already exists in database
        const { data: existing } = await supabase
          .from("dossiers")
          .select("id")
          .eq("marktdata_bron_url", listing.url)
          .maybeSingle();

        if (existing) {
          duplicateCount++;
          console.log(`Duplicate found: ${listing.url}`);
          
          // Update last_scraped_check to indicate listing is still active
          await supabase
            .from("dossiers")
            .update({
              last_scraped_check: new Date().toISOString(),
              advertentie_actief: true
            })
            .eq("id", existing.id);
          
          continue;
        }

        // Determine equipment type
        let equipmentType = "forklift";
        if (listing.title?.toLowerCase().includes("reachstacker")) {
          equipmentType = "reachstacker";
        } else if (listing.title?.toLowerCase().includes("empty container handler")) {
          equipmentType = "empty_container_handler";
        } else if (listing.title?.toLowerCase().includes("terminal tractor")) {
          equipmentType = "terminal_tractor";
        }

        // Insert new listing as marktdata
        const { error: insertError } = await supabase
          .from("dossiers")
          .insert({
            titel: listing.title,
            equipment_type: equipmentType,
            merk: listing.brand || "Onbekend",
            type: listing.model || "",
            bouwjaar: listing.year,
            urenstand: listing.hours,
            locatie: listing.location,
            handelsprijs: listing.price,
            marktdata_bron: "Mascus",
            marktdata_bron_url: listing.url,
            source_website: "mascus",
            is_scraped: true,
            scraped_at: new Date().toISOString(),
            last_scraped_check: new Date().toISOString(),
            advertentie_actief: true,
            status: "marktdata",
            omschrijving: listing.description || ""
          });

        if (insertError) {
          errors.push(`Failed to insert ${listing.title}: ${insertError.message}`);
          console.error(insertError);
        } else {
          insertedCount++;
          console.log(`Inserted: ${listing.title}`);
        }
      } catch (err) {
        errors.push(`Error processing ${listing.title}: ${err.message}`);
        console.error(err);
      }
    }

    const result = {
      success: true,
      source: "mascus",
      totalScraped: scrapedListings.length,
      validListings: validListings.length,
      inserted: insertedCount,
      duplicates: duplicateCount,
      errors: errors,
      timestamp: new Date().toISOString()
    };

    console.log("Scraping completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scraping error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
