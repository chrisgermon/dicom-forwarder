import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept-encoding',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse body safely
    let payload: any = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const search_query = (payload?.search_query ?? '').toString();

    if (!search_query || search_query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Search query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client for auth (with user's token)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's O365 connection
    const { data: userO365 } = await supabaseAdmin
      .from('office365_connections')
      .select('id, company_id, access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    const connection = userO365?.[0];

    if (!connection?.company_id) {
      const { data: anyConfigs } = await supabaseAdmin
        .from('sharepoint_configurations')
        .select('id')
        .eq('is_active', true)
        .limit(1);
      
      return new Response(
        JSON.stringify({ 
          configured: anyConfigs && anyConfigs.length > 0, 
          needsO365: true,
          error: 'Office 365 connection required',
          folders: [], 
          files: [] 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = connection.company_id;

    // Get SharePoint configuration
    console.log(`Looking for SharePoint config with company_id: ${companyId}`);
    
    const { data: configs, error: configError } = await supabaseAdmin
      .from('sharepoint_configurations')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (configError) {
      console.error('SharePoint config query error:', configError);
      return new Response(
        JSON.stringify({ 
          error: 'Error fetching SharePoint configuration',
          details: configError.message,
          configured: false,
          needsO365: false
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let spConfig = configs?.[0];

    if (!spConfig) {
      console.log('No SharePoint configuration found for company:', companyId);
      // Try fallback: get any active config
      const { data: fallbackConfig } = await supabaseAdmin
        .from('sharepoint_configurations')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (fallbackConfig?.[0]) {
        console.log('Using fallback SharePoint config:', fallbackConfig[0].id, 'for user company:', companyId);
        spConfig = fallbackConfig[0];
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'SharePoint not configured',
            configured: false,
            needsO365: false
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if token needs refresh
    let accessToken = connection.access_token;
    const expiresAtRaw = connection.expires_at ? new Date(connection.expires_at) : null;
    const refreshThreshold = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes buffer
    const needsRefresh = !accessToken || !expiresAtRaw || expiresAtRaw <= refreshThreshold;

    if (needsRefresh) {
      if (!connection.refresh_token) {
        return new Response(
          JSON.stringify({ 
            error: 'Office 365 connection expired. Please reconnect your Office 365 account.', 
            configured: true,
            needsO365: true,
            folders: [],
            files: []
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
      const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');

      console.log('Refreshing expired Office 365 token for search...');

      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token refresh failed:', errorText);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to refresh Office 365 token. Please reconnect your Office 365 account.', 
            configured: true,
            needsO365: true,
            folders: [],
            files: []
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await tokenResponse.json();
      accessToken = tokens.access_token;

      const updateData: Record<string, any> = {
        access_token: tokens.access_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (tokens.refresh_token) {
        updateData.refresh_token = tokens.refresh_token;
      }

      await supabaseAdmin
        .from('office365_connections')
        .update(updateData)
        .eq('id', connection.id);

      console.log('Token refreshed successfully for search');
    }

    // Use Microsoft Graph search API
    const searchUrl = `https://graph.microsoft.com/v1.0/sites/${spConfig.site_id}/drive/root/search(q='${encodeURIComponent(search_query)}')`;
    console.log(`SharePoint search for user ${user.id}, company ${companyId}: "${search_query}"`);

    const graphResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!graphResponse.ok) {
      const bodyText = await graphResponse.text().catch(() => '');
      console.error(`Graph search error ${graphResponse.status}: ${bodyText}`);

      if (graphResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Office 365 token expired',
            configured: true,
            needsO365: true
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient permissions for Microsoft Graph search',
            details: bodyText,
            configured: true,
            needsO365: true
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: `Graph API error: ${graphResponse.status}`,
          details: bodyText
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await graphResponse.json();

    // Process results
    const folders: Array<Record<string, any>> = [];
    const files: Array<Record<string, any>> = [];

    for (const item of data.value || []) {
      if (item.folder) {
        folders.push({
          id: item.id,
          name: item.name,
          webUrl: item.webUrl,
          path: item.parentReference?.path?.replace('/drive/root:', '') || '/',
          childCount: item.folder.childCount || 0,
          lastModifiedDateTime: item.lastModifiedDateTime,
        });
      } else if (item.file) {
        files.push({
          id: item.id,
          name: item.name,
          webUrl: item.webUrl,
          path: item.parentReference?.path?.replace('/drive/root:', '') || '/',
          size: item.size,
          createdDateTime: item.createdDateTime,
          lastModifiedDateTime: item.lastModifiedDateTime,
          createdBy: item.createdBy?.user?.displayName,
          lastModifiedBy: item.lastModifiedBy?.user?.displayName,
          fileType: (item.name || '').split('.').pop()?.toUpperCase() || 'FILE',
          downloadUrl: item['@microsoft.graph.downloadUrl'],
        });
      }
    }

    console.log(`Search returned ${folders.length} folders and ${files.length} files`);

    // Return response
    return new Response(
      JSON.stringify({
        folders,
        files,
        totalResults: folders.length + files.length,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
