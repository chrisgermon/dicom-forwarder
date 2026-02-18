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
    const { item_id, destination_folder_id, destination_path, operation, new_name } = await req.json();

    if (!item_id) {
      return new Response(
        JSON.stringify({ error: 'Item ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!destination_folder_id && !destination_path) {
      return new Response(
        JSON.stringify({ error: 'Destination folder ID or path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const op = operation === 'copy' ? 'copy' : 'move';

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

    console.log(`${op === 'copy' ? 'Copying' : 'Moving'} item ${item_id} for user ${user.id}`);

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
      .select('site_id, drive_id')
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

    // Resolve destination folder ID if path is provided
    let targetFolderId = destination_folder_id;

    if (!targetFolderId && destination_path) {
      // Get the folder ID from the path
      let folderUrl: string;
      if (destination_path === '/' || destination_path === '') {
        folderUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/root`;
      } else {
        const cleanPath = destination_path.replace(/^\/+/, '').replace(/\/+$/, '');
        folderUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/root:/${cleanPath}`;
      }

      const folderResponse = await fetch(folderUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!folderResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Destination folder not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const folderData = await folderResponse.json();
      targetFolderId = folderData.id;
    }

    // Build request body
    const requestBody: Record<string, any> = {
      parentReference: {
        id: targetFolderId,
      },
    };

    // Add new name if provided (for copy with rename or move with rename)
    if (new_name && new_name.trim()) {
      requestBody.name = new_name.trim();
    }

    // Determine the Graph API endpoint based on operation
    let graphUrl: string;
    let method: string;

    if (op === 'copy') {
      // Copy uses POST to /copy endpoint
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/items/${item_id}/copy`;
      method = 'POST';
    } else {
      // Move uses PATCH to update parentReference
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/items/${item_id}`;
      method = 'PATCH';
    }

    console.log(`${op === 'copy' ? 'Copying' : 'Moving'} via Graph API:`, graphUrl);

    const graphResponse = await fetch(graphUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Copy operation returns 202 Accepted with a monitor URL
    if (op === 'copy' && graphResponse.status === 202) {
      const monitorUrl = graphResponse.headers.get('Location');
      console.log(`Copy initiated, monitor URL: ${monitorUrl}`);

      // Poll the monitor URL to get the final result (with timeout)
      if (monitorUrl) {
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const statusResponse = await fetch(monitorUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();

            if (statusData.status === 'completed') {
              console.log('Copy completed:', statusData.resourceId);

              return new Response(
                JSON.stringify({
                  success: true,
                  operation: 'copy',
                  item: {
                    id: statusData.resourceId,
                  },
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } else if (statusData.status === 'failed') {
              return new Response(
                JSON.stringify({ error: 'Copy operation failed', details: statusData.error }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            // If still in progress, continue polling
          }

          attempts++;
        }

        // Timeout - but copy might still complete
        return new Response(
          JSON.stringify({
            success: true,
            operation: 'copy',
            status: 'in_progress',
            message: 'Copy operation started but taking longer than expected. It will complete in the background.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          operation: 'copy',
          status: 'initiated',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error(`Graph API ${op} error ${graphResponse.status}:`, errorText);

      if (graphResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Office 365 token expired', needsO365: true }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 403) {
        return new Response(
          JSON.stringify({ error: `Permission denied. You do not have permission to ${op} this item.` }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Item or destination not found.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 409) {
        return new Response(
          JSON.stringify({ error: 'An item with the same name already exists in the destination.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Failed to ${op}: ${graphResponse.status}`, details: errorText }),
        { status: graphResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resultItem = await graphResponse.json();

    // For move, update cache
    if (op === 'move') {
      try {
        // Remove old cache entry
        await supabaseAdmin
          .from('sharepoint_cache')
          .delete()
          .eq('item_id', item_id)
          .eq('company_id', userConnection.company_id);

        console.log('Removed old cache entry for moved item');
      } catch (cacheError) {
        console.error('Failed to update cache:', cacheError);
      }
    }

    console.log(`Item ${op === 'copy' ? 'copied' : 'moved'} successfully: ${resultItem.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        operation: op,
        item: {
          id: resultItem.id,
          name: resultItem.name,
          webUrl: resultItem.webUrl,
          parentReference: resultItem.parentReference,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Move/copy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
