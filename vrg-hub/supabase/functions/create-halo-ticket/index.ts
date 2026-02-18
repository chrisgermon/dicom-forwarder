import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HaloTicketRequest {
  summary: string;
  details: string;
  priority: number;
  category_id?: number;
  user_name: string;
  user_email: string;
}

interface HaloAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function getHaloAccessToken(): Promise<string> {
  const rawClientId = Deno.env.get('HALO_CLIENT_ID') ?? '';
  const rawClientSecret = Deno.env.get('HALO_CLIENT_SECRET') ?? '';
  const clientId = rawClientId.trim();
  const clientSecret = rawClientSecret.trim();
  const haloBaseUrl = 'https://crowditau.halopsa.com';
  const tenant = (Deno.env.get('HALO_TENANT') ?? '').trim();

  // Helpful diagnostics without exposing secret values
  console.log('HaloPSA secrets presence:', {
    hasId: Boolean(clientId),
    hasSecret: Boolean(clientSecret),
    tenant: tenant || null,
  });

  if (!clientId || !clientSecret) {
    throw new Error('HaloPSA credentials not configured');
  }

  console.log('Authenticating with HaloPSA...');

  const authUrl = tenant
    ? `${haloBaseUrl}/auth/token?tenant=${encodeURIComponent(tenant)}`
    : `${haloBaseUrl}/auth/token`;
  
  const formData = new URLSearchParams();
  formData.append('grant_type', 'client_credentials');
  formData.append('client_id', clientId);
  formData.append('client_secret', clientSecret);
  formData.append('scope', 'all');

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('HaloPSA auth error:', errorText);
    throw new Error(`Failed to authenticate with HaloPSA: ${response.status} - ${errorText}`);
  }

  const authData: HaloAuthResponse = await response.json();
  console.log('Successfully authenticated with HaloPSA');
  
  return authData.access_token;
}

async function createHaloTicket(
  accessToken: string,
  ticketData: HaloTicketRequest,
  companyId: string,
  supabaseClient: any
): Promise<any> {
  const haloBaseUrl = 'https://crowditau.halopsa.com';
  const ticketsUrl = `${haloBaseUrl}/api/Tickets`;

  console.log('Fetching HaloPSA integration settings for company...');

  // Get company HaloPSA settings
  const { data: haloSettings, error: settingsError } = await supabaseClient
    .from('halo_integration_settings')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (settingsError || !haloSettings) {
    console.error('HaloPSA settings not found:', settingsError);
    throw new Error('HaloPSA integration not configured for this company. Please contact your administrator.');
  }

  console.log('Creating ticket in HaloPSA with settings:', {
    client_id: haloSettings.halo_client_id,
    site_id: haloSettings.halo_site_id,
    auto_create_users: haloSettings.auto_create_users,
  });

  // Format ticket data according to HaloPSA API schema
  // HaloPSA expects an array of tickets, not a single object
  const ticketPayload = [{
    summary: ticketData.summary,
    details: ticketData.details,
    priority_id: ticketData.priority,
    category_1: ticketData.category_id || 1,
    tickettype_id: 1, // Default to incident type
    user_name: ticketData.user_name,
    reportedby: ticketData.user_email,
    client_id: haloSettings.halo_client_id,
    client_name: haloSettings.halo_client_name,
    ...(haloSettings.halo_site_id && { site_id: haloSettings.halo_site_id }),
    ...(haloSettings.halo_site_name && { site_name: haloSettings.halo_site_name }),
    ...(haloSettings.halo_default_user_id && { user_id: haloSettings.halo_default_user_id }),
  }];

  const response = await fetch(ticketsUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ticketPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('HaloPSA create ticket error:', errorText);
    throw new Error(`Failed to create ticket: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('Ticket created successfully:', result);
  
  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user profile for additional information
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('name, email, company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'User company not found' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const requestData: HaloTicketRequest = await req.json();

    // Add user information to ticket
    const ticketData: HaloTicketRequest = {
      ...requestData,
      user_name: profile?.name || 'Unknown User',
      user_email: profile?.email || user.email || '',
    };

    // Get access token and create ticket
    const accessToken = await getHaloAccessToken();
    const ticket = await createHaloTicket(accessToken, ticketData, profile.company_id, supabaseClient);

    return new Response(
      JSON.stringify({
        success: true,
        ticket_id: ticket.id,
        ticket_number: ticket.id,
        message: 'Help ticket created successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in create-halo-ticket function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create help ticket',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
