import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const users = [
      {
        email: 'manager@test.com',
        password: 'manager123',
        user_metadata: {
          full_name: 'Test Manager',
          role: 'manager'
        }
      },
      {
        email: 'verkoper@test.com',
        password: 'verkoper123',
        user_metadata: {
          full_name: 'Test Verkoper',
          role: 'verkoper'
        }
      },
      {
        email: 'handelaar@test.com',
        password: 'handelaar123',
        user_metadata: {
          full_name: 'Test Handelaar',
          role: 'handelaar'
        }
      }
    ];

    const results = [];

    for (const user of users) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: user.user_metadata
      });

      if (error) {
        results.push({ email: user.email, status: 'error', error: error.message });
      } else {
        results.push({ email: user.email, status: 'success', id: data.user.id });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});