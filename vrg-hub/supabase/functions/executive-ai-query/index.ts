import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleCredentials {
  client_email: string;
  private_key: string;
  project_id: string;
}

async function getAccessToken(credentials: GoogleCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/bigquery.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: exp,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKeyPem = credentials.private_key.replace(/\\n/g, '\n');
  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

async function queryBigQuery(accessToken: string, projectId: string, query: string): Promise<any[]> {
  console.log('Executing BigQuery query:', query.substring(0, 500) + '...');

  const response = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        useLegacySql: false,
        maxResults: 100,
      }),
    }
  );

  const result = await response.json();

  if (result.error) {
    console.error('BigQuery error:', result.error);
    throw new Error(`BigQuery error: ${result.error.message}`);
  }

  if (!result.rows) return [];

  const fields = result.schema?.fields || [];
  const rows = result.rows.map((row: any) => {
    const obj: Record<string, any> = {};
    row.f.forEach((field: any, index: number) => {
      const fieldName = fields[index]?.name || `field_${index}`;
      obj[fieldName] = field.v;
    });
    return obj;
  });

  return rows;
}

async function interpretQuery(query: string): Promise<{ sql: string; response: string }> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const systemPrompt = `You are an AI assistant that interprets natural language queries about healthcare revenue and imaging data, and converts them to BigQuery SQL.

The data is in BigQuery table: vision-radiology.karisma_live.vw_Revenue_Enhanced

Available columns:
- InvoiceDate (DATE): Invoice date
- InvoiceItemKey (INTEGER): Unique key for each invoice item/study
- WorkSiteName (STRING): Site/clinic name
- RadiologistName (STRING): Radiologist name (invoicing practitioner)
- RadiologistKey (INTEGER): Radiologist key
- Modality (STRING): Imaging modality (CT, MRI, X-Ray, Ultrasound, etc.)
- GrossRevenue (FLOAT): Revenue amount
- Brand (STRING): Brand name (Vision Radiology, Focus Radiology, etc.)
- IsDiscarded (BOOLEAN): Whether record is discarded
- Refunded (BOOLEAN): Whether record was refunded

IMPORTANT RULES:
1. Always filter: IsDiscarded = FALSE AND Refunded = FALSE
2. For "today", use CURRENT_DATE()
3. For "yesterday", use DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
4. For "last week", use last 7 days
5. For "this month", use current month to date
6. Use WorkSiteName for sites, RadiologistName for radiologists
7. Revenue queries should SUM(GrossRevenue) as total_revenue
8. Volume/study count queries should COUNT(*) as study_count or COUNT(DISTINCT InvoiceItemKey)
9. ALWAYS include IsDiscarded = FALSE AND Refunded = FALSE in WHERE clause
10. Use LIKE for partial name matching (e.g., RadiologistName LIKE '%name%')
11. Return top results with ORDER BY and LIMIT when appropriate
12. DO NOT use ServiceCount - it does not exist. Use COUNT(*) for volumes.

Respond with JSON:
{
  "sql": "SELECT ... FROM ... WHERE ...",
  "response": "Brief natural language explanation of what you're showing"
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Convert this query to BigQuery SQL: "${query}"` }
      ],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from AI');
  }

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse SQL from AI response');
  }

  return JSON.parse(jsonMatch[0]);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI Query - User:', user.id, 'Query:', query);

    // Get BigQuery credentials
    const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    if (!credentialsJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT not configured');
    }

    const credentials: GoogleCredentials = JSON.parse(credentialsJson);

    // Use Claude to interpret the query
    const { sql, response: aiResponse } = await interpretQuery(query);
    console.log('Generated SQL:', sql);

    // Execute the query
    const accessToken = await getAccessToken(credentials);
    const results = await queryBigQuery(accessToken, credentials.project_id, sql);

    console.log(`Query returned ${results.length} results`);

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        results,
        sql
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Executive AI Query error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
