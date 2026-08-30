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
      { email: 'manager@test.com', password: 'Test123!' },
      { email: 'verkoper@test.com', password: 'Test123!' },
      { email: 'handelaar@test.com', password: 'Test123!' }
    ];

    const results = [];

    for (const user of users) {
      // Get user by email
      const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (getUserError) {
        results.push({ email: user.email, status: 'error', error: getUserError.message });
        continue;
      }

      const existingUser = userData.users.find(u => u.email === user.email);
      
      if (!existingUser) {
        results.push({ email: user.email, status: 'error', error: 'User not found' });
        continue;
      }

      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: user.password }
      );

      if (updateError) {
        results.push({ email: user.email, status: 'error', error: updateError.message });
      } else {
        results.push({ email: user.email, status: 'success', message: 'Password updated to Test123!' });
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