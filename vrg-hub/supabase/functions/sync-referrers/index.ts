import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create JWT for Google API authentication
async function getAccessToken(credentials: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: credentials.client_email,
    // jobs.insert requires non-readonly scope
    scope: "https://www.googleapis.com/auth/bigquery",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

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

// Execute BigQuery query using jobs.insert for long-running queries that don't expire
async function queryBigQuery(accessToken: string, projectId: string, query: string) {
  const allRows: Record<string, string>[] = [];
  
  console.log('Submitting BigQuery job...')
  
  // Step 1: Submit the job
  const jobResponse = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/jobs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        configuration: {
          query: {
            query,
            useLegacySql: false,
          }
        }
      }),
    }
  );

  const jobData = await jobResponse.json();
  
  if (jobData.error) {
    throw new Error(jobData.error.message);
  }

  const jobId: string | undefined = jobData.jobReference?.jobId;
  const jobProjectId: string = jobData.jobReference?.projectId ?? projectId;
  const jobLocation: string | undefined = jobData.jobReference?.location;

  if (!jobId) {
    throw new Error("BigQuery jobId missing from response");
  }

  console.log(
    `Job submitted: ${jobId}${jobLocation ? ` (location: ${jobLocation})` : ""}`
  );
  
  const buildJobsGetUrl = () => {
    const url = new URL(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${jobProjectId}/jobs/${jobId}`
    );
    if (jobLocation) url.searchParams.set('location', jobLocation);
    return url.toString();
  };

  const buildQueryResultsUrl = (startIndex: number, maxResults: number) => {
    const url = new URL(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${jobProjectId}/queries/${jobId}`
    );
    url.searchParams.set('startIndex', String(startIndex));
    url.searchParams.set('maxResults', String(maxResults));
    if (jobLocation) url.searchParams.set('location', jobLocation);
    return url.toString();
  };

  // Step 2: Poll for job completion
  let jobComplete = false;
  let pollCount = 0;
  const maxPolls = 120; // 2 minutes max
  
  while (!jobComplete && pollCount < maxPolls) {
    pollCount++;
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResponse = await fetch(buildJobsGetUrl(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    const statusData = await statusResponse.json();
    
    if (statusData.error) {
      throw new Error(statusData.error.message);
    }
    
    if (statusData.status?.state === 'DONE') {
      jobComplete = true;
      if (statusData.status?.errorResult) {
        throw new Error(statusData.status.errorResult.message);
      }
      console.log(`Job completed after ${pollCount}s`)
    }
  }
  
  if (!jobComplete) {
    throw new Error('BigQuery job timed out');
  }
  
  // Step 3: Fetch results using getQueryResults (this stays valid longer than query results)
  let startIndex = 0;
  const maxResults = 50000; // Fetch in chunks of 50k
  let hasMoreRows = true;
  let pageCount = 0;
  
  while (hasMoreRows) {
    pageCount++;
    console.log(`Fetching results page ${pageCount} (startIndex: ${startIndex})...`)
    
    const resultsResponse = await fetch(buildQueryResultsUrl(startIndex, maxResults), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    const resultsData = await resultsResponse.json();
    
    if (resultsData.error) {
      console.error(`Results page ${pageCount} error:`, JSON.stringify(resultsData.error));
      throw new Error(resultsData.error.message);
    }
    
    const schema = resultsData.schema?.fields || [];
    const totalRows = parseInt(resultsData.totalRows || '0');
    
    if (pageCount === 1) {
      console.log(`Total rows in result: ${totalRows}`)
    }
    
    if (resultsData.rows) {
      for (const row of resultsData.rows) {
        const obj: Record<string, string> = {};
        row.f.forEach((field: { v: string }, index: number) => {
          obj[schema[index].name] = field.v;
        });
        allRows.push(obj);
      }
      console.log(`Page ${pageCount}: fetched ${resultsData.rows.length} rows, total: ${allRows.length}`)
    }
    
    // Check if we have more rows to fetch
    startIndex += resultsData.rows?.length || 0;
    hasMoreRows = startIndex < totalRows;
  }
  
  console.log(`Completed: ${allRows.length} rows in ${pageCount} pages`)
  return allRows;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Check for incremental sync mode
  let isIncremental = false;
  try {
    const body = await req.json().catch(() => ({}));
    isIncremental = body.incremental === true;
  } catch {
    // Default to full sync
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: syncRecord, error: syncCreateError } = await supabase
    .from('referrer_sync_history')
    .insert({ 
      status: 'running',
      sync_type: isIncremental ? 'incremental' : 'full'
    })
    .select()
    .single()

  if (syncCreateError) {
    console.error('Failed to create sync record:', syncCreateError)
  }

  try {
    const serviceAccountStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
    
    if (!serviceAccountStr) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT environment variable is not set')
    }
    
    const credentials = JSON.parse(serviceAccountStr)
    
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT is missing required fields')
    }
    
    const projectId = 'vision-radiology'
    const accessToken = await getAccessToken(credentials)

    console.log(`Starting ${isIncremental ? 'INCREMENTAL' : 'FULL'} sync...`)

    // ===== SYNC REFERRERS =====
    const referrerQuery = `
      SELECT 
        ReferrerKey as referrer_key,
        ReferrerName as referrer_name,
        ProviderNumber as provider_number,
        Specialities as specialities,
        ReferrerEmail as email,
        ReferrerPhone as phone,
        ClinicKey as clinic_key,
        ClinicName as clinic_name,
        Suburb as suburb,
        State as state
      FROM \`vision-radiology.karisma_warehouse.mv_Referrer_Search\`
    `

    console.log('Fetching referrers...')
    const referrerRows = await queryBigQuery(accessToken, projectId, referrerQuery)
    console.log(`Got ${referrerRows.length} referrers`)

    // Fetch company locations for nearest clinic matching
    console.log('Fetching company locations...')
    const { data: companyLocations } = await supabase
      .from('locations')
      .select('id, name, state, zip_code, city')
      .eq('is_active', true)

    // Create a map of state -> locations and postcode -> location
    const locationsByState: Record<string, typeof companyLocations> = {}
    const locationsByPostcode: Record<string, string> = {}
    
    if (companyLocations) {
      for (const loc of companyLocations) {
        const state = loc.state?.toUpperCase()
        if (state) {
          if (!locationsByState[state]) locationsByState[state] = []
          locationsByState[state]!.push(loc)
        }
        if (loc.zip_code) {
          locationsByPostcode[loc.zip_code] = loc.id
        }
      }
    }

    // Function to find nearest location based on postcode/state
    const findNearestLocation = (postcode: string | null, state: string | null): string | null => {
      if (!postcode && !state) return null
      
      // First try exact postcode match
      if (postcode && locationsByPostcode[postcode]) {
        return locationsByPostcode[postcode]
      }
      
      // Try to find by postcode prefix (first 2 digits for regional matching)
      if (postcode && postcode.length >= 2) {
        const prefix = postcode.substring(0, 2)
        for (const [pc, locId] of Object.entries(locationsByPostcode)) {
          if (pc.startsWith(prefix)) return locId
        }
      }
      
      // Fall back to state - return first location in same state
      if (state) {
        const stateUpper = state.toUpperCase()
        const stateLocations = locationsByState[stateUpper]
        if (stateLocations && stateLocations.length > 0) {
          return stateLocations[0].id
        }
      }
      
      return null
    }

    let insertedReferrers = 0;
    const batchSize = 1000;

    // Full sync: truncate and insert
    console.log('Truncating referrer_directory...')
    const { error: deleteRefError } = await supabase.rpc('truncate_referrer_directory')
    
    if (deleteRefError) {
      console.error('Truncate failed, using delete:', deleteRefError)
      await supabase.from('referrer_directory').delete().neq('id', 0)
    }

    console.log('Inserting referrers with nearest clinic matching...')
    for (let i = 0; i < referrerRows.length; i += batchSize) {
      const batch = referrerRows.slice(i, i + batchSize).map(row => {
        // Get postcode from clinic info if available - we'll need to look it up or use state
        const nearestLocationId = findNearestLocation(null, row.state)
        
        return {
          referrer_key: parseInt(row.referrer_key) || 0,
          referrer_name: row.referrer_name || '',
          provider_number: row.provider_number,
          specialities: row.specialities,
          email: row.email,
          phone: row.phone,
          clinic_key: row.clinic_key ? parseInt(row.clinic_key) : null,
          clinic_name: row.clinic_name,
          suburb: row.suburb,
          state: row.state,
          nearest_location_id: nearestLocationId,
          synced_at: new Date().toISOString()
        }
      })
      
      const { error } = await supabase
        .from('referrer_directory')
        .upsert(batch, {
          onConflict: 'referrer_key,provider_number,clinic_key',
          ignoreDuplicates: true,
        })

      if (error) {
        console.error(`Batch ${Math.floor(i / batchSize)} error:`, error.message)
      } else {
        // Note: ignoreDuplicates means some rows may be skipped; we reconcile with an exact count after the loop.
        insertedReferrers += batch.length
      }
      
      // Log progress every 10k
      if (insertedReferrers % 10000 === 0 && insertedReferrers > 0) {
        console.log(`Inserted ${insertedReferrers} referrers...`)
      }
    }

    console.log(`Referrers complete: ${insertedReferrers}`)

    // ===== SYNC CLINICS =====
    const clinicQuery = `
      SELECT 
        ClinicKey as clinic_key,
        ClinicName as clinic_name,
        ClinicPhone as clinic_phone,
        AddressLine1 as address,
        Suburb as suburb,
        State as state,
        Postcode as postcode,
        ReferrerCount as referrer_count
      FROM \`vision-radiology.karisma_warehouse.mv_Clinic_Search\`
    `

    console.log('Fetching clinics...')
    const clinicRows = await queryBigQuery(accessToken, projectId, clinicQuery)
    console.log(`Got ${clinicRows.length} clinics`)

    let insertedClinics = 0
    
    console.log('Truncating clinic_directory...')
    const { error: deleteClinicError } = await supabase.rpc('truncate_clinic_directory')
    
    if (deleteClinicError) {
      console.error('Truncate failed, using delete:', deleteClinicError)
      await supabase.from('clinic_directory').delete().neq('id', 0)
    }

    console.log('Inserting clinics...')
    for (let i = 0; i < clinicRows.length; i += batchSize) {
      const batch = clinicRows.slice(i, i + batchSize).map(row => ({
        clinic_key: parseInt(row.clinic_key) || 0,
        clinic_name: row.clinic_name || '',
        clinic_phone: row.clinic_phone,
        address: row.address,
        suburb: row.suburb,
        state: row.state,
        postcode: row.postcode,
        referrer_count: parseInt(row.referrer_count) || 0,
        synced_at: new Date().toISOString()
      }))
      
      const { error } = await supabase.from('clinic_directory').insert(batch)
      if (error) {
        console.error(`Clinic batch ${Math.floor(i/batchSize)} error:`, error.message)
      } else {
        insertedClinics += batch.length
      }
    }

    console.log(`Clinics complete: ${insertedClinics}`)

    // Update sync history
    if (syncRecord) {
      await supabase
        .from('referrer_sync_history')
        .update({
          completed_at: new Date().toISOString(),
          referrer_count: insertedReferrers,
          clinic_count: insertedClinics,
          status: 'completed',
          sync_type: 'full'
        })
        .eq('id', syncRecord.id)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        referrers: insertedReferrers,
        clinics: insertedClinics,
        synced_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    
    if (syncRecord) {
      await supabase
        .from('referrer_sync_history')
        .update({
          completed_at: new Date().toISOString(),
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', syncRecord.id)
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
