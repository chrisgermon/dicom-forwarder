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
  
  // Query execution timestamp for debugging
  const queryStartTime = Date.now();
  
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
        maxResults: 50000,
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

// Helper to build date filter for InvoiceDate
function getDateFilter(startDate?: string, endDate?: string): string {
  if (startDate && endDate) {
    return `InvoiceDate >= '${startDate}' AND InvoiceDate <= '${endDate}'`;
  }
  // Default to last 30 days
  return `InvoiceDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)`;
}

// Helper to build brand exclusion filter (consistent with filter_options)
function getBrandFilter(): string {
  return `AND (Brand IS NULL OR (
    LOWER(Brand) NOT LIKE '%crystal%'
    AND LOWER(Brand) NOT LIKE '%one radiology%'
    AND LOWER(Brand) NOT LIKE '%cremorne%'
  ))`;
}

// Helper to build worksite filter
function getWorksiteFilter(worksites?: string[]): string {
  if (!worksites || worksites.length === 0) return '';
  const quoted = worksites.map(w => `'${w.replace(/'/g, "\\'")}'`).join(',');
  return `AND WorkSiteName IN (${quoted})`;
}

// Helper to build radiologist filter
function getRadiologistFilter(radiologists?: string[]): string {
  if (!radiologists || radiologists.length === 0) return '';
  const quoted = radiologists.map(r => `'${r.replace(/'/g, "\\'")}'`).join(',');
  return `AND RadiologistName IN (${quoted})`;
}

// Helper to build modality filter
function getModalityFilter(modalities?: string[]): string {
  if (!modalities || modalities.length === 0) return '';
  const quoted = modalities.map(m => `'${m.replace(/'/g, "\\'")}'`).join(',');
  return `AND Modality IN (${quoted})`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, startDate, endDate, worksites, radiologists, modalities } = body;

    // Validate JWT auth
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

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Executive Dashboard - User:', claimsData.claims.sub, 'Action:', action);

    const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    if (!credentialsJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT not configured');
    }

    const credentials: GoogleCredentials = JSON.parse(credentialsJson);
    const accessToken = await getAccessToken(credentials);
    const jobProjectId = credentials.project_id;
