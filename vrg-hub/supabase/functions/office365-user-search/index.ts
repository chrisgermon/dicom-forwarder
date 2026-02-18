import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!response.ok) throw new Error('Failed to refresh token');
  return await response.json();
}

async function fetchGraph(accessToken: string, endpoint: string, extraHeaders: Record<string, string> = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `https://graph.microsoft.com/v1.0/${endpoint}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...extraHeaders } });
  if (!res.ok) {
    const text = await res.text();
    console.error('Graph error:', text);
    throw new Error(`Graph request failed: ${res.status}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAuthed = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseAuthed.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const q: string = (body.q || '').toString().trim();
    let company_id: string | null = body.company_id || null;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Infer company_id like in the sync function
    if (!company_id) {
      try {
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
        company_id = profile?.company_id || company_id;
      } catch {}
      if (!company_id) {
        const { data: userConnHint } = await supabase.from('office365_connections').select('company_id').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle();
        company_id = userConnHint?.company_id || company_id;
      }
      if (!company_id) {
        const { data: activeConfig } = await supabase.from('sharepoint_configurations').select('company_id').eq('is_active', true).order('updated_at', { ascending: false }).limit(1).maybeSingle();
        company_id = activeConfig?.company_id || company_id;
      }
    }

    if (!company_id) return new Response(JSON.stringify({ error: 'Could not determine company_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!q) return new Response(JSON.stringify({ error: 'Missing query (q)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Find Office 365 connection (reuse strategies)
    let connection: any = null;
    const tryFetch = async (query: any) => (await supabase.from('office365_connections').select('*').match(query).order('updated_at', { ascending: false }).limit(1).maybeSingle()).data;

    connection = await tryFetch({ company_id }) || await tryFetch({ user_id: user.id }) || (await supabase.from('office365_connections').select('*').is('user_id', null).order('updated_at', { ascending: false }).limit(1).maybeSingle()).data || (await supabase.from('office365_connections').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle()).data;

    if (!connection) return new Response(JSON.stringify({ error: 'No Office 365 connection found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    let accessToken = connection.access_token as string | null;
    const expiresAt = connection.expires_at ? new Date(connection.expires_at) : new Date(0);
    const needsRefresh = !accessToken || expiresAt <= new Date(Date.now() + 5 * 60 * 1000);

    if (needsRefresh) {
      if (!connection.refresh_token) return new Response(JSON.stringify({ error: 'Office 365 connection expired. Please reconnect.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const clientId = Deno.env.get('OFFICE365_CLIENT_ID')!;
      const clientSecret = Deno.env.get('OFFICE365_CLIENT_SECRET')!;
      const tokens = await refreshAccessToken(connection.refresh_token, clientId, clientSecret);
      accessToken = tokens.access_token;
      await supabase.from('office365_connections').update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || connection.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      }).eq('id', connection.id);
    }

    // Try $search first (best relevance)
    let results: any[] = [];
    try {
      // Microsoft Graph $search syntax: property:value
      const searchQuery = `"displayName:${q}" OR "mail:${q}" OR "userPrincipalName:${q}"`;
      const data = await fetchGraph(accessToken!, `users?$search=${encodeURIComponent(searchQuery)}&$select=userPrincipalName,displayName,mail,jobTitle,department,assignedLicenses&$count=true`, { 'ConsistencyLevel': 'eventual' });
      results = data.value || [];
    } catch (e) {
      // Fallback to $filter with startsWith (contains not supported for users)
      const escaped = q.replace(/'/g, "''");
      const filter = `startsWith(displayName,'${escaped}') or startsWith(mail,'${escaped}') or startsWith(userPrincipalName,'${escaped}')`;
      try {
        const data = await fetchGraph(accessToken!, `users?$select=userPrincipalName,displayName,mail,jobTitle,department,assignedLicenses&$filter=${encodeURIComponent(filter)}`);
        results = data.value || [];
      } catch (filterError) {
        // Last resort: get all users and filter client-side (not ideal but works)
        console.log('Both $search and $filter failed, fetching all users');
        const data = await fetchGraph(accessToken!, `users?$select=userPrincipalName,displayName,mail,jobTitle,department,assignedLicenses&$top=999`);
        const allUsers = data.value || [];
        const lowerQ = q.toLowerCase();
        results = allUsers.filter((u: any) => 
          (u.displayName && u.displayName.toLowerCase().includes(lowerQ)) ||
          (u.mail && u.mail.toLowerCase().includes(lowerQ)) ||
          (u.userPrincipalName && u.userPrincipalName.toLowerCase().includes(lowerQ))
        );
      }
    }

    const mapped = results.slice(0, 50).map((u: any) => ({
      id: u.userPrincipalName,
      displayName: u.displayName,
      mail: u.mail,
      userPrincipalName: u.userPrincipalName,
      jobTitle: u.jobTitle,
      department: u.department,
      hasLicense: Array.isArray(u.assignedLicenses) && u.assignedLicenses.length > 0,
    }));

    return new Response(JSON.stringify({ results: mapped }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('office365-user-search error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Unknown error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
