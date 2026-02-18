// Using Deno.serve instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { o365User, role, companyId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user already exists in auth
    let userId: string;
    let userAlreadyExists = false;
    
    try {
      // Try to get existing user by email
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u: any) => u.email === o365User.mail);
      
      if (existingUser) {
        userId = existingUser.id;
        userAlreadyExists = true;
        console.log(`User ${o365User.mail} already exists with ID ${userId}`);
      } else {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: o365User.mail,
          email_confirm: true,
          user_metadata: {
            full_name: o365User.display_name,
            imported_from_o365: true,
          }
        });

        if (authError) {
          // If error is about duplicate user, try to find the existing user
          if (authError.message.includes('already been registered')) {
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find((u: any) => u.email === o365User.mail);
            if (existingUser) {
              userId = existingUser.id;
              userAlreadyExists = true;
            } else {
              throw authError;
            }
          } else {
            throw authError;
          }
        } else {
          userId = authData.user.id;
        }
      }
    } catch (error) {
      console.error('Error handling user:', error);
      throw error;
    }

    // Update or create profile (trigger may have already created it)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: o365User.display_name,
        email: o365User.mail,
        department: o365User.department,
        phone: o365User.business_phones?.[0] || o365User.mobile_phone,
        location: o365User.office_location,
        is_active: false, // Inactive until first sign-in
        imported_from_o365: true,
      }, {
        onConflict: 'id'
      });

    if (profileError) throw profileError;

    // Skip company membership - not all setups have this table
    // Create company membership
    // const { data: membership, error: membershipError } = await supabase
    //   .from('company_memberships')
    //   .insert({
    //     user_id: userId,
    //     company_id: companyId,
    //     is_primary: true,
    //     status: 'active',
    //   })
    //   .select()
    //   .maybeSingle();

    // Assign role (use INSERT ... ON CONFLICT DO NOTHING to handle trigger-assigned roles)
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
      })
      .select()
      .maybeSingle();

    // Ignore duplicate key errors since trigger may have already assigned role
    if (roleError && roleError.code !== '23505') throw roleError;

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        user_email: user.email,
        action: 'import_office365_user',
        table_name: 'profiles',
        record_id: userId,
        new_data: {
          imported_user_email: o365User.mail,
          imported_user_name: o365User.display_name,
          assigned_role: role,
        },
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        userId,
        email: o365User.mail,
        message: userAlreadyExists ? 'User profile updated successfully' : 'User imported successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
