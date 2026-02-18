import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create JWT for Google API authentication
async function getAccessToken(credentials: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/bigquery.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  // Convert PEM to CryptoKey
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = credentials.private_key
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\n/g, "");
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const jwt = await create({ alg: "RS256", typ: "JWT" }, payload, cryptoKey);

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Execute BigQuery query
async function queryBigQuery(accessToken: string, projectId: string, query: string) {
  const response = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        useLegacySql: false,
        maxResults: 100,
      }),
    }
  );

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }

  // Transform BigQuery response to array of objects
  const schema = data.schema?.fields || [];
  const rows = data.rows || [];
  
  return rows.map((row: { f: { v: string }[] }) => {
    const obj: Record<string, string> = {};
    row.f.forEach((field: { v: string }, index: number) => {
      obj[schema[index].name] = field.v;
    });
    return obj;
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { searchTerm, searchType, clinicKey, limit = 50 } = await req.json()

    // Parse service account from environment
    const serviceAccountStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
    
    if (!serviceAccountStr) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT environment variable is not set')
    }
    
    console.log('Service account string length:', serviceAccountStr.length)
    console.log('First 50 chars:', serviceAccountStr.substring(0, 50))
    
    let credentials: { client_email: string; private_key: string }
    try {
      credentials = JSON.parse(serviceAccountStr)
    } catch (parseError) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT as JSON:', parseError)
      throw new Error('GOOGLE_SERVICE_ACCOUNT is not valid JSON. Please ensure the entire service account JSON is pasted correctly.')
    }
    
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT is missing required fields: client_email or private_key')
    }
    
    const projectId = 'vision-radiology'
    
    // Get access token
    const accessToken = await getAccessToken(credentials)

    let query: string

    if (clinicKey) {
      // Get referrers for a specific clinic - ClinicKey is INT64 in BigQuery
      const numericClinicKey = parseInt(clinicKey, 10)
      if (isNaN(numericClinicKey)) {
        throw new Error('Invalid clinicKey: must be a number')
      }
      query = `
        SELECT 
          ReferrerKey,
          ReferrerName,
          ProviderNumber,
          Specialities,
          ReferrerEmail,
          ReferrerPhone
        FROM \`vision-radiology.karisma_warehouse.mv_Referrer_Search\`
        WHERE ClinicKey = ${numericClinicKey}
        ORDER BY ReferrerName
      `
    } else if (searchType === 'clinic') {
      // Search clinics
      const safeSearchTerm = searchTerm.toLowerCase().replace(/'/g, "\\'")
      query = `
        SELECT 
          ClinicKey,
          ClinicName,
          ClinicPhone,
          AddressLine1,
          Suburb,
          State,
          Postcode,
          ReferrerCount
        FROM \`vision-radiology.karisma_warehouse.mv_Clinic_Search\`
        WHERE LOWER(SearchText) LIKE '%${safeSearchTerm}%'
        ORDER BY ReferrerCount DESC
        LIMIT ${parseInt(limit)}
      `
    } else {
      // Search referrers (default)
      const safeSearchTerm = searchTerm.toLowerCase().replace(/'/g, "\\'")
      query = `
        SELECT 
          ReferrerKey,
          ReferrerName,
          ProviderNumber,
          Specialities,
          ClinicKey,
          ClinicName,
          Suburb,
          State
        FROM \`vision-radiology.karisma_warehouse.mv_Referrer_Search\`
        WHERE LOWER(SearchText) LIKE '%${safeSearchTerm}%'
        ORDER BY ReferrerName
        LIMIT ${parseInt(limit)}
      `
    }

    const rows = await queryBigQuery(accessToken, projectId, query)

    return new Response(
      JSON.stringify({ data: rows, count: rows.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('BigQuery error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
