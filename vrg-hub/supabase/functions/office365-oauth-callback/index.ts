import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateStr = url.searchParams.get('state');
    
    if (!code || !stateStr) {
      throw new Error('Missing code or state parameter');
    }

    const state = JSON.parse(stateStr);
    const { company_id, user_id } = state;

    const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/office365-oauth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange error:', errorData);
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();
    
    // Get tenant ID from the access token (it's in the JWT)
    const tokenParts = tokens.access_token.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    const tenantId = payload.tid;

    // Store connection in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const { data: existingConn, error: selectError } = await supabase
      .from('office365_connections')
      .select('id')
      .eq('company_id', company_id)
      .maybeSingle();

    if (selectError) {
      console.error('Select existing connection error:', selectError);
      throw new Error('Failed to check existing connection');
    }

    let upsertError = null as any;

    if (existingConn?.id) {
      const { error } = await supabase
        .from('office365_connections')
        .update({
          user_id: null,
          tenant_id: tenantId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', existingConn.id);
      upsertError = error;
    } else {
      const { error } = await supabase
        .from('office365_connections')
        .insert({
          company_id,
          user_id: null, // Company-level connection, not user-specific
          tenant_id: tenantId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
        });
      upsertError = error;
    }

    if (upsertError) {
      console.error('Database error:', upsertError);
      throw new Error('Failed to store connection');
    }

    // Get the company's subdomain for redirect
    const { data: companyData } = await supabase
      .from('companies')
      .select('subdomain')
      .eq('id', company_id)
      .single();
    
    // Build redirect URL with subdomain
    const protocol = Deno.env.get('SUPABASE_URL')?.includes('localhost') ? 'http' : 'https';
    const baseDomain = Deno.env.get('SUPABASE_URL')?.includes('localhost') 
      ? 'localhost:8080' 
      : 'hub.visionradiology.com.au';
    
    const subdomain = companyData?.subdomain;
    const host = subdomain ? `${subdomain}.${baseDomain}` : baseDomain;
    const redirectUrl = `${protocol}://${host}/settings?tab=integrations&success=true`;

    // Return minimal HTML that closes the popup immediately
    const html = `
      <!DOCTYPE html>
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
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Get the default redirect URL from the state if available
    const url = new URL(req.url);
    const stateStr = url.searchParams.get('state');
    let redirectUrl = 'https://hub.visionradiology.com.au/settings?tab=integrations';
    
    if (stateStr) {
      try {
        const state = JSON.parse(stateStr);
        const { company_id } = state;
        
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        const { data: companyData } = await supabase
          .from('companies')
          .select('subdomain')
          .eq('id', company_id)
          .single();
        
        const protocol = Deno.env.get('SUPABASE_URL')?.includes('localhost') ? 'http' : 'https';
        const baseDomain = Deno.env.get('SUPABASE_URL')?.includes('localhost') 
          ? 'localhost:8080' 
          : 'hub.visionradiology.com.au';
        
        const subdomain = companyData?.subdomain;
        const host = subdomain ? `${subdomain}.${baseDomain}` : baseDomain;
        redirectUrl = `${protocol}://${host}/settings?tab=integrations`;
      } catch (e) {
        // Fall back to default URL
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${redirectUrl}&error=${encodeURIComponent(errorMessage)}`,
      },
    });
  }
});
