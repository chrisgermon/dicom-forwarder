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
    const folderId = formData.get('folder_id') as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Uploading ${file.name} to OneDrive for user ${user.id}, path: ${folderPath}`);

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

    // Construct upload URL
    let graphUrl: string;

    if (folderId) {
      // Upload to specific folder by ID
      graphUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${file.name}:/content`;
    } else if (folderPath === '/' || folderPath === '') {
      // Upload to root
      graphUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${file.name}:/content`;
    } else {
      // Upload to path
      const cleanPath = folderPath.replace(/^\/+/, '').replace(/\/+$/, '');
      graphUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${cleanPath}/${file.name}:/content`;
    }

    console.log('Uploading to Graph API:', graphUrl);

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
      const errorText = await uploadResponse.text();
      console.error(`Graph API upload error ${uploadResponse.status}:`, errorText);

      if (uploadResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Office 365 token expired', needsO365: true }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (uploadResponse.status === 403) {
        return new Response(
          JSON.stringify({ error: 'Permission denied. You do not have permission to upload here.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (uploadResponse.status === 507) {
        return new Response(
          JSON.stringify({ error: 'OneDrive storage is full. Please free up space.' }),
          { status: 507, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadResponse.status}` }),
        { status: uploadResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uploadData = await uploadResponse.json();

    console.log(`File uploaded successfully: ${file.name} -> ${uploadData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        file: {
          id: uploadData.id,
          name: uploadData.name,
          webUrl: uploadData.webUrl,
          size: uploadData.size,
          downloadUrl: uploadData['@microsoft.graph.downloadUrl'],
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OneDrive upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
