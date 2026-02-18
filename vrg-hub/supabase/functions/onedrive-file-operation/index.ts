import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Operation = 'delete' | 'rename' | 'move' | 'copy' | 'create_folder';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      operation,
      item_id,
      new_name,
      destination_folder_id,
      destination_path,
      folder_name,
      parent_path,
    } = await req.json() as {
      operation: Operation;
      item_id?: string;
      new_name?: string;
      destination_folder_id?: string;
      destination_path?: string;
      folder_name?: string;
      parent_path?: string;
    };

    if (!operation) {
      return new Response(
        JSON.stringify({ error: 'Operation is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required parameters based on operation
    if (['delete', 'rename', 'move', 'copy'].includes(operation) && !item_id) {
      return new Response(
        JSON.stringify({ error: 'Item ID is required for this operation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (operation === 'rename' && !new_name) {
      return new Response(
        JSON.stringify({ error: 'New name is required for rename operation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (['move', 'copy'].includes(operation) && !destination_folder_id && !destination_path) {
      return new Response(
        JSON.stringify({ error: 'Destination folder ID or path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (operation === 'create_folder' && !folder_name) {
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

    console.log(`OneDrive ${operation} for user ${user.id}, item: ${item_id || 'N/A'}`);

    // Get user's O365 connection
    const { data: userO365 } = await supabaseAdmin
      .from('office365_connections')
      .select('id, access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    const userConnection = userO365?.[0];

    if (!userConnection?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Office 365 not connected', needsO365: true }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    }

    // Execute operation
    let graphUrl: string;
    let method: string;
    let body: string | null = null;

    switch (operation) {
      case 'delete':
        graphUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${item_id}`;
        method = 'DELETE';
        break;

      case 'rename':
        graphUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${item_id}`;
        method = 'PATCH';
        body = JSON.stringify({ name: new_name!.trim() });
        break;

      case 'move':
        graphUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${item_id}`;
        method = 'PATCH';
        body = JSON.stringify({
          parentReference: destination_folder_id
            ? { id: destination_folder_id }
            : { path: `/drive/root:${destination_path}` },
          ...(new_name ? { name: new_name.trim() } : {}),
        });
        break;

      case 'copy':
        graphUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${item_id}/copy`;
        method = 'POST';
        body = JSON.stringify({
          parentReference: destination_folder_id
            ? { id: destination_folder_id }
            : { path: `/drive/root:${destination_path}` },
          ...(new_name ? { name: new_name.trim() } : {}),
        });
        break;

      case 'create_folder': {
        const folderParent = parent_path || '/';
        if (folderParent === '/' || folderParent === '') {
          graphUrl = 'https://graph.microsoft.com/v1.0/me/drive/root/children';
        } else {
          const cleanPath = folderParent.replace(/^\/+/, '').replace(/\/+$/, '');
          graphUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${cleanPath}:/children`;
        }
        method = 'POST';
        body = JSON.stringify({
          name: folder_name!.trim(),
          folder: {},
          '@microsoft.graph.conflictBehavior': 'fail',
        });
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`Executing ${operation} via Graph API:`, graphUrl);

    const graphResponse = await fetch(graphUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body } : {}),
    });

    // Handle copy async response (202 Accepted)
    if (operation === 'copy' && graphResponse.status === 202) {
      const monitorUrl = graphResponse.headers.get('Location');

      if (monitorUrl) {
        // Poll for completion (with timeout)
        let attempts = 0;
        while (attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const statusResponse = await fetch(monitorUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.status === 'completed') {
              return new Response(
                JSON.stringify({ success: true, operation: 'copy', item: { id: statusData.resourceId } }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } else if (statusData.status === 'failed') {
              return new Response(
                JSON.stringify({ error: 'Copy failed', details: statusData.error }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
          attempts++;
        }

        return new Response(
          JSON.stringify({ success: true, operation: 'copy', status: 'in_progress' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, operation: 'copy', status: 'initiated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle delete success (204 No Content)
    if (operation === 'delete' && graphResponse.status === 204) {
      return new Response(
        JSON.stringify({ success: true, operation: 'delete', deleted_id: item_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error(`Graph API ${operation} error ${graphResponse.status}:`, errorText);

      if (graphResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Office 365 token expired', needsO365: true }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 403) {
        return new Response(
          JSON.stringify({ error: `Permission denied for ${operation} operation` }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Item or destination not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 409) {
        return new Response(
          JSON.stringify({ error: 'An item with this name already exists' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `${operation} failed: ${graphResponse.status}` }),
        { status: graphResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resultItem = await graphResponse.json();

    console.log(`${operation} completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        operation,
        item: {
          id: resultItem.id,
          name: resultItem.name,
          webUrl: resultItem.webUrl,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OneDrive operation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
