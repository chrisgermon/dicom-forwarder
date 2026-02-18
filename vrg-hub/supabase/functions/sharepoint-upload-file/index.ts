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

  try {
    console.log('SharePoint upload-file request received');
    
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
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
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderPath = formData.get('folder_path') as string || '/';

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Uploading file: ${file.name} to path: ${folderPath}`);

    // Get user's O365 connection
    const { data: userO365 } = await supabaseAdmin
      .from('office365_connections')
      .select('id, company_id, access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    const userConnection = userO365?.[0];

    if (!userConnection?.company_id) {
      return new Response(
        JSON.stringify({ error: 'Office 365 not connected' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get SharePoint configuration
    const { data: configs } = await supabaseAdmin
      .from('sharepoint_configurations')
      .select('site_id, folder_path')
      .eq('company_id', userConnection.company_id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    const config = configs?.[0];

    if (!config) {
      return new Response(
        JSON.stringify({ error: 'SharePoint not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token needs refresh
    let accessToken = userConnection.access_token;
    const expiresAtRaw = userConnection.expires_at ? new Date(userConnection.expires_at) : null;
    const refreshThreshold = new Date(Date.now() + 5 * 60 * 1000);
    const needsRefresh = !accessToken || !expiresAtRaw || expiresAtRaw <= refreshThreshold;

    if (needsRefresh) {
      if (!userConnection.refresh_token) {
        return new Response(
          JSON.stringify({ error: 'Office 365 token expired. Please reconnect.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
      const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');

      console.log('Refreshing expired Office 365 token...');

      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: userConnection.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        console.error('Token refresh failed:', await tokenResponse.text());
        return new Response(
          JSON.stringify({ error: 'Failed to refresh token. Please reconnect.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await tokenResponse.json();
      accessToken = tokens.access_token;

      await supabaseAdmin
        .from('office365_connections')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || userConnection.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userConnection.id);

      console.log('Token refreshed successfully');
    }

    // Construct upload URL using configured base folder + requested subfolder
    const basePath = (config.folder_path || '').trim();
    let effectiveFolder = (folderPath && folderPath !== '/') ? folderPath : (basePath || '/');
    if (basePath && !effectiveFolder.startsWith(basePath)) {
      effectiveFolder = `${basePath.replace(/\/+$/, '')}/${effectiveFolder.replace(/^\/+/, '')}`;
    }
    const cleanPath = effectiveFolder === '/' ? '' : effectiveFolder.replace(/^\/+/, '').replace(/\/+$/, '');
    const uploadPath = `/${cleanPath ? cleanPath + '/' : ''}${file.name}`;
    const graphUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/root:${uploadPath}:/content`;

    console.log('Uploading to Graph API path:', uploadPath);

    // Upload file
    const fileBuffer = await file.arrayBuffer();
    const uploadResponse = await fetch(graphUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      // Try to parse Graph error for clearer messaging
      let errCode = '';
      let errMessage = '';
      try {
        const errJson = await uploadResponse.clone().json();
        errCode = errJson?.error?.code || '';
        errMessage = errJson?.error?.message || '';
        console.error('Graph API upload error:', JSON.stringify(errJson));
      } catch {
        const errorText = await uploadResponse.text();
        console.error('Graph API upload error:', errorText);
        errMessage = errorText;
      }

      // Expired/invalid token → ask user to reconnect O365
      if (uploadResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Office 365 token expired. Please reconnect your Office 365 account.',
            configured: true,
            needsO365: true
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Missing write permissions or no consent for write scopes
      const accessDenied = uploadResponse.status === 403 || /accessdenied|insufficient/i.test(errCode + ' ' + errMessage);
      if (accessDenied) {
        return new Response(
          JSON.stringify({ 
            error: 'Access denied by SharePoint. Your account may not have write permission to this location, or the integration lacks write consent (Files.ReadWrite.All, Sites.ReadWrite.All). Please reconnect your Office 365 account. If the issue persists, ask an administrator to grant access to this SharePoint folder.',
            configured: true,
            needsO365: true,
            requires_admin_consent: /admin|consent|insufficient privileges/i.test(errMessage)
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Not found → likely invalid path
      if (uploadResponse.status === 404) {
        return new Response(
          JSON.stringify({ 
            error: 'Folder path not found in SharePoint. Please verify the configured folder path.',
            configured: true
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadResponse.status}` }),
        { status: uploadResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('File uploaded successfully to SharePoint');

    const uploadData = await uploadResponse.json();

    // Save to cache table
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('brand_id')
        .eq('id', user.id)
        .single();

      const companyId = profile?.brand_id || user.id;

      await supabaseAdmin
        .from('sharepoint_cache')
        .upsert({
          company_id: companyId,
          item_type: 'file',
          item_id: uploadData.id,
          parent_path: effectiveFolder || '',
          name: uploadData.name,
          web_url: uploadData.webUrl,
          size: uploadData.size || 0,
          child_count: 0,
          created_datetime: uploadData.createdDateTime,
          last_modified_datetime: uploadData.lastModifiedDateTime,
          created_by: uploadData.createdBy?.user?.displayName || '',
          last_modified_by: uploadData.lastModifiedBy?.user?.displayName || '',
          file_type: file.type || 'application/octet-stream',
          download_url: uploadData['@microsoft.graph.downloadUrl'] || '',
          permissions: [],
          metadata: uploadData,
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        }, {
          onConflict: 'company_id,item_id',
          ignoreDuplicates: false,
        });
      console.log('Saved file to cache');
    } catch (cacheError) {
      console.error('Failed to save to cache:', cacheError);
    }

    console.log(`File uploaded successfully: ${file.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        file: {
          id: uploadData.id,
          name: uploadData.name,
          webUrl: uploadData.webUrl,
          size: uploadData.size,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
