import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine company context from Office 365 connection first
    const { data: userConnection } = await supabaseClient
      .from('office365_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .maybeSingle();

    // Fallback to profile brand if no connection yet
    let companyId = userConnection?.company_id as string | undefined;
    if (!companyId) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('brand_id')
        .eq('id', user.id)
        .maybeSingle();
      companyId = profile?.brand_id || user.id;
    }

    // Get the request body to check for custom folder path and overrides
    const body = await req.json().catch(() => ({}));
    const requestedFolderPath = body.folder_path as string | undefined;
    const requestedCompanyId = body.company_id as string | undefined;
    const requestedSiteId = body.site_id as string | undefined;

    // If a company_id was provided in the request, prefer it
    if (requestedCompanyId) {
      companyId = requestedCompanyId;
    }
    // Get SharePoint configuration for the resolved company
    const { data: spConfig } = await supabaseClient
      .from('sharepoint_configurations')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle();

    if (!spConfig) {
      return new Response(
        JSON.stringify({ error: 'SharePoint not configured' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the user's O365 connection (preferred) if it matches the target company, otherwise fallback to company-based
    let o365Connection = (userConnection && userConnection.company_id === companyId) ? userConnection : undefined;
    if (!o365Connection) {
      const { data } = await supabaseClient
        .from('office365_connections')
        .select('*')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .maybeSingle();
      o365Connection = data || undefined;
    }

    if (!o365Connection?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Office 365 not connected', needsO365: true }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = o365Connection.access_token;

    // Check if token needs refresh
    if (o365Connection.expires_at && new Date(o365Connection.expires_at) <= new Date()) {
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID') || '',
          client_secret: Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET') || '',
          refresh_token: o365Connection.refresh_token || '',
          grant_type: 'refresh_token',
        }),
      });

      if (tokenResponse.ok) {
        const tokens = await tokenResponse.json();
        accessToken = tokens.access_token;

        await supabaseClient
          .from('office365_connections')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || o365Connection.refresh_token,
            expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          })
          .eq('id', o365Connection.id);
      }
    }

    // Fetch files from SharePoint
    // Determine target folder path with canonical normalization
    const rawPath = requestedFolderPath !== undefined ? requestedFolderPath : (spConfig.folder_path || '/');
    const canonicalPath = (() => {
      if (!rawPath || typeof rawPath !== 'string' || rawPath.trim() === '' || rawPath === '/') return '/';
      const start = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
      return start.endsWith('/') ? start.slice(0, -1) : start;
    })();
    const siteId = requestedSiteId || spConfig.site_id;
    
    console.log(`Syncing SharePoint folder: "${canonicalPath}" for company: ${companyId}`);
    
    // Construct proper Graph API URL
    let graphUrl: string;
    if (canonicalPath !== '/') {
      const graphPath = canonicalPath.slice(1); // remove leading slash
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${graphPath}:/children`;
    } else {
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`;
    }

    const graphResponse = await fetch(graphUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!graphResponse.ok) {
      console.error('Graph API error:', await graphResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch files from SharePoint' }),
        { status: graphResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const graphData = await graphResponse.json();
    const items = graphData.value || [];

    // Sync files to cache table
    const cacheRecords = items.map((item: any) => ({
      company_id: companyId,
      item_type: item.folder ? 'folder' : 'file',
      item_id: item.id,
      parent_path: canonicalPath,
      name: item.name,
      web_url: item.webUrl,
      size: item.size || 0,
      child_count: item.folder?.childCount || 0,
      created_datetime: item.createdDateTime,
      last_modified_datetime: item.lastModifiedDateTime,
      created_by: item.createdBy?.user?.displayName || '',
      last_modified_by: item.lastModifiedBy?.user?.displayName || '',
      file_type: item.file?.mimeType || '',
      download_url: item['@microsoft.graph.downloadUrl'] || '',
      permissions: item.permissions || [],
      metadata: item,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
    }));

    // Upsert records into cache
    for (const record of cacheRecords) {
      await supabaseClient
        .from('sharepoint_cache')
        .upsert(record, {
          onConflict: 'company_id,item_id',
          ignoreDuplicates: false,
        });
    }

    console.log(`Synced ${cacheRecords.length} items to cache`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: cacheRecords.length,
        items: cacheRecords 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
