import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { userId, companyId } = await req.json();

    if (!userId || !companyId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Syncing single user: ${userId} for company: ${companyId}`);

    // Get the Office 365 connection (most recent for this company)
    const { data: connection, error: connError } = await supabaseClient
      .from('office365_connections')
      .select('*')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (connError || !connection) {
      console.error('Connection error:', connError);
      return new Response(JSON.stringify({ error: 'Office 365 connection not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if token needs refresh
    let accessToken = connection.access_token;
    if (connection.token_expires_at && new Date(connection.token_expires_at) <= new Date()) {
      console.log('Access token expired, refreshing...');
      
      const clientId = Deno.env.get('OFFICE365_CLIENT_ID');
      const clientSecret = Deno.env.get('OFFICE365_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        return new Response(JSON.stringify({ error: 'OAuth credentials not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        console.error('Token refresh failed');
        return new Response(JSON.stringify({ error: 'Failed to refresh access token' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;

      // Update connection with new token
      await supabaseClient
        .from('office365_connections')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        })
        .eq('id', connection.id);
    }

    // Fetch the specific user from Microsoft Graph
    console.log(`Fetching user ${userId} from Microsoft Graph...`);
    const userResponse = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}?$select=id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation,businessPhones,mobilePhone`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!userResponse.ok) {
      console.error('Failed to fetch user from Graph API');
      return new Response(JSON.stringify({ error: 'Failed to fetch user from Office 365' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userData = await userResponse.json();

    // Fetch licenses for the user
    const licenseResponse = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}/licenseDetails`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    let licenses: any[] = [];
    if (licenseResponse.ok) {
      const licenseData = await licenseResponse.json();
      licenses = licenseData.value || [];
    }

    // Upsert user data into synced_office365_users
    const userRecord = {
      company_id: companyId,
      user_principal_name: userData.userPrincipalName,
      display_name: userData.displayName,
      mail: userData.mail,
      job_title: userData.jobTitle,
      department: userData.department,
      office_location: userData.officeLocation,
      business_phones: userData.businessPhones,
      mobile_phone: userData.mobilePhone,
      assigned_licenses: licenses,
      synced_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseClient
      .from('synced_office365_users')
      .upsert(userRecord, {
        onConflict: 'company_id,user_principal_name',
      });

    if (upsertError) {
      console.error('Error upserting user:', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to save user data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Successfully synced user: ${userData.displayName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userRecord,
        message: `User ${userData.displayName} synced successfully`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error syncing single user:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
