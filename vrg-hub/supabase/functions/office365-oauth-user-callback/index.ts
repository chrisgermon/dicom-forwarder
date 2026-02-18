import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(
        `<html><body><script>window.close();</script><p>Authentication failed: ${error}</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      return new Response(
        '<html><body><script>window.close();</script><p>Missing authorization code or state</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Decode state to get user ID
    const stateData = JSON.parse(atob(state));
    const userId = stateData.user_id;

    const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/office365-oauth-user-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(
        '<html><body><script>window.close();</script><p>Token exchange failed</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const tokens = await tokenResponse.json();

    // Get tenant ID from access token
    const tokenParts = tokens.access_token.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    const tenantId = payload.tid;

    // Store or update the user's Office 365 connection (single-tenant friendly)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Check if a user-level connection already exists
    const { data: existing } = await supabaseAdmin
      .from('office365_connections')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Update existing connection
      const updateData: Record<string, any> = {
        access_token: tokens.access_token,
        expires_at: expiresAt.toISOString(),
        tenant_id: tenantId,
        updated_at: new Date().toISOString(),
      };
      if (tokens.refresh_token) {
        updateData.refresh_token = tokens.refresh_token;
      }

      const { error: updateError } = await supabaseAdmin
        .from('office365_connections')
        .update(updateData)
        .eq('id', existing.id);

      if (updateError) {
        console.error('Failed updating connection:', updateError);
        return new Response(
          '<html><body><script>window.close();</script><p>Failed to save connection</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
    } else {
      // Before insert, ensure we have a refresh token
      if (!tokens.refresh_token) {
        console.error('No refresh_token received from Microsoft. Ensure offline_access scope and consent.');
        return new Response(
          '<html><body><script>window.close();</script><p>Connection failed: missing refresh permission. Please try again.</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
      // Create new user connection (include required company_id)
      const { error: insertError } = await supabaseAdmin
        .from('office365_connections')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          company_id: tenantId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error('Failed inserting connection:', insertError);
        return new Response(
          '<html><body><script>window.close();</script><p>Failed to save connection</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
    }

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Connected</title>
        </head>
        <body>
          <script>
            try {
              window.opener && window.opener.postMessage({ type: 'office365-connected' }, '*');
            } catch (e) {}
            window.close();
            setTimeout(() => { window.close(); }, 50);
          </script>
          <noscript>Connected. You can close this window.</noscript>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      `<html><body><script>window.close();</script><p>Error: ${errorMessage}</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});