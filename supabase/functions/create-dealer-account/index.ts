import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateDealerAccountRequest {
  dealerId: string;
  email: string;
  name: string;
  password: string;
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { dealerId, email, name, password }: CreateDealerAccountRequest = await req.json();

    console.log("Creating auth user with email:", email);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: "dealer",
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    console.log("Auth user created:", authData.user.id);

    const { error: updateDealerError } = await supabase
      .from("dealers")
      .update({ auth_user_id: authData.user.id })
      .eq("id", dealerId);

    if (updateDealerError) {
      console.error("Dealer update error:", updateDealerError);
      throw new Error(`Failed to link dealer: ${updateDealerError.message}`);
    }

    console.log("Dealer linked successfully");

    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", authData.user.id)
      .single();

    if (existingProfile) {
      console.log("Updating existing profile");
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          role: "dealer",
          dealer_id: dealerId
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }
    } else {
      console.log("Creating new profile");
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          id: authData.user.id,
          role: "dealer",
          dealer_id: dealerId,
          name: name
        });

      if (profileError) {
        console.error("Profile insert error:", profileError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authData.user.id,
        email,
        password,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating dealer account:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
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