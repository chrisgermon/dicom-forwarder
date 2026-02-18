// Using Deno.serve instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { password } = await req.json();

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Create the system admin user
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: 'crowdit@system.local',
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: 'System Administrator',
      }
    });

    if (userError) {
      if (userError.message.includes('already registered')) {
        throw new Error('System admin account already exists');
      }
      throw userError;
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.user.id,
        email: 'crowdit@system.local',
        full_name: 'System Administrator',
      });

    if (profileError && !profileError.message.includes('duplicate')) {
      console.error('Profile creation error:', profileError);
    }

    // Assign super_admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: user.user.id,
        role: 'super_admin',
      });

    if (roleError && !roleError.message.includes('duplicate')) {
      console.error('Role assignment error:', roleError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'System admin account created successfully',
        email: 'crowdit@system.local',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
