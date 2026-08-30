import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UpdateUserRequest {
  userId: string;
  email: string;
  full_name: string;
  role: string;
  active: boolean;
  has_taxatietool_access: boolean;
  dealerId?: string;
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "manager") {
      throw new Error("Only managers can update users");
    }

    const {
      userId,
      email,
      full_name,
      role,
      active,
      has_taxatietool_access,
      dealerId
    }: UpdateUserRequest = await req.json();

    if (!userId) {
      throw new Error("userId is required");
    }

    console.log("Updating user:", userId);

    if (dealerId) {
      console.log("Updating dealer:", dealerId);
      const { error: dealerError } = await supabase
        .from("dealers")
        .update({
          name: full_name,
          email: email,
          active: active,
        })
        .eq("id", dealerId);

      if (dealerError) {
        console.error("Dealer update error:", dealerError);
        throw new Error(`Failed to update dealer: ${dealerError.message}`);
      }
    }

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        full_name: full_name,
        email: email,
        role: role,
        active: active,
        has_taxatietool_access: has_taxatietool_access,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      throw new Error(`Failed to update user profile: ${profileError.message}`);
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      { email: email }
    );

    if (authError) {
      console.error("Auth update error:", authError);
    }

    console.log("User updated successfully");

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
