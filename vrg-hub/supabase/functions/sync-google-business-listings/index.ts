import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Exchange refresh token for access token
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_BUSINESS_PROFILE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_BUSINESS_PROFILE_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Business Profile credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Token refresh failed:', errorBody);
    throw new Error(`Failed to refresh access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Fetch all accounts the user has access to
async function fetchAccounts(accessToken: string) {
  const response = await fetch('https://mybusinessbusinessinformation.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    // Try the older endpoint
    const altResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!altResponse.ok) {
      const body = await altResponse.text();
      console.error('Accounts fetch failed:', body);
      throw new Error(`Failed to fetch accounts: ${altResponse.status}`);
    }
    return (await altResponse.json()).accounts || [];
  }

  return (await response.json()).accounts || [];
}

// Fetch locations for an account
async function fetchLocations(accessToken: string, accountName: string) {
  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,metadata,profile,phoneNumbers,websiteUri`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Locations fetch failed for ${accountName}:`, body);
    throw new Error(`Failed to fetch locations: ${response.status}`);
  }

  const data = await response.json();
  return data.locations || [];
}

// Map a Google location status to our business_listings status
function mapVerificationStatus(metadata: any): string {
  if (!metadata) return 'claimed';
  if (metadata.hasVoiceOfMerchant) return 'verified';
  if (metadata.hasPendingVerification) return 'claimed';
  if (metadata.isDuplicate) return 'needs_update';
  if (metadata.isSuspended) return 'suspended';
  return 'claimed';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for DB writes
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get Google access token
    const accessToken = await getAccessToken();

    // 2. Fetch accounts
    const accounts = await fetchAccounts(accessToken);
    if (accounts.length === 0) {
      return new Response(JSON.stringify({ error: 'No Google Business Profile accounts found', synced: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Fetch all locations from all accounts
    const allLocations: any[] = [];
    for (const account of accounts) {
      try {
        const locations = await fetchLocations(accessToken, account.name);
        allLocations.push(...locations.map((loc: any) => ({ ...loc, accountName: account.name })));
      } catch (err) {
        console.error(`Error fetching locations for ${account.name}:`, err);
      }
    }

    // 4. Fetch our locations from DB for matching
    const { data: dbLocations } = await supabaseAdmin
      .from('locations')
      .select('id, name, address')
      .eq('is_active', true);

    if (!dbLocations || dbLocations.length === 0) {
      return new Response(JSON.stringify({ error: 'No active locations in database', synced: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Match Google locations to DB locations by name similarity
    let syncedCount = 0;
    const results: any[] = [];

    for (const gLoc of allLocations) {
      const gTitle = (gLoc.title || '').toLowerCase();
      
      // Find matching DB location (case-insensitive partial match)
      const matchedLocation = dbLocations.find(dbLoc => {
        const dbName = dbLoc.name.toLowerCase();
        return dbName.includes(gTitle) || gTitle.includes(dbName) || 
               dbName.split(' ').every((word: string) => gTitle.includes(word));
      });

      if (matchedLocation) {
        const status = mapVerificationStatus(gLoc.metadata);
        const mapsUrl = gLoc.metadata?.mapsUri || null;

        // Upsert listing
        const { error: upsertError } = await supabaseAdmin
          .from('business_listings')
          .upsert({
            location_id: matchedLocation.id,
            platform: 'google_business',
            status,
            listing_url: mapsUrl,
            notes: `Google title: ${gLoc.title}. Auto-synced from Google Business Profile API.`,
            last_verified_at: status === 'verified' ? new Date().toISOString() : null,
            verified_by: status === 'verified' ? user.id : null,
          }, {
            onConflict: 'location_id,platform',
          });

        if (upsertError) {
          console.error('Upsert error:', upsertError);
          results.push({ location: matchedLocation.name, google: gLoc.title, error: upsertError.message });
        } else {
          syncedCount++;
          results.push({ location: matchedLocation.name, google: gLoc.title, status });
        }
      } else {
        results.push({ google: gLoc.title, status: 'unmatched' });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        totalGoogleLocations: allLocations.length,
        totalDbLocations: dbLocations.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('sync-google-business-listings error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
