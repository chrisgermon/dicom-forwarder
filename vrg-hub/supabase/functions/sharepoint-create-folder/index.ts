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
    const requestBody = await req.json();
    const { folder_name, folder_path } = requestBody ?? {};
    const requestedCompanyId = requestBody?.company_id as string | undefined;

    if (!folder_name || folder_name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Folder name is required' }),
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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating folder "${folder_name}" at path "${folder_path}" for user ${user.id}`);

    // Determine company context
    const { data: userConnectionHint } = await supabase
      .from('office365_connections')
      .select('company_id, access_token, refresh_token, expires_at, updated_at, id, user_id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .maybeSingle();

    let companyId = (requestedCompanyId ?? userConnectionHint?.company_id ?? null) as string | null;
    if (!companyId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
      companyId = (profile?.company_id as string | undefined) ?? user.id;
    }

    console.log(`Using company_id: ${companyId} (requested: ${requestedCompanyId ?? 'none'}) for user ${user.id}`);

    // Get SharePoint configuration (fallback to any active config if company specific not found)
    let spConfig = null as Record<string, any> | null;
    let configError: { message?: string } | null = null;

    if (companyId) {
      const { data, error } = await supabase
        .from('sharepoint_configurations')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      spConfig = data;
      configError = error;
    }

    if (!spConfig && !configError) {
      const { data: fallbackConfig, error: fallbackError } = await supabase
        .from('sharepoint_configurations')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackConfig) {
        spConfig = fallbackConfig;
        if (fallbackConfig.company_id) {
          companyId = fallbackConfig.company_id;
        }
      }

      if (fallbackError) {
        configError = fallbackError;
      }
    }

    console.log(`SharePoint config lookup - Error: ${configError?.message || 'none'}, Found: ${!!spConfig}`);
    console.log(`Query params - company_id: ${companyId}, is_active: true`);

    if (configError || !spConfig) {
      console.error('SharePoint configuration not found or error occurred');
      return new Response(
        JSON.stringify({ 
          error: 'SharePoint not configured',
          configured: false,
          debug: {
            companyId,
            requestedCompanyId: requestedCompanyId ?? null,
            hasConnection: !!(userConnectionHint?.access_token),
            configError: configError?.message
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve Office 365 connection (prefer company-level token)
    let connection: Record<string, any> | null = null;

    if (spConfig?.company_id) {
      const { data: tenantConnection } = await supabase
        .from('office365_connections')
      .select('id, company_id, access_token, refresh_token, expires_at, updated_at, user_id')
        .eq('company_id', spConfig.company_id)
        .is('user_id', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tenantConnection?.access_token) {
        connection = tenantConnection;
        console.log('Using tenant-level Office 365 connection');
      }

      if (!connection?.access_token) {
        const { data: companyConnection } = await supabase
          .from('office365_connections')
          .select('id, company_id, access_token, refresh_token, expires_at, updated_at, user_id')
          .eq('company_id', spConfig.company_id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (companyConnection?.access_token) {
          connection = companyConnection;
          console.log('Using company-level Office 365 connection');
        }
      }
    }

    if (!connection?.access_token && userConnectionHint?.access_token) {
      connection = userConnectionHint;
      console.log('Using user-level Office 365 connection');
    }

    console.log('Resolved Office 365 connection:', connection ? `id=${connection.id}` : 'none');

    if (!connection?.access_token) {
      return new Response(
        JSON.stringify({
          error: 'Office 365 connection required',
          configured: true,
          needsO365: true
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh token if expired
    const expiresAtString = connection.expires_at;
    if (expiresAtString) {
      const expiresAt = new Date(expiresAtString);
      const now = new Date();

      if (now >= expiresAt) {
        console.log('Office 365 access token expired, refreshing...');

        if (!connection.refresh_token) {
          return new Response(
            JSON.stringify({
              error: 'Office 365 connection expired and cannot be refreshed. Please reconnect in Integrations.',
              configured: true,
              needsO365: true
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

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
              needsO365: true
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const tokens = await tokenResponse.json();
        const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        const newExpiryIso = newExpiresAt.toISOString();

        const updateData: Record<string, any> = {
          access_token: tokens.access_token,
          expires_at: newExpiryIso,
          updated_at: new Date().toISOString(),
        };

        if (tokens.refresh_token) {
          updateData.refresh_token = tokens.refresh_token;
        }

        const { error: updateError } = await supabase
          .from('office365_connections')
          .update(updateData)
          .eq('id', connection.id);

        if (updateError) {
          console.error('Failed to persist refreshed Office 365 token:', updateError);
        } else {
          console.log('Office 365 token refreshed successfully');
          connection = { ...connection, ...updateData };
        }
      }
    }

    // Construct Microsoft Graph API URL to create folder
    const parentPath = folder_path || '/';
    let graphUrl: string;
    
    if (parentPath === '/' || parentPath === '') {
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${spConfig.site_id}/drive/root/children`;
    } else {
      const cleanPath = parentPath.replace(/^\/+/, '').replace(/\/+$/, '');
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${spConfig.site_id}/drive/root:/${cleanPath}:/children`;
    }

    console.log('Creating folder via Graph API:', graphUrl);

    const graphResponse = await fetch(graphUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folder_name,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail' // Fail if folder already exists
      }),
    });

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error(`Graph API error ${graphResponse.status}:`, errorText);

      if (graphResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Office 365 token expired',
            needsO365: true
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 409) {
        return new Response(
          JSON.stringify({ 
            error: 'A folder with this name already exists'
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'Permission denied. You do not have permission to create folders here.'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: `Failed to create folder: ${graphResponse.status}`,
          details: errorText
        }),
        { status: graphResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newFolder = await graphResponse.json();

    console.log(`Folder created successfully: ${newFolder.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        folder: {
          id: newFolder.id,
          name: newFolder.name,
          webUrl: newFolder.webUrl,
          createdDateTime: newFolder.createdDateTime,
        }
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Create folder error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
