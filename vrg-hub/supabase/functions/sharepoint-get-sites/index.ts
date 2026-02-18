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

  // Default response shape so the UI can display more helpful messages
  const baseResponse = {
    sites: [] as any[],
    configured: false,
    needsO365: false,
    message: undefined as string | undefined,
  };

  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          ...baseResponse,
          needsO365: true,
          message: 'Missing authorization header. Please refresh and try again.',
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

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({
          ...baseResponse,
          needsO365: true,
          message: 'Not authenticated. Please log in again.',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let requestBody: Record<string, any> = {};
    try {
      requestBody = await req.json();
    } catch {
      // No body provided
    }

    const requestedCompanyId = requestBody?.company_id as string | undefined;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Load the user's most recent Office 365 connection (used for company inference + fallback)
    const { data: userConnections } = await supabaseAdmin
      .from('office365_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    const userConnection = userConnections?.[0] ?? null;

    let companyId = requestedCompanyId ?? userConnection?.company_id ?? null;

    if (!companyId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
      companyId = profile?.company_id ?? null;
    }

    // Determine whether SharePoint has been configured for this company
    let configured = false;
    if (companyId) {
      const { data: config } = await supabaseAdmin
        .from('sharepoint_configurations')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .limit(1);
      configured = (config?.length ?? 0) > 0;
    } else {
      const { data: anyConfigs } = await supabaseAdmin
        .from('sharepoint_configurations')
        .select('id')
        .eq('is_active', true)
        .limit(1);
      configured = (anyConfigs?.length ?? 0) > 0;
    }

    // No companyId inferred; proceed to try user-level or tenant-level Office 365 connections
    // We'll still determine 'configured' (already done above) to inform the UI, but we won't block here.

    // Prefer company-level connection, then user-level, finally tenant-level
    const { data: companyConnection } = await supabaseAdmin
      .from('office365_connections')
      .select('*')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(1);

    let connection = companyConnection?.[0] ?? null;

    if (!connection && userConnection?.access_token) {
      connection = userConnection;
    }

    if (!connection) {
      const { data: tenantConnection } = await supabaseAdmin
        .from('office365_connections')
        .select('*')
        .is('user_id', null)
        .order('updated_at', { ascending: false })
        .limit(1);
      connection = tenantConnection?.[0] ?? null;
    }

    // Ensure we have a usable access token; if missing, try to refresh via refresh_token
    if (!connection?.access_token) {
      if (connection?.refresh_token) {
        try {
          const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
          const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');
          const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId!,
              client_secret: clientSecret!,
              refresh_token: connection.refresh_token,
              grant_type: 'refresh_token',
            }),
          });
          if (tokenResponse.ok) {
            const tokens = await tokenResponse.json();
            await supabaseAdmin
              .from('office365_connections')
              .update({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token || connection.refresh_token,
                expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', connection.id);
            connection = { ...connection, ...tokens, access_token: tokens.access_token };
          } else {
            console.error('Token refresh failed (missing token path):', await tokenResponse.text());
          }
        } catch (e) {
          console.error('Unexpected error refreshing token (missing token path):', e);
        }
      }
    }

    // Refresh the token if it is missing or expiring soon
    let accessToken = connection?.access_token;
    const expiresAtRaw = connection?.expires_at ? new Date(connection.expires_at) : null;
    const refreshThreshold = new Date(Date.now() + 5 * 60 * 1000);
    const needsRefresh = !expiresAtRaw || expiresAtRaw <= refreshThreshold;

    if (needsRefresh) {
      if (!connection.refresh_token) {
        return new Response(
          JSON.stringify({
            ...baseResponse,
            configured,
            needsO365: true,
            message: 'Office 365 connection expired and cannot be refreshed. Please reconnect in Settings > Integrations.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
      const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');

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
            ...baseResponse,
            configured,
            needsO365: true,
            message: 'Failed to refresh Office 365 token. Please reconnect in Settings > Integrations.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await tokenResponse.json();
      accessToken = tokens.access_token as string;

      const updateData: Record<string, any> = {
        access_token: tokens.access_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
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
        console.error('Failed to persist refreshed token:', updateError);
      } else {
        connection = { ...connection, ...updateData };
      }
    }

    const sitesResponse = await fetch('https://graph.microsoft.com/v1.0/sites?search=*', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!sitesResponse.ok) {
      const errorText = await sitesResponse.text();
      console.error('SharePoint sites fetch failed:', sitesResponse.status, errorText);
      return new Response(
        JSON.stringify({
          ...baseResponse,
          configured,
          message: `Failed to fetch sites: ${sitesResponse.status}`,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sitesData = await sitesResponse.json();

    const sites = (sitesData.value || []).map((site: any) => ({
      id: site.id,
      name: site.name || site.displayName,
      webUrl: site.webUrl,
      description: site.description,
    }));

    return new Response(
      JSON.stringify({
        sites,
        configured,
        needsO365: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching SharePoint sites:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        ...baseResponse,
        message: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
