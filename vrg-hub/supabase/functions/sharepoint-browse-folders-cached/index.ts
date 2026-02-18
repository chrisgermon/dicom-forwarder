import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept-encoding',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CACHE_TTL_HOURS = 4; // Cache expires after 4 hours for better performance

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let configAvailable = false;

  try {
    console.log('SharePoint browse-folders-cached request received');
    
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing authorization header', 
          configured: false 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated', configured: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { folder_path, force_refresh } = await req.json();

    // Get user's O365 connection
    const { data: userO365 } = await supabaseAdmin
      .from('office365_connections')
      .select('id, company_id, access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    const userConnection = userO365?.[0];

    if (!userConnection?.company_id) {
      const { data: anyConfigs } = await supabaseAdmin
        .from('sharepoint_configurations')
        .select('id')
        .eq('is_active', true)
        .limit(1);
      
      return new Response(
        JSON.stringify({ 
          configured: anyConfigs && anyConfigs.length > 0, 
          needsO365: true,
          folders: [], 
          files: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = userConnection.company_id;

    // Check SharePoint configuration
    const { data: configs } = await supabaseAdmin
      .from('sharepoint_configurations')
      .select('site_id, folder_path, company_id, site_url')
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
          folders: [], 
          files: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    configAvailable = true;

    const basePath = config.folder_path || '/';
    const browsePath = folder_path || basePath;

    // Try to get from cache first (unless force_refresh is true)
    if (!force_refresh) {
      const { data: cachedItems } = await supabaseAdmin
        .from('sharepoint_cache')
        .select('*')
        .eq('company_id', companyId)
        .eq('parent_path', browsePath)
        .gt('expires_at', new Date().toISOString());

      if (cachedItems && cachedItems.length > 0) {
        console.log(`Returning ${cachedItems.length} items from cache for path: ${browsePath}`);
        
        const folders = cachedItems
          .filter(item => item.item_type === 'folder')
          .map(item => ({
            id: item.item_id,
            name: item.name,
            webUrl: item.web_url,
            childCount: item.child_count || 0,
            lastModifiedDateTime: item.last_modified_datetime,
            permissions: item.permissions,
          }));

        const files = cachedItems
          .filter(item => item.item_type === 'file')
          .map(item => ({
            id: item.item_id,
            name: item.name,
            webUrl: item.web_url,
            size: item.size || 0,
            createdDateTime: item.created_datetime,
            lastModifiedDateTime: item.last_modified_datetime,
            createdBy: item.created_by,
            lastModifiedBy: item.last_modified_by,
            fileType: item.file_type,
            downloadUrl: item.download_url,
            permissions: item.permissions,
          }));

        return new Response(
          JSON.stringify({
            configured: true,
            currentPath: browsePath,
            folders,
            files,
            fromCache: true,
            cachedAt: cachedItems[0]?.cached_at,
            siteUrl: config.site_url || undefined,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Cache miss or force refresh - fetch from Microsoft Graph
    console.log('Cache miss or force refresh, fetching from Microsoft Graph API');

    // Check if token needs refresh
    let accessToken = userConnection.access_token;
    const expiresAtRaw = userConnection.expires_at ? new Date(userConnection.expires_at) : null;
    const refreshThreshold = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes buffer
    const needsRefresh = !accessToken || !expiresAtRaw || expiresAtRaw <= refreshThreshold;

    if (needsRefresh) {
      if (!userConnection.refresh_token) {
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

      console.log('Refreshing expired Office 365 token...');

      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: userConnection.refresh_token,
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
        .eq('id', userConnection.id);

      console.log('Token refreshed successfully');
    }

    // Construct Graph API URL (without permissions expansion as it's not supported on all SharePoint types)
    let graphUrl: string;
    if (browsePath === '/' || browsePath === '') {
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/root/children`;
    } else {
      const cleanPath = browsePath.replace(/^\/+/, '').replace(/\/+$/, '');
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/root:/${cleanPath}:/children`;
    }

    console.log(`Fetching from Graph API for user ${user.id}: ${graphUrl}`);

    const graphResponse = await fetch(graphUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      const errorStatus = graphResponse.status;
      
      console.error(`Graph API error ${errorStatus} for user ${user.id} at path: ${browsePath}`);
      console.error('URL:', graphUrl);
      console.error('Error response:', errorText);
      
      if (errorStatus === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Office 365 token expired. Please reconnect your Office 365 account.', 
            configured: true,
            needsO365: true,
            folders: [],
            files: []
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (errorStatus === 404) {
        // Folder doesn't exist - clean up stale cache entries
        console.log(`Folder not found, cleaning up stale cache for path: ${browsePath}`);
        
        // Delete cache entries for this path and any children
        await supabaseAdmin
          .from('sharepoint_cache')
          .delete()
          .eq('company_id', companyId)
          .eq('parent_path', browsePath);
        
        await supabaseAdmin
          .from('sharepoint_cache')
          .delete()
          .eq('company_id', companyId)
          .like('parent_path', `${browsePath}/%`);
        
        // Also invalidate parent folder cache (the one that listed this now-missing folder)
        const parentPath = browsePath.includes('/') 
          ? browsePath.substring(0, browsePath.lastIndexOf('/')) || '/'
          : '/';
        
        await supabaseAdmin
          .from('sharepoint_cache')
          .delete()
          .eq('company_id', companyId)
          .eq('parent_path', parentPath);
        
        console.log(`Cleaned up stale cache for path: ${browsePath} and parent: ${parentPath}`);
        
        return new Response(
          JSON.stringify({ 
            configured: true,
            currentPath: browsePath,
            folders: [],
            files: [],
            fromCache: false,
            warning: 'Folder not found',
            cacheCleared: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (errorStatus === 403) {
        console.log(`Access denied (returning 200 with empty arrays): ${browsePath}`);
        return new Response(
          JSON.stringify({ 
            configured: true,
            currentPath: browsePath,
            folders: [],
            files: [],
            fromCache: false,
            warning: 'Access denied'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // For other errors, return 500
      console.error(`Unhandled Graph API error ${errorStatus}`);
      throw new Error(`Graph API error: ${errorStatus}`);
    }

    const graphData = await graphResponse.json();
    const items = graphData.value || [];

    // Process and cache items
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const cacheInserts = [];

    for (const item of items) {
      // Permissions are not available without $expand, store empty array
      const permissions: any[] = [];

      const cacheItem = {
        company_id: companyId,
        item_type: item.folder ? 'folder' : 'file',
        item_id: item.id,
        parent_path: browsePath,
        name: item.name,
        web_url: item.webUrl,
        size: item.size,
        child_count: item.folder?.childCount,
        created_datetime: item.createdDateTime,
        last_modified_datetime: item.lastModifiedDateTime,
        created_by: item.createdBy?.user?.displayName,
        last_modified_by: item.lastModifiedBy?.user?.displayName,
        file_type: item.file ? item.name.split('.').pop()?.toUpperCase() : null,
        download_url: item['@microsoft.graph.downloadUrl'],
        permissions: JSON.stringify(permissions),
        expires_at: expiresAt,
      };

      cacheInserts.push(cacheItem);
    }

    // Bulk insert into cache (upsert to handle duplicates)
    if (cacheInserts.length > 0) {
      await supabaseAdmin
        .from('sharepoint_cache')
        .upsert(cacheInserts, {
          onConflict: 'company_id,item_id,parent_path',
          ignoreDuplicates: false,
        });
      
      console.log(`Cached ${cacheInserts.length} items for path: ${browsePath}`);
    }

    // Separate and format response
    const folders = items
      .filter((item: any) => item.folder)
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        webUrl: item.webUrl,
        childCount: item.folder?.childCount || 0,
        lastModifiedDateTime: item.lastModifiedDateTime,
        permissions: [], // Permissions not available without separate API call
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
        permissions: [], // Permissions not available without separate API call
      }));

    // Use the stored SharePoint site URL from configuration
    const siteUrl = config.site_url || '';

    // Return response (compression handled by CDN/Cloudflare)
    return new Response(
      JSON.stringify({
        configured: true,
        currentPath: browsePath,
        folders,
        files,
        fromCache: false,
        siteUrl: siteUrl || undefined,
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