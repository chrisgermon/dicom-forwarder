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
    const { item_id, new_name, parent_path } = await req.json();

    if (!item_id) {
      return new Response(
        JSON.stringify({ error: 'Item ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!new_name || new_name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'New name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file name - check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(new_name)) {
      return new Response(
        JSON.stringify({ error: 'Name contains invalid characters: < > : " / \\ | ? *' }),
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

    console.log(`Renaming item ${item_id} to "${new_name}" for user ${user.id}`);

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
        JSON.stringify({ error: 'Office 365 not connected', needsO365: true }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get SharePoint configuration
    const { data: configs } = await supabaseAdmin
      .from('sharepoint_configurations')
      .select('site_id')
      .eq('company_id', userConnection.company_id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    const config = configs?.[0];

    if (!config) {
      return new Response(
        JSON.stringify({ error: 'SharePoint not configured', configured: false }),
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
          JSON.stringify({ error: 'Office 365 token expired. Please reconnect.', needsO365: true }),
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
          JSON.stringify({ error: 'Failed to refresh token. Please reconnect.', needsO365: true }),
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

    // Rename item via Microsoft Graph API (PATCH request)
    const graphUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/items/${item_id}`;

    console.log('Renaming via Graph API:', graphUrl);

    const graphResponse = await fetch(graphUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: new_name.trim(),
      }),
    });

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error(`Graph API rename error ${graphResponse.status}:`, errorText);

      if (graphResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Office 365 token expired', needsO365: true }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 403) {
        return new Response(
          JSON.stringify({ error: 'Permission denied. You do not have permission to rename this item.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Item not found.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 409) {
        return new Response(
          JSON.stringify({ error: 'An item with this name already exists in this location.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Failed to rename: ${graphResponse.status}`, details: errorText }),
        { status: graphResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const renamedItem = await graphResponse.json();

    // Update cache
    try {
      await supabaseAdmin
        .from('sharepoint_cache')
        .update({
          name: renamedItem.name,
          web_url: renamedItem.webUrl,
          last_modified_datetime: renamedItem.lastModifiedDateTime,
          last_modified_by: renamedItem.lastModifiedBy?.user?.displayName,
          cached_at: new Date().toISOString(),
        })
        .eq('item_id', item_id)
        .eq('company_id', userConnection.company_id);

      console.log('Updated item in cache');
    } catch (cacheError) {
      console.error('Failed to update cache:', cacheError);
    }

    console.log(`Item renamed successfully: ${item_id} -> ${renamedItem.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        item: {
          id: renamedItem.id,
          name: renamedItem.name,
          webUrl: renamedItem.webUrl,
          lastModifiedDateTime: renamedItem.lastModifiedDateTime,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Rename error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
