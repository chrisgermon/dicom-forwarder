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
        maxResults: 10000,
        jobReference: {
          projectId: projectId
        }
      }),
    }
  );

  const result = await response.json();
  
  if (result.error) {
    console.error('BigQuery error:', result.error);
    throw new Error(`BigQuery error: ${result.error.message}`);
  }

  if (!result.rows) {
    console.log('No rows returned from query');
    return [];
  }

  const fields = result.schema?.fields || [];
  const rows = result.rows.map((row: any) => {
    const obj: Record<string, any> = {};
    row.f.forEach((field: any, index: number) => {
      const fieldName = fields[index]?.name || `field_${index}`;
      obj[fieldName] = field.v;
    });
    return obj;
  });

  console.log(`Query returned ${rows.length} rows`);
  return rows;
}

// Helper to build date filter - supports custom date range or days interval
function getDateFilter(days: number, startDate?: string, endDate?: string): string {
  if (startDate && endDate) {
    return `sd.requested_date >= '${startDate}' AND sd.requested_date <= '${endDate}'`;
  }
  return `sd.requested_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, worksiteKey, locationKey, practitionerKey, days = 90, startDate, endDate, shareToken } = body;

    // Check for either valid auth header OR valid share token
    const authHeader = req.headers.get('Authorization');
    let isAuthorized = false;

    if (authHeader?.startsWith('Bearer ')) {
      // Try to validate JWT
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (!claimsError && claimsData?.claims) {
        isAuthorized = true;
        console.log('Authorized via JWT for user:', claimsData.claims.sub);
      }
    }

    // If not authorized via JWT, check for valid share token
    if (!isAuthorized && shareToken) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { data: shareLink, error: shareError } = await supabaseAdmin
        .from('mlo_performance_shared_links')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_active', true)
        .single();

      if (!shareError && shareLink) {
        // Check expiration
        if (!shareLink.expires_at || new Date(shareLink.expires_at) >= new Date()) {
          isAuthorized = true;
          console.log('Authorized via share token:', shareToken.substring(0, 8) + '...');
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - valid JWT or share token required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    if (!credentialsJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT not configured');
    }

    const credentials: GoogleCredentials = JSON.parse(credentialsJson);
    const accessToken = await getAccessToken(credentials);

    console.log('MLO BigQuery Performance - Action:', action, 'Params:', { worksiteKey, locationKey, practitionerKey, days, startDate, endDate });

    let query = '';
    const jobProjectId = credentials.project_id;
    const projectDataset = 'vision-radiology.karisma_live';
    const dateFilter = getDateFilter(days, startDate, endDate);

    switch (action) {
      case 'worksite_summary':
        // Get worksite performance summary with patient, request, procedure counts
        query = `
          SELECT 
            sd.worksite_key as WorkSiteKey,
            sd.site_name as WorkSiteName,
            COUNT(DISTINCT sd.patient_key) as total_patients,
            COUNT(DISTINCT sd.request_key) as total_requests,
            COUNT(*) as total_procedures,
            MIN(sd.requested_date) as first_request,
            MAX(sd.requested_date) as last_request
          FROM \`${projectDataset}.vw_Service_Detail\` sd
          WHERE ${dateFilter}
            AND sd.site_name IS NOT NULL
          GROUP BY sd.worksite_key, sd.site_name
          ORDER BY total_procedures DESC
        `;
        break;

      case 'worksite_modality':
        // Get modality breakdown for a specific worksite
        if (!worksiteKey) throw new Error('worksiteKey required');
        query = `
          SELECT 
            sd.modality_name as Modality,
            COUNT(*) as procedure_count,
            COUNT(DISTINCT sd.patient_key) as patient_count
          FROM \`${projectDataset}.vw_Service_Detail\` sd
          WHERE sd.worksite_key = ${worksiteKey}
            AND ${dateFilter}
            AND sd.modality_name IS NOT NULL
          GROUP BY sd.modality_name
          ORDER BY procedure_count DESC
        `;
        break;

      case 'overall_modality_stats':
        // Get modality breakdown across all worksites (for org-wide or filtered view)
        query = `
          SELECT 
            sd.modality_name as Modality,
            COUNT(*) as procedure_count,
            COUNT(DISTINCT sd.patient_key) as patient_count
          FROM \`${projectDataset}.vw_Service_Detail\` sd
          WHERE ${dateFilter}
            AND sd.modality_name IS NOT NULL
          GROUP BY sd.modality_name
          ORDER BY procedure_count DESC
        `;
        break;

      case 'worksite_locations':
        // Get practitioner LOCATIONS (clinics/medical centres) for a worksite
        // Joins through Request_Record -> Practitioner_Assignment -> Version_Karisma_Practitioner_Location
        if (!worksiteKey) throw new Error('worksiteKey required');
        query = `
          SELECT 
            pl.Key as LocationKey,
            pl.Code as LocationCode,
            pl.Name as LocationName,
            pl.Description as LocationDescription,
            COUNT(DISTINCT pa.PractitionerRecordKey) as practitioner_count,
            COUNT(DISTINCT sd.patient_key) as total_patients,
            COUNT(DISTINCT sd.request_key) as total_requests,
            COUNT(*) as total_procedures,
            MAX(sd.requested_date) as last_referral
          FROM \`${projectDataset}.vw_Service_Detail\` sd
          JOIN \`${projectDataset}.Request_Record\` rr ON sd.request_key = rr.Key
          JOIN \`${projectDataset}.Practitioner_Assignment\` pa ON rr.RequestingPractitionerAssignmentKey = pa.Key
          JOIN \`${projectDataset}.Version_Karisma_Practitioner_Location\` pl ON pa.PractitionerLocationKey = pl.Key
          WHERE sd.worksite_key = ${worksiteKey}
            AND ${dateFilter}
            AND pl.Name IS NOT NULL
            AND pl.Key_Deleted = FALSE
          GROUP BY pl.Key, pl.Code, pl.Name, pl.Description
          ORDER BY total_procedures DESC
          LIMIT 100
        `; 
        break;

      case 'worksite_referrers':
        // Get referring PRACTITIONERS (doctors) for a worksite
        if (!worksiteKey) throw new Error('worksiteKey required');
        query = `
          SELECT 
            pr.Key as PractitionerKey,
            pr.Code as PractitionerCode,
            pr.Name as PractitionerName,
            COUNT(DISTINCT sd.patient_key) as total_patients,
            COUNT(DISTINCT sd.request_key) as total_requests,
            COUNT(*) as total_procedures,
            MAX(sd.requested_date) as last_referral
          FROM \`${projectDataset}.vw_Service_Detail\` sd
          JOIN \`${projectDataset}.Request_Record\` rr ON sd.request_key = rr.Key
          JOIN \`${projectDataset}.Practitioner_Assignment\` pa ON rr.RequestingPractitionerAssignmentKey = pa.Key
          JOIN \`${projectDataset}.Practitioner_Record\` pr ON pa.PractitionerRecordKey = pr.Key
          WHERE sd.worksite_key = ${worksiteKey}
            AND ${dateFilter}
            AND pr.Name IS NOT NULL
          GROUP BY pr.Key, pr.Code, pr.Name
          ORDER BY total_procedures DESC
          LIMIT 200
        `; 
        break;

      case 'location_referrers':
        // Get referring practitioners for a specific LOCATION (clinic)
        if (!locationKey) throw new Error('locationKey required');
        if (!worksiteKey) throw new Error('worksiteKey required');
        query = `
          SELECT 
            pr.Key as PractitionerKey,
            pr.Code as PractitionerCode,
            pr.Name as PractitionerName,
            COUNT(DISTINCT sd.patient_key) as total_patients,
            COUNT(DISTINCT sd.request_key) as total_requests,
            COUNT(*) as total_procedures,
            MAX(sd.requested_date) as last_referral
          FROM \`${projectDataset}.vw_Service_Detail\` sd
          JOIN \`${projectDataset}.Request_Record\` rr ON sd.request_key = rr.Key
          JOIN \`${projectDataset}.Practitioner_Assignment\` pa ON rr.RequestingPractitionerAssignmentKey = pa.Key
          JOIN \`${projectDataset}.Practitioner_Record\` pr ON pa.PractitionerRecordKey = pr.Key
          WHERE pa.PractitionerLocationKey = ${locationKey}
            AND sd.worksite_key = ${worksiteKey}
            AND ${dateFilter}
            AND pr.Name IS NOT NULL
          GROUP BY pr.Key, pr.Code, pr.Name
          ORDER BY total_procedures DESC
          LIMIT 200
        `; 
        break;

      case 'practitioner_details':
        // Get summary for a specific practitioner
        if (!practitionerKey) throw new Error('practitionerKey required');
        query = `
          SELECT 
            pr.Key as PractitionerKey,
            pr.Name as PractitionerName,
            COUNT(DISTINCT sd.patient_key) as total_patients,
            COUNT(DISTINCT sd.request_key) as total_requests,
            COUNT(*) as total_procedures
          FROM \`${projectDataset}.vw_Service_Detail\` sd
          JOIN \`${projectDataset}.Request_Record\` rr ON sd.request_key = rr.Key
          JOIN \`${projectDataset}.Practitioner_Assignment\` pa ON rr.RequestingPractitionerAssignmentKey = pa.Key
          JOIN \`${projectDataset}.Practitioner_Record\` pr ON pa.PractitionerRecordKey = pr.Key
          WHERE pr.Key = ${practitionerKey}
            AND ${dateFilter}
          GROUP BY pr.Key, pr.Name
        `;
        break;

      case 'practitioner_daily':
        // Get daily breakdown for a practitioner (last 30 days)
        if (!practitionerKey) throw new Error('practitionerKey required');
        query = `
          SELECT 
            sd.requested_date as date,
            COUNT(*) as procedure_count
          FROM \`${projectDataset}.vw_Service_Detail\` sd
          JOIN \`${projectDataset}.Request_Record\` rr ON sd.request_key = rr.Key
          JOIN \`${projectDataset}.Practitioner_Assignment\` pa ON rr.RequestingPractitionerAssignmentKey = pa.Key
          JOIN \`${projectDataset}.Practitioner_Record\` pr ON pa.PractitionerRecordKey = pr.Key
          WHERE pr.Key = ${practitionerKey}
            AND sd.requested_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
          GROUP BY sd.requested_date
          ORDER BY sd.requested_date DESC
        `;
        break;

      case 'overall_stats':
        // Get overall stats for dashboard
        query = `
          SELECT 
            COUNT(DISTINCT sd.patient_key) as total_patients,
            COUNT(DISTINCT sd.request_key) as total_requests,
            COUNT(*) as total_procedures,
            COUNT(DISTINCT sd.worksite_key) as total_worksites
          FROM \`${projectDataset}.vw_Service_Detail\` sd
          WHERE ${dateFilter}
        `;
        break;

      case 'filtered_modality_stats':
        // Get modality breakdown for specific worksites (for MLO-filtered view)
        const worksiteKeys = body.worksiteKeys as string[] | undefined;
        if (!worksiteKeys || worksiteKeys.length === 0) {
          throw new Error('worksiteKeys required for filtered_modality_stats');
        }
        // Quote the worksite keys for safe SQL
        const worksiteKeysList = worksiteKeys.map(k => `'${k}'`).join(',');
        query = `
          SELECT 
            sd.modality_name as Modality,
            COUNT(*) as procedure_count,
            COUNT(DISTINCT sd.patient_key) as patient_count
          FROM \`${projectDataset}.vw_Service_Detail\` sd
          WHERE ${dateFilter}
            AND sd.modality_name IS NOT NULL
            AND CAST(sd.worksite_key AS STRING) IN (${worksiteKeysList})
          GROUP BY sd.modality_name
          ORDER BY procedure_count DESC
        `;
        break;

      case 'get_modality_targets': {
        // Fetch modality targets from Supabase (bypassing RLS for shared access)
        const { mloId, periodStart, periodEnd } = body;
        
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        let targetsQuery = supabaseAdmin
          .from('mlo_modality_targets')
          .select(`
            *,
            location:locations(id, name),
            modality_type:modality_types(*),
            user:profiles!mlo_modality_targets_user_id_fkey(id, full_name, email)
          `);
        
        if (mloId) {
          targetsQuery = targetsQuery.eq('user_id', mloId);
        }
        if (periodStart) {
          targetsQuery = targetsQuery.gte('period_end', periodStart);
        }
        if (periodEnd) {
          targetsQuery = targetsQuery.lte('period_start', periodEnd);
        }
        
        const { data: targetsData, error: targetsError } = await targetsQuery.order('period_start', { ascending: false });
        
        if (targetsError) {
          throw new Error(`Error fetching targets: ${targetsError.message}`);
        }
        
        return new Response(
          JSON.stringify({ success: true, data: targetsData || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_mlo_assigned_locations': {
        // Get assigned locations for a specific MLO (bypassing RLS for shared access)
        const { mloId } = body;
        
        if (!mloId) {
          return new Response(
            JSON.stringify({ success: true, data: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        const { data: assignmentsData, error: assignmentsError } = await supabaseAdmin
          .from('mlo_assignments')
          .select(`location:locations(id, name)`)
          .eq('user_id', mloId);
        
        if (assignmentsError) {
          throw new Error(`Error fetching assignments: ${assignmentsError.message}`);
        }
        
        const locationNames = (assignmentsData || [])
          .map((a: any) => a.location?.name)
          .filter((name: any): name is string => !!name);
        
        return new Response(
          JSON.stringify({ success: true, data: locationNames }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_all_mlo_assignments': {
        // Get all MLO assignments with locations for worksite-to-MLO mapping (bypassing RLS)
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        const { data: allAssignmentsData, error: allAssignmentsError } = await supabaseAdmin
          .from('mlo_assignments')
          .select(`
            location:locations(id, name),
            user:profiles!mlo_assignments_user_id_fkey(id, full_name, email)
          `);
        
        if (allAssignmentsError) {
          throw new Error(`Error fetching all assignments: ${allAssignmentsError.message}`);
        }
        
        return new Response(
          JSON.stringify({ success: true, data: allAssignmentsData || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const data = await queryBigQuery(accessToken, jobProjectId, query);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('MLO BigQuery Performance error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
