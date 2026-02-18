import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Track whether a SharePoint config exists to help the client show accurate messaging
  let configAvailable = false;

  try {
    console.log('SharePoint browse-folders request received');
    
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header found in request');
      return new Response(
        JSON.stringify({ 
          error: 'Missing authorization header. Please refresh the page and try again.', 
          configured: false 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Admin client (service role) to safely read company-level configuration/tokens
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      console.error('User authentication failed');
      return new Response(
        JSON.stringify({ 
          error: 'Not authenticated. Please log in again.', 
          configured: false 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.email);

    let requestBody: Record<string, any> = {};
    if (req.headers.get('content-type')?.includes('application/json')) {
      try {
        requestBody = await req.json();
      } catch (parseError) {
        console.error('Failed to parse request body, defaulting to empty object:', parseError);
      }
    }

    const folder_path = typeof requestBody.folder_path === 'string'
      ? requestBody.folder_path
      : undefined;

    // First, check if the user has connected their Office 365 account
    const { data: userO365 } = await supabaseAdmin
      .from('office365_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    const userConnection = userO365?.[0];

    if (!userConnection?.company_id) {
      // User hasn't connected their Office 365 account yet
      // Check if ANY SharePoint config exists to provide better error messaging
      const { data: anyConfigs } = await supabaseAdmin
        .from('sharepoint_configurations')
        .select('id')
        .eq('is_active', true)
        .limit(1);
      
      const sharepointConfigured = anyConfigs && anyConfigs.length > 0;
      
      return new Response(
        JSON.stringify({ 
          configured: sharepointConfigured, 
          needsO365: true,
          error: sharepointConfigured 
            ? 'Connect your Office 365 account to access SharePoint documents' 
            : 'SharePoint is not configured yet',
          folders: [], 
          files: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired and refresh if needed
    let connection = userConnection;
    const now = new Date();
    const expiresAtString = connection.token_expires_at || connection.expires_at;
    const expiresAt = expiresAtString ? new Date(expiresAtString) : null;
    const tokenExpired = !expiresAt || Number.isNaN(expiresAt.getTime()) || now >= expiresAt;

    if (tokenExpired) {
      console.log('Access token expired, refreshing...');
      
      if (!connection.refresh_token) {
        return new Response(
          JSON.stringify({ 
            error: 'Your Office 365 connection expired and cannot be refreshed. Please reconnect in Integrations.', 
            configured: true,
            needsO365: true,
            folders: [],
            files: []
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Refresh the token
      const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
      const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');
      
      const tokenResponse = await fetch(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId!,
            client_secret: clientSecret!,
            refresh_token: connection.refresh_token,
            grant_type: 'refresh_token',
          }),
        }
      );

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token refresh failed:', errorText);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to refresh Office 365 token. Please reconnect in Integrations.', 
            configured: true,
            needsO365: true,
            folders: [],
            files: []
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await tokenResponse.json();
      const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Update the connection with new tokens
      const newExpiryIso = newExpiresAt.toISOString();

      const updateData: Record<string, any> = {
        access_token: tokens.access_token,
        expires_at: newExpiryIso,
        token_expires_at: newExpiryIso,
        updated_at: new Date().toISOString(),
      };
      if (tokens.refresh_token) {
        updateData.refresh_token = tokens.refresh_token;
      }

      const { error: updateError } = await supabaseAdmin
        .from('office365_connections')
        .update(updateData)
        .eq('id', connection.id);

      if (updateError) {
        console.error('Failed to update refreshed token:', updateError);
      } else {
        console.log('Token refreshed successfully');
        connection = { ...connection, ...updateData };
      }
    }

    const companyId = userConnection.company_id;

    // Check if SharePoint is configured for this user's company
    const { data: configs } = await supabaseAdmin
      .from('sharepoint_configurations')
      .select('site_id, folder_path, company_id, updated_at')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    const config = configs?.[0];

    if (!config) {
      return new Response(
        JSON.stringify({ 
          configured: false, 
          needsO365: false,
          error: 'SharePoint not configured for your company',
          folders: [], 
          files: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark that a config exists
    configAvailable = true;

    console.log('SharePoint config found for company:', config.company_id);
    console.log('User has Office 365 connection with valid token');

    // Use the user's own Office 365 token to respect their permissions
    
    if (!connection?.access_token) {
      console.error('No valid Office 365 token found for user:', user.email);
      return new Response(
        JSON.stringify({ 
          error: 'Your Office 365 connection expired. Please reconnect in Integrations.', 
          configured: true,
          needsO365: true,
          folders: [],
          files: []
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using Office 365 token for company');

    // Determine the path to browse
    const basePath = config.folder_path || '/';
    const browsePath = folder_path || basePath;

    // Construct the Graph API URL
    let graphUrl: string;
    if (browsePath === '/' || browsePath === '') {
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/root/children`;
    } else {
      const cleanPath = browsePath.replace(/^\/+/, '').replace(/\/+$/, '');
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/root:/${cleanPath}:/children`;
    }

    console.log('Fetching from Graph API:', graphUrl);

    const graphResponse = await fetch(graphUrl, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error('Graph API error:', errorText);
      throw new Error(`Graph API error: ${graphResponse.status}`);
    }

    const graphData = await graphResponse.json();
    const items = graphData.value || [];

    // Separate folders and files
    const folders = items
      .filter((item: any) => item.folder)
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        webUrl: item.webUrl,
        childCount: item.folder?.childCount || 0,
        lastModifiedDateTime: item.lastModifiedDateTime,
      }));

    const files = items
      .filter((item: any) => item.file)
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        webUrl: item.webUrl,
        size: item.size || 0,
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        createdBy: item.createdBy?.user?.displayName,
        lastModifiedBy: item.lastModifiedBy?.user?.displayName,
        fileType: item.name.split('.').pop()?.toUpperCase() || 'FILE',
        downloadUrl: item['@microsoft.graph.downloadUrl'],
      }));

    return new Response(
      JSON.stringify({
        configured: true,
        currentPath: browsePath,
        folders,
        files,
        siteName: config.site_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error browsing SharePoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, configured: configAvailable }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
