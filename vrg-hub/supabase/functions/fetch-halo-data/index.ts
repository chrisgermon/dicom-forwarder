import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    throw new Error(`Failed to authenticate with HaloPSA: ${response.status}`);
  }

  const authData: HaloAuthResponse = await response.json();
  console.log('Successfully authenticated with HaloPSA');
  
  return authData.access_token;
}

async function fetchHaloClients(accessToken: string): Promise<any[]> {
  const haloBaseUrl = 'https://crowditau.halopsa.com';
  const clientsUrl = `${haloBaseUrl}/api/Client`;

  console.log('Fetching clients from HaloPSA...');

  const response = await fetch(clientsUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('HaloPSA fetch clients error:', errorText);
    throw new Error(`Failed to fetch clients: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('HaloPSA clients response:', JSON.stringify(result).substring(0, 500));
  
  // HaloPSA returns data in a 'clients' array or directly as array
  const clients = result.clients || result;
  
  if (!Array.isArray(clients)) {
    console.error('Unexpected clients response format:', typeof result);
    throw new Error('Invalid response format from HaloPSA');
  }
  
  console.log(`Fetched ${clients.length} clients`);
  return clients;
}

async function fetchHaloSites(accessToken: string, clientId: number): Promise<any[]> {
  const haloBaseUrl = 'https://crowditau.halopsa.com';
  const sitesUrl = `${haloBaseUrl}/api/Site?client_id=${clientId}`;

  console.log(`Fetching sites for client ${clientId} from HaloPSA...`);

  const response = await fetch(sitesUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('HaloPSA fetch sites error:', errorText);
    throw new Error(`Failed to fetch sites: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('HaloPSA sites response:', JSON.stringify(result).substring(0, 500));
  
  // HaloPSA returns data in a 'sites' array or directly as array
  const sites = result.sites || result;
  
  if (!Array.isArray(sites)) {
    console.error('Unexpected sites response format:', typeof result);
    throw new Error('Invalid response format from HaloPSA');
  }
  
  console.log(`Fetched ${sites.length} sites`);
  return sites;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, clientId } = await req.json();

    const accessToken = await getHaloAccessToken();

    let data;
    if (type === 'clients') {
      data = await fetchHaloClients(accessToken);
    } else if (type === 'sites' && clientId) {
      data = await fetchHaloSites(accessToken, clientId);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid request type or missing clientId for sites' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in fetch-halo-data function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to fetch HaloPSA data',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
