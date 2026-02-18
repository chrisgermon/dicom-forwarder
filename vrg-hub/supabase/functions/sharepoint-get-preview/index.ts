import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// File extensions that support preview
const PREVIEWABLE_EXTENSIONS = {
  // Office documents
  office: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'],
  // PDFs
  pdf: ['pdf'],
  // Images
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff'],
  // Text/Code
  text: ['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts', 'md', 'log'],
  // Video
  video: ['mp4', 'mov', 'avi', 'wmv', 'mkv', 'webm'],
  // Audio
  audio: ['mp3', 'wav', 'ogg', 'flac', 'aac'],
};

function getPreviewType(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  for (const [type, extensions] of Object.entries(PREVIEWABLE_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return type;
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { item_id, filename } = await req.json();

    if (!item_id) {
      return new Response(
        JSON.stringify({ error: 'Item ID is required' }),
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

    console.log(`Getting preview for item ${item_id} for user ${user.id}`);

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

    // Get the preview type
    const previewType = filename ? getPreviewType(filename) : null;

    // Get preview URL from Microsoft Graph API
    // This endpoint returns embeddable preview URLs for Office files and other previewable content
    const previewUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/items/${item_id}/preview`;

    console.log('Getting preview URL via Graph API:', previewUrl);

    const previewResponse = await fetch(previewUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty body, can include page/zoom options
    });

    if (!previewResponse.ok) {
      // If preview endpoint fails, try to get the item info for direct preview (images, etc.)
      const itemUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/items/${item_id}?$select=id,name,webUrl,@microsoft.graph.downloadUrl,file`;

      const itemResponse = await fetch(itemUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (itemResponse.ok) {
        const itemData = await itemResponse.json();

        return new Response(
          JSON.stringify({
            previewType: previewType || 'unknown',
            downloadUrl: itemData['@microsoft.graph.downloadUrl'],
            webUrl: itemData.webUrl,
            mimeType: itemData.file?.mimeType,
            canPreview: previewType === 'image' || previewType === 'pdf' || previewType === 'video' || previewType === 'audio',
            useDownloadUrl: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const errorText = await previewResponse.text();
      console.error(`Graph API preview error ${previewResponse.status}:`, errorText);

      if (previewResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Office 365 token expired', needsO365: true }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Preview not available for this file type',
          canPreview: false,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const previewData = await previewResponse.json();

    console.log('Preview URL obtained successfully');

    // Get the item details to construct the edit URL
    const itemUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/items/${item_id}?$select=id,name,webUrl,@microsoft.graph.downloadUrl,file`;
    const itemResponse = await fetch(itemUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    let editUrl = null;
    let webUrl = null;
    
    if (itemResponse.ok) {
      const itemData = await itemResponse.json();
      webUrl = itemData.webUrl;
      
      // Construct edit URL for Office documents
      // Office Online edit URLs use the webUrl with action=edit parameter
      if (previewType === 'office' && webUrl) {
        // For SharePoint-hosted Office documents, we can append action=edit
        // or use the webUrl directly which opens in edit mode by default
        editUrl = webUrl;
      }
    }

    return new Response(
      JSON.stringify({
        previewType: previewType || 'office',
        previewUrl: previewData.getUrl, // This is the embeddable preview URL
        editUrl: editUrl, // URL to edit in Office for the Web
        webUrl: webUrl, // Direct link to file in SharePoint
        canPreview: true,
        canEdit: previewType === 'office',
        useDownloadUrl: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Preview error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
