import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return await response.json();
}

async function fetchGraphData(accessToken: string, endpoint: string) {
  let allResults: any[] = [];
  let url = endpoint.startsWith('http') 
    ? endpoint 
    : `https://graph.microsoft.com/v1.0/${endpoint}`;

  while (url) {
    console.log('Fetching from:', url);
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Graph API error:', error);
      throw new Error(`Graph API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Add current batch to results
    if (data.value) {
      allResults = allResults.concat(data.value);
      console.log(`Fetched ${data.value.length} items, total so far: ${allResults.length}`);
    }

    // Check for next page
    url = data['@odata.nextLink'] || null;
  }

  return { value: allResults };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body (handle empty body gracefully)
    let company_id: string | null = null;
    let create_auth_users = false;
    let include_mailboxes = true;

    try {
      const body = await req.json();
      company_id = body?.company_id || null;
      create_auth_users = !!body?.create_auth_users;
      include_mailboxes = body?.include_mailboxes !== undefined ? !!body?.include_mailboxes : true;
    } catch {
      // No body provided
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Determine company_id with multiple fallbacks
    if (!company_id) {
      // 1) Try from user profile (ignore errors if column doesn't exist)
      try {
        console.log('No company_id provided, attempting to infer from profile...');
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .maybeSingle();
        company_id = profile?.company_id || null;
      } catch (_) {
        // ignore
      }

      // 2) Fallback to user's most recent Office 365 connection
      if (!company_id) {
        console.log('Inferring company_id from user Office 365 connection...');
        const { data: userConnHint } = await supabase
          .from('office365_connections')
          .select('company_id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        company_id = userConnHint?.company_id || null;
      }

      // 3) Final fallback: any active SharePoint configuration
      if (!company_id) {
        console.log('Inferring company_id from active SharePoint configuration...');
        const { data: activeConfig } = await supabase
          .from('sharepoint_configurations')
          .select('company_id')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        company_id = activeConfig?.company_id || null;
      }
    }

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'Could not determine company_id for user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a sync job record
    const { data: syncJob, error: jobError } = await supabase
      .from('office365_sync_jobs')
      .insert({
        company_id,
        started_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (jobError || !syncJob) {
      console.error('Failed to create sync job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create sync job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start background sync using EdgeRuntime.waitUntil to keep it alive after response
    const syncPromise = performSync(syncJob.id, company_id, user.id, supabase, {
      createAuthUsers: create_auth_users,
      includeMailboxes: include_mailboxes,
    }).catch(err => {
      console.error('Background sync failed:', err);
    });
    
    // Use EdgeRuntime.waitUntil to ensure the background task completes
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(syncPromise);
    }

    // Return immediately with job ID for status polling
    return new Response(
      JSON.stringify({ 
        success: true,
        job_id: syncJob.id,
        status: 'running',
        message: 'Sync started. Poll job status for progress.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync initialization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function performSync(
  jobId: string,
  companyId: string,
  userId: string,
  supabase: any,
  opts: { createAuthUsers: boolean; includeMailboxes: boolean } = { createAuthUsers: false, includeMailboxes: true }
) {
  try {
    console.log('=== OFFICE 365 SYNC START ===');
    console.log('Job ID:', jobId);
    console.log('Company ID:', companyId);
    console.log('User ID:', userId);
    console.log('Timestamp:', new Date().toISOString());
    
    // Update job status to running
    await supabase
      .from('office365_sync_jobs')
      .update({ 
        status: 'running',
        progress: { step: 'Initializing', timestamp: new Date().toISOString() }
      })
      .eq('id', jobId);

    console.log('✓ Job status updated to running');

    // Update progress
    await supabase
      .from('office365_sync_jobs')
      .update({ 
        progress: { step: 'Finding Office 365 connection', timestamp: new Date().toISOString() }
      })
      .eq('id', jobId);
    
    // Debug visibility into connections available
    console.log('\n--- Step 1: Finding Office 365 Connection ---');
    try {
      const { count: totalConns } = await supabase
        .from('office365_connections')
        .select('id', { count: 'exact', head: true });
      console.log('Total Office 365 connections in database:', totalConns);
      console.log('Looking for company_id:', companyId, 'user_id:', userId);
    } catch (e) {
      console.error('Failed counting office365_connections:', e);
    }

    let connection: any = null;
    let connError: any = null;

    // 1) If company_id provided, try tenant/company-level match
    console.log('Strategy 1: Trying company_id match...');
    if (companyId) {
      const { data: companyConn, error } = await supabase
        .from('office365_connections')
        .select('*')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (companyConn) {
        console.log('✓ Found connection by company_id');
        connection = companyConn;
      } else {
        console.log('✗ No connection found by company_id');
        connError = error || connError;
      }
    }

    // 2) Fallback to user-level connection
    if (!connection) {
      console.log('Strategy 2: Trying user_id match...');
      const { data: userConn, error } = await supabase
        .from('office365_connections')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (userConn) {
        console.log('✓ Found connection by user_id');
        connection = userConn;
      } else {
        console.log('✗ No connection found by user_id');
        connError = error || connError;
      }
    }

    // 3) Final fallback: most recent tenant/company-level connection (user_id IS NULL)
    if (!connection) {
      console.log('Strategy 3: Trying tenant-level connection (user_id IS NULL)...');
      const { data: tenantConn, error } = await supabase
        .from('office365_connections')
        .select('*')
        .is('user_id', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tenantConn) {
        console.log('✓ Found tenant-level connection');
        connection = tenantConn;
      } else {
        console.log('✗ No tenant-level connection found');
        connError = error || connError;
      }
    }

    // 4) Last resort: any most recent connection regardless of user/company
    if (!connection) {
      console.log('Strategy 4: Trying any connection (last resort)...');
      const { data: anyConn, error } = await supabase
        .from('office365_connections')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (anyConn) {
        console.log('✓ Found connection (any)');
        connection = anyConn;
      } else {
        console.log('✗ No connection found at all');
        connError = error || connError;
      }
    }

    if (!connection) {
      console.error('✗✗✗ FATAL: No Office 365 connection found');
      await supabase
        .from('office365_sync_jobs')
        .update({ 
          status: 'failed',
          error_message: 'No active Office 365 connection found',
          completed_at: new Date().toISOString(),
          progress: { step: 'Failed - No connection', timestamp: new Date().toISOString() }
        })
        .eq('id', jobId);
      throw new Error('No active Office 365 connection found');
    }

    console.log('✓ Connection found! ID:', connection.id);
    console.log('  Company ID:', connection.company_id);
    console.log('  User ID:', connection.user_id);
    console.log('  Expires at:', connection.expires_at);
    console.log('  Has access token:', !!connection.access_token);
    console.log('  Has refresh token:', !!connection.refresh_token);

    let accessToken = connection.access_token;

    // Update progress
    await supabase
      .from('office365_sync_jobs')
      .update({ 
        progress: { step: 'Checking token validity', timestamp: new Date().toISOString() }
      })
      .eq('id', jobId);
    
    // If access token is missing, attempt immediate refresh using refresh_token
    console.log('\n--- Step 2: Checking Token Validity ---');
    if (!accessToken) {
      console.log('⚠ No access token found, attempting refresh...');
      if (!connection.refresh_token) {
        console.error('✗✗✗ FATAL: No refresh token available');
        const errMsg = 'Office 365 not connected. Please connect or reconnect in Settings > Integrations.';
        await supabase
          .from('office365_sync_jobs')
          .update({ 
            status: 'failed',
            error_message: errMsg,
            completed_at: new Date().toISOString(),
            progress: { step: 'Failed - No refresh token', timestamp: new Date().toISOString() }
          })
          .eq('id', jobId);
        throw new Error(errMsg);
      }
      console.log('Attempting to refresh token...');
      const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
      const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');
      console.log('Client ID configured:', !!clientId);
      console.log('Client Secret configured:', !!clientSecret);
      
      const tokens = await refreshAccessToken(connection.refresh_token, clientId!, clientSecret!);
      accessToken = tokens.access_token;
      await supabase
        .from('office365_connections')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || connection.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq('id', connection.id);
      console.log('✓ Token refreshed successfully');
    } else {
      console.log('✓ Access token exists');
    }
    
    // Check if token needs refresh (expires within 5 minutes)
    const tokenExpiresAt = new Date(connection.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    console.log('Token expiration check:');
    console.log('  Current time:', now.toISOString());
    console.log('  Token expires at:', tokenExpiresAt.toISOString());
    console.log('  Five minutes from now:', fiveMinutesFromNow.toISOString());
    console.log('  Needs refresh:', tokenExpiresAt <= fiveMinutesFromNow);
    
    if (tokenExpiresAt <= fiveMinutesFromNow) {
      console.log('⚠ Access token expired or expiring soon, refreshing...');
      
      if (!connection.refresh_token) {
        console.error('✗✗✗ FATAL: Connection expired and no refresh token');
        throw new Error('Office 365 connection expired and cannot be refreshed. Please reconnect in Settings > Integrations.');
      }
      
      const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
      const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');
      
      console.log('Refreshing token...');
      const tokens = await refreshAccessToken(connection.refresh_token, clientId!, clientSecret!);
      accessToken = tokens.access_token;
      
      // Update tokens in database
      await supabase
        .from('office365_connections')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || connection.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq('id', connection.id);
      
      console.log('✓ Token refreshed successfully');
    } else {
      console.log('✓ Token is still valid');
    }

    // Update progress
    await supabase
      .from('office365_sync_jobs')
      .update({ 
        progress: { step: 'Fetching users from Microsoft Graph', timestamp: new Date().toISOString() }
      })
      .eq('id', jobId);
    
    let usersData;
    console.log('\n--- Step 3: Fetching Users from Microsoft Graph ---');
    const effectiveCompanyId = companyId ?? connection.company_id;
    console.log('Effective company ID:', effectiveCompanyId);

    // Keep this lean; large expands (like memberOf) frequently cause timeouts.
    console.log('Fetching users (basic fields)...');
    usersData = await fetchGraphData(
      accessToken,
      'users?$select=userPrincipalName,displayName,mail,jobTitle,department,officeLocation,assignedLicenses,businessPhones,mobilePhone'
    );

    console.log('Total users retrieved:', usersData.value?.length || 0);

    // Update progress
    await supabase
      .from('office365_sync_jobs')
      .update({
        progress: {
          step: 'Processing users',
          timestamp: new Date().toISOString(),
          total_users: usersData.value?.length || 0,
          processed_users: 0,
          percent: 0,
        },
      })
      .eq('id', jobId);

    // Track sync statistics
    console.log('\n--- Step 4: Processing Users ---');
    let totalUsers = 0;
    let usersWithLicenses = 0;
    let usersSkipped = 0;
    
    // Store users in batches (much faster than 1 upsert per user)
    const BATCH_SIZE = 200;
    let batch: any[] = [];

    for (const graphUser of usersData.value || []) {
      totalUsers++;

      // Determine license status (do not skip unlicensed users; keep count)
      const hasLicense = Array.isArray(graphUser.assignedLicenses) && graphUser.assignedLicenses.length > 0;
      if (!hasLicense) {
        usersSkipped++;
      } else {
        usersWithLicenses++;
      }

      batch.push({
        company_id: effectiveCompanyId,
        user_principal_name: graphUser.userPrincipalName,
        display_name: graphUser.displayName,
        mail: graphUser.mail,
        job_title: graphUser.jobTitle,
        department: graphUser.department,
        office_location: graphUser.officeLocation,
        assigned_licenses: graphUser.assignedLicenses || [],
        business_phones: graphUser.businessPhones || null,
        mobile_phone: graphUser.mobilePhone || null,
        // member_of intentionally omitted here for performance
        is_active: true,
        synced_at: new Date().toISOString(),
      });

      const shouldFlush = batch.length >= BATCH_SIZE;
      const isLast = totalUsers === (usersData.value?.length || 0);

      if (shouldFlush || isLast) {
        await supabase
          .from('synced_office365_users')
          .upsert(batch, { onConflict: 'company_id,user_principal_name' });

        batch = [];

        const total = usersData.value?.length || 0;
        const percent = total ? Math.round((totalUsers / total) * 100) : 0;

        await supabase
          .from('office365_sync_jobs')
          .update({
            users_synced: usersWithLicenses,
            progress: {
              step: `Processing users (${totalUsers}/${total})`,
              timestamp: new Date().toISOString(),
              total_users: total,
              processed_users: totalUsers,
              users_with_licenses: usersWithLicenses,
              users_skipped: usersSkipped,
              percent,
            },
          })
          .eq('id', jobId);
      }
    }

    console.log('✓ User processing complete');
    console.log(`  Total users: ${totalUsers}`);
    console.log(`  Users with licenses: ${usersWithLicenses}`);
    console.log(`  Users skipped (no license): ${usersSkipped}`);

    // Update progress
    await supabase
      .from('office365_sync_jobs')
      .update({ 
        progress: { step: 'Fetching mailboxes', timestamp: new Date().toISOString() }
      })
      .eq('id', jobId);
    
    // Fetch mailboxes (shared mailboxes and groups)
    console.log('\n--- Step 5: Fetching Mailboxes ---');
    const mailboxesData = await fetchGraphData(
      accessToken,
      'groups?$filter=mailEnabled eq true&$select=displayName,mail,id'
    );
    console.log('Total mailboxes found:', mailboxesData.value?.length || 0);

    // Store mailboxes with members
    let mailboxesProcessed = 0;
    for (const mailbox of mailboxesData.value || []) {
      mailboxesProcessed++;
      if (mailboxesProcessed <= 5 || mailboxesProcessed % 10 === 0) {
        console.log(`Processing mailbox ${mailboxesProcessed}/${mailboxesData.value.length}: ${mailbox.displayName}`);
      }
      
      // Fetch members for this group/mailbox
      let members = [];
      try {
        const membersData = await fetchGraphData(
          accessToken,
          `groups/${mailbox.id}/members?$select=id,displayName,mail,userPrincipalName`
        );
        members = membersData.value || [];
        if (mailboxesProcessed <= 5) {
          console.log(`  ✓ Found ${members.length} members`);
        }
      } catch (error) {
        console.error(`  ✗ Failed to fetch members for ${mailbox.displayName}:`, error);
      }

      await supabase
        .from('synced_office365_mailboxes')
        .upsert({
          company_id: effectiveCompanyId,
          mailbox_name: mailbox.displayName,
          email_address: mailbox.mail || mailbox.userPrincipalName,
          mailbox_type: 'shared',
          members: members,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'company_id,email_address',
        });
    }
    console.log('✓ Mailbox processing complete');

    // Update progress
    await supabase
      .from('office365_sync_jobs')
      .update({ 
        progress: { step: 'Creating auth users', timestamp: new Date().toISOString() }
      })
      .eq('id', jobId);
    
    let usersCreated = 0;
    let usersExisted = 0;

    if (opts.createAuthUsers) {
      // Auto-create auth users for synced O365 users
      console.log('\n--- Step 6: Creating Auth Users ---');
      await supabase
        .from('office365_sync_jobs')
        .update({ progress: { step: 'Creating auth users', timestamp: new Date().toISOString() } })
        .eq('id', jobId);

      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const existingEmails = new Set<string>();

      console.log('Preloading existing auth users...');
      try {
        const perPage = 1000;
        let page = 1;
        while (true) {
          const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
          if (error) {
            console.error('Failed to preload existing auth users:', error);
            break;
          }

          for (const existingUser of data?.users || []) {
            if (existingUser.email) existingEmails.add(existingUser.email.toLowerCase());
          }

          if (!data?.users || data.users.length < perPage) break;
          page++;
        }
        console.log(`✓ Preloaded ${existingEmails.size} existing auth users`);
      } catch (error) {
        console.error('Unexpected error preloading auth users:', error);
      }

      console.log('Creating auth users for synced O365 users...');
      for (const syncedUser of usersData.value || []) {
        if (!syncedUser.mail) continue;

        const normalizedEmail = String(syncedUser.mail).toLowerCase();
        if (existingEmails.has(normalizedEmail)) {
          usersExisted++;
          continue;
        }

        try {
          await adminClient.auth.admin.createUser({
            email: syncedUser.mail,
            email_confirm: true,
            user_metadata: {
              full_name: syncedUser.displayName,
              imported_from_o365: true,
            },
          });
          usersCreated++;
          existingEmails.add(normalizedEmail);
        } catch (error) {
          console.error(`  ✗ Failed to create ${syncedUser.mail}:`, error);
        }
      }

      console.log('✓ Auth user creation complete');
      console.log(`  Users created: ${usersCreated}`);
      console.log(`  Users existed: ${usersExisted}`);
    } else {
      console.log('\n--- Step 6: Skipping Auth User Creation (import-only) ---');
      await supabase
        .from('office365_sync_jobs')
        .update({ progress: { step: 'Skipping auth user creation', timestamp: new Date().toISOString() } })
        .eq('id', jobId);
    }

    // Update last sync time
    console.log('\n--- Step 7: Finalizing Sync ---');
    console.log('Updating connection last sync time...');
    await supabase
      .from('office365_connections')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', connection.id);

    // Update job status to completed
    console.log('Updating job status to completed...');
    await supabase
      .from('office365_sync_jobs')
      .update({ 
        status: 'completed',
        users_synced: usersWithLicenses,
        mailboxes_synced: mailboxesData.value?.length || 0,
        users_created: usersCreated,
        completed_at: new Date().toISOString(),
        progress: {
          step: 'Completed',
          timestamp: new Date().toISOString(),
          total_users_found: totalUsers,
          users_synced: usersWithLicenses,
          users_skipped: usersSkipped,
          users_created: usersCreated,
          users_existed: usersExisted,
          mailboxes_synced: mailboxesData.value?.length || 0
        }
      })
      .eq('id', jobId);

    console.log('=== SYNC COMPLETED SUCCESSFULLY ===');
    console.log('Job ID:', jobId);
    console.log('Summary:');
    console.log(`  Total users found: ${totalUsers}`);
    console.log(`  Users with licenses synced: ${usersWithLicenses}`);
    console.log(`  Users skipped (no license): ${usersSkipped}`);
    console.log(`  Auth users created: ${usersCreated}`);
    console.log(`  Auth users existed: ${usersExisted}`);
    console.log(`  Mailboxes synced: ${mailboxesData.value?.length || 0}`);
  } catch (error) {
    console.error('=== SYNC FAILED ===');
    console.error('Job ID:', jobId);
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack available');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update job status to failed
    console.log('Updating job status to failed...');
    await supabase
      .from('office365_sync_jobs')
      .update({ 
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
        progress: {
          step: 'Failed',
          timestamp: new Date().toISOString(),
          error: errorMessage
        }
      })
      .eq('id', jobId);
    
    console.error('=== ERROR DETAILS LOGGED ===');
  }
}