const view = 'vision-radiology.karisma_live.vw_Revenue_Enhanced';

    // CTE to get revenue with REPORTING practitioner using RadiologistName from the view
    // Only includes procedures with verified status (Status = 5 in Request_ServiceStep)
    const revenueWithReportingCTE = `
      WITH RevenueWithReporting AS (
        SELECT 
          rev.InvoiceDate,
          rev.GrossRevenue,
          rev.WorkSiteName,
          rev.WorkSiteKey,
          rev.Modality,
          rev.InvoiceItemKey,
          rev.IsDiscarded,
          rev.Refunded,
          rev.Brand,
          rev.RadiologistName
        FROM \`${view}\` rev
        INNER JOIN \`vision-radiology.karisma_live.Version_Karisma_Invoice_ItemAdjustment\` iia
          ON rev.InvoiceItemKey = iia.InvoiceItemKey 
          AND iia.Key_Deleted = FALSE 
          AND iia.IsLatest = TRUE
        INNER JOIN \`vision-radiology.karisma_live.Version_Karisma_Invoice_ItemAdjustment_ItemServiceAssociation\` isa 
          ON iia.Key = isa.ParentKey 
          AND isa.DeletedTransactionKey IS NULL
        INNER JOIN \`vision-radiology.karisma_live.Version_Karisma_Request_Service\` rs 
          ON isa.ChildKey = rs.Key 
          AND rs.Key_Deleted = FALSE
        -- Join to service step to filter for verified procedures only (Status = 5)
        INNER JOIN \`vision-radiology.karisma_live.Version_Karisma_Request_ServiceStep\` rss
          ON rs.Key = rss.RequestServiceKey
          AND rss.Key_Deleted = FALSE
          AND rss.Status = 5
        WHERE rev.RadiologistName IS NOT NULL
      )
    `;

    // Simpler CTE for verified revenue (without reporting practitioner logic)
    // Used by queries that don't need practitioner attribution
    const verifiedRevenueCTE = `
      WITH VerifiedRevenue AS (
        SELECT DISTINCT
          rev.InvoiceDate,
          rev.GrossRevenue,
          rev.WorkSiteName,
          rev.WorkSiteKey,
          rev.Modality,
          rev.InvoiceItemKey,
          rev.IsDiscarded,
          rev.Refunded,
          rev.Brand,
          rev.RadiologistName
        FROM \`${view}\` rev
        INNER JOIN \`vision-radiology.karisma_live.Version_Karisma_Invoice_ItemAdjustment\` iia
          ON rev.InvoiceItemKey = iia.InvoiceItemKey 
          AND iia.Key_Deleted = FALSE 
          AND iia.IsLatest = TRUE
        INNER JOIN \`vision-radiology.karisma_live.Version_Karisma_Invoice_ItemAdjustment_ItemServiceAssociation\` isa 
          ON iia.Key = isa.ParentKey 
          AND isa.DeletedTransactionKey IS NULL
        INNER JOIN \`vision-radiology.karisma_live.Version_Karisma_Request_Service\` rs 
          ON isa.ChildKey = rs.Key 
          AND rs.Key_Deleted = FALSE
        -- Only include verified procedures (Status = 5)
        INNER JOIN \`vision-radiology.karisma_live.Version_Karisma_Request_ServiceStep\` rss
          ON rs.Key = rss.RequestServiceKey
          AND rss.Key_Deleted = FALSE
          AND rss.Status = 5
      )
    `;

    const dateFilter = getDateFilter(startDate, endDate);
    const brandFilter = getBrandFilter();
    const worksiteFilter = getWorksiteFilter(worksites);
    const radiologistFilter = getRadiologistFilter(radiologists);
    const modalityFilter = getModalityFilter(modalities);
    const baseFilters = `IsDiscarded = FALSE AND Refunded = FALSE AND ${dateFilter} ${brandFilter} ${worksiteFilter} ${radiologistFilter} ${modalityFilter}`;
    const baseFiltersReporting = `IsDiscarded = FALSE AND Refunded = FALSE AND ${dateFilter} ${brandFilter} ${worksiteFilter} ${radiologistFilter} ${modalityFilter}`;

    let query = '';
    let data: any[] = [];

    switch (action) {
      case 'data_freshness':
        // Get the most recent invoice date in the dataset to show data freshness
        query = `
          SELECT 
            MAX(InvoiceDate) as last_updated,
            COUNT(*) as total_records
          FROM \`${view}\`
          WHERE IsDiscarded = FALSE AND Refunded = FALSE
            AND InvoiceDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
            AND InvoiceDate <= CURRENT_DATE()
        `;
        data = await queryBigQuery(accessToken, jobProjectId, query);
        break;

      case 'kpis':
        // Get KPI summary - using reporting practitioner
        query = `
          ${revenueWithReportingCTE}
          SELECT 
            SUM(GrossRevenue) as total_revenue,
            COUNT(DISTINCT InvoiceItemKey) as study_count,
            COUNT(DISTINCT RadiologistName) as unique_radiologists,
            COUNT(DISTINCT WorkSiteName) as unique_worksites
          FROM RevenueWithReporting
          WHERE ${baseFiltersReporting}
        `;
        data = await queryBigQuery(accessToken, jobProjectId, query);
        break;

      case 'filter_options':
        // Extract brands from WorkSiteName since brand is embedded in the site name
        // Map display names to actual patterns in the data
        const brandPatterns: Record<string, string> = {
          'Vision Radiology': 'Vision Radiology - %',
          'Focus Radiology': 'Focus Radiology - %',
          'Quantum Medical Imaging': 'Quantum - %',
          'Light Radiology': 'Light Radiology - %'
        };
        const activeBrands = Object.keys(brandPatterns);
        const brandLikeFilter = Object.values(brandPatterns).map(p => `WorkSiteName LIKE '${p}'`).join(' OR ');
        
        // Query active sites from the last 2 years of data
        const [worksitesBrandData, radiologistsData, modalitiesData] = await Promise.all([
          queryBigQuery(accessToken, jobProjectId, `
            SELECT DISTINCT WorkSiteName
            FROM \`${view}\`
            WHERE IsDiscarded = FALSE AND Refunded = FALSE
              AND WorkSiteName IS NOT NULL
              AND (${brandLikeFilter})
              AND InvoiceDate >= '2023-01-01'
            ORDER BY WorkSiteName
          `),
          // Get REPORTING practitioners (not referring/invoicing practitioners)
          queryBigQuery(accessToken, jobProjectId, `
            ${revenueWithReportingCTE}
            SELECT DISTINCT RadiologistName
            FROM RevenueWithReporting
            WHERE IsDiscarded = FALSE AND Refunded = FALSE
              AND RadiologistName IS NOT NULL
              AND InvoiceDate >= '2023-01-01'
            ORDER BY RadiologistName
          `),
          queryBigQuery(accessToken, jobProjectId, `
            SELECT DISTINCT Modality
            FROM \`${view}\`
            WHERE IsDiscarded = FALSE AND Refunded = FALSE
              AND Modality IS NOT NULL
              AND (${brandLikeFilter})
              AND InvoiceDate >= '2023-01-01'
            ORDER BY Modality
          `)
        ]);

        // Group worksites by brand - extract brand from WorkSiteName (format: "Brand Name - Site Name")
        // Map actual data prefixes to display names
        const prefixToDisplayName: Record<string, string> = {
          'Vision Radiology': 'Vision Radiology',
          'Focus Radiology': 'Focus Radiology',
          'Quantum': 'Quantum Medical Imaging',
          'Quantum - Echo': 'Quantum Medical Imaging',
          'Light Radiology': 'Light Radiology'
        };
        
        const worksitesByBrand: Record<string, string[]> = {};
        worksitesBrandData.forEach((row: { WorkSiteName: string }) => {
          const worksite = row.WorkSiteName;
          // Extract brand (everything before " - ")
          const dashIndex = worksite.indexOf(' - ');
          if (dashIndex === -1) return;
          
          const prefix = worksite.substring(0, dashIndex);
          const displayBrand = prefixToDisplayName[prefix];
          if (!displayBrand) return;
          
          if (!worksitesByBrand[displayBrand]) {
            worksitesByBrand[displayBrand] = [];
          }
          // Store just the site name (everything after " - ")
          const siteName = worksite.substring(dashIndex + 3);
          if (!worksitesByBrand[displayBrand].includes(siteName)) {
            worksitesByBrand[displayBrand].push(siteName);
          }
        });
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: {
              worksitesByBrand,
              worksites: worksitesBrandData.map((w: { WorkSiteName: string }) => w.WorkSiteName),
              radiologists: radiologistsData.map(r => r.RadiologistName),
              modalities: modalitiesData.map(m => m.Modality)
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'worksite_hierarchy':
        // Worksite -> Radiologist -> Modality hierarchy - using reporting practitioner
        query = `
          ${revenueWithReportingCTE}
          SELECT
            WorkSiteName,
            RadiologistName,
            Modality,
            SUM(GrossRevenue) as revenue,
            COUNT(DISTINCT InvoiceItemKey) as study_count
          FROM RevenueWithReporting
          WHERE ${baseFiltersReporting}
          GROUP BY WorkSiteName, RadiologistName, Modality
          ORDER BY revenue DESC
        `;
        data = await queryBigQuery(accessToken, jobProjectId, query);
        break;

      case 'radiologist_hierarchy':
        // Radiologist -> Worksite -> Modality hierarchy - using reporting practitioner
        query = `
          ${revenueWithReportingCTE}
          SELECT 
            RadiologistName,
            WorkSiteName,
            Modality,
            SUM(GrossRevenue) as revenue,
            COUNT(DISTINCT InvoiceItemKey) as study_count
          FROM RevenueWithReporting
          WHERE ${baseFiltersReporting}
          GROUP BY RadiologistName, WorkSiteName, Modality
          ORDER BY revenue DESC
        `;
        data = await queryBigQuery(accessToken, jobProjectId, query);
        break;

      case 'revenue_trend':
        // Daily revenue trend - only verified procedures
        query = `
          ${verifiedRevenueCTE}
          SELECT 
            FORMAT_DATE('%Y-%m-%d', InvoiceDate) as day,
            SUM(GrossRevenue) as revenue,
            COUNT(*) as study_count
          FROM VerifiedRevenue
          WHERE ${baseFilters}
          GROUP BY day
          ORDER BY day ASC
        `;
        data = await queryBigQuery(accessToken, jobProjectId, query);
        break;

      case 'revenue_by_modality':
        // Revenue breakdown by modality - only verified procedures
        query = `
          ${verifiedRevenueCTE}
          SELECT 
            Modality,
            SUM(GrossRevenue) as revenue,
            COUNT(*) as study_count
          FROM VerifiedRevenue
          WHERE ${baseFilters}
          GROUP BY Modality
          ORDER BY revenue DESC
        `;
        data = await queryBigQuery(accessToken, jobProjectId, query);
        break;

      case 'top_radiologists':
        // Top 10 radiologists by revenue - using reporting practitioner
        query = `
          ${revenueWithReportingCTE}
          SELECT 
            RadiologistName,
            SUM(GrossRevenue) as revenue,
            COUNT(DISTINCT InvoiceItemKey) as study_count,
            COUNT(DISTINCT WorkSiteName) as worksite_count
          FROM RevenueWithReporting
           WHERE ${baseFiltersReporting}
              AND RadiologistName IS NOT NULL
          GROUP BY RadiologistName
          ORDER BY revenue DESC
          LIMIT 10
        `;
        data = await queryBigQuery(accessToken, jobProjectId, query);
        break;

      case 'top_worksites':
        // Top 10 worksites by revenue - only verified procedures
        query = `
          ${verifiedRevenueCTE}
          SELECT 
            WorkSiteName,
            SUM(GrossRevenue) as revenue,
            COUNT(*) as study_count,
            COUNT(DISTINCT RadiologistName) as radiologist_count
          FROM VerifiedRevenue
          WHERE ${baseFilters}
          GROUP BY WorkSiteName
          ORDER BY revenue DESC
          LIMIT 10
        `;
        data = await queryBigQuery(accessToken, jobProjectId, query);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Executive Dashboard error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
