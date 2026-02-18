const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/azure-login-callback`;
    
    if (!clientId) {
      throw new Error('Microsoft Graph Client ID not configured');
    }

    // Include the caller origin in state for accurate post-login redirect
    const origin = req.headers.get('origin') || 'https://hub.visionradiology.com.au';
    const statePayload = { n: crypto.randomUUID(), r: origin };
    const state = btoa(JSON.stringify(statePayload));
    
    // Include comprehensive Office 365 scopes to enable SharePoint access
    // Admin consent has been granted for these scopes
    const scopes = [
      'offline_access',
      'openid',
      'profile',
      'email',
      'User.Read',
      'Files.ReadWrite.All',
      'Sites.ReadWrite.All',
      'User.ReadBasic.All'
    ].join(' ');
    
    // Build the Microsoft authorization URL
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('prompt', 'select_account'); // Allow account selection

    console.log('Azure login initiated:', { redirectUri, state });

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error initiating Azure login:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});