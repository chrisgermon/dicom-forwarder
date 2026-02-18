import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    }

    // Check for next page
    url = data['@odata.nextLink'] || null;
  }

  return { value: allResults, deltaLink: null };
}

async function fetchDeltaData(accessToken: string, deltaLink: string | null, endpoint: string): Promise<{ value: any[], deltaLink: string | null }> {
  let allResults: any[] = [];
  let nextDeltaLink: string | null = null;
  
  // Use delta link if available, otherwise start fresh delta query
  let url: string | null = deltaLink || `https://graph.microsoft.com/v1.0/${endpoint}`;

  while (url) {
    console.log('Fetching delta from:', url);
    const response: Response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Graph API delta error:', error);
      // If delta query fails, fall back to full sync
      if (response.status === 410) {
        console.log('Delta link expired, performing full sync');
        return await fetchGraphData(accessToken, endpoint.replace('/delta', ''));
      }
      throw new Error(`Graph API request failed: ${response.status}`);
    }

    const data: any = await response.json();
    
    // Add current batch to results
    if (data.value) {
      allResults = allResults.concat(data.value);
    }

    // Check for next page or delta link
    if (data['@odata.nextLink']) {
      url = data['@odata.nextLink'];
    } else {
      url = null;
      nextDeltaLink = data['@odata.deltaLink'] || null;
    }
  }

  return { value: allResults, deltaLink: nextDeltaLink };
}

async function syncCompany(supabase: any, connection: any, clientId: string, clientSecret: string) {
  let accessToken = connection.access_token;
  
  // Check if token needs refresh
  if (new Date(connection.token_expires_at) <= new Date()) {
    const tokens = await refreshAccessToken(connection.refresh_token, clientId, clientSecret);
    accessToken = tokens.access_token;
    
    // Update tokens in database
    await supabase
      .from('office365_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || connection.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      })
      .eq('id', connection.id);
  }

  // Use delta query for users if we have a delta link
  const usersDeltaEndpoint = 'users/delta?$select=userPrincipalName,displayName,mail,jobTitle,department,officeLocation,assignedLicenses,businessPhones,mobilePhone';
  const usersData = await fetchDeltaData(accessToken, connection.users_delta_link, usersDeltaEndpoint);
  
  console.log(`Processing ${usersData.value?.length || 0} user changes for company ${connection.company_id}`);
  
  // Store/update users
  let usersProcessed = 0;
  let usersDeleted = 0;
  
  for (const graphUser of usersData.value || []) {
    // Check if user was deleted (will have @removed property)
    if (graphUser['@removed']) {
      // Mark user as inactive
      await supabase
        .from('synced_office365_users')
        .update({ is_active: false, synced_at: new Date().toISOString() })
        .eq('company_id', connection.company_id)
        .eq('user_principal_name', graphUser.userPrincipalName);
      usersDeleted++;
    } else {
      // Include ALL users, not just those with licenses
      // Upsert user
      await supabase
        .from('synced_office365_users')
        .upsert({
          company_id: connection.company_id,
          user_principal_name: graphUser.userPrincipalName,
          display_name: graphUser.displayName,
          mail: graphUser.mail,
          job_title: graphUser.jobTitle,
          department: graphUser.department,
          office_location: graphUser.officeLocation,
          assigned_licenses: graphUser.assignedLicenses || [],
          business_phones: graphUser.businessPhones || null,
          mobile_phone: graphUser.mobilePhone || null,
          is_active: true,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'company_id,user_principal_name',
        });
      usersProcessed++;
    }
  }

  // Use delta query for groups/mailboxes if we have a delta link
  const groupsDeltaEndpoint = 'groups/delta?$filter=mailEnabled eq true&$select=displayName,mail,id';
  const mailboxesData = await fetchDeltaData(accessToken, connection.groups_delta_link, groupsDeltaEndpoint);
  
  console.log(`Processing ${mailboxesData.value?.length || 0} mailbox changes for company ${connection.company_id}`);
  
  let mailboxesProcessed = 0;
  let mailboxesDeleted = 0;

  // Store/update mailboxes with members
  for (const mailbox of mailboxesData.value || []) {
    // Check if mailbox was deleted
    if (mailbox['@removed']) {
      // Delete mailbox from our database
      await supabase
        .from('synced_office365_mailboxes')
        .delete()
        .eq('company_id', connection.company_id)
        .eq('email_address', mailbox.mail || mailbox.userPrincipalName);
      mailboxesDeleted++;
    } else {
      // Fetch members for this group/mailbox
      let members = [];
      try {
        const membersData = await fetchGraphData(
          accessToken,
          `groups/${mailbox.id}/members?$select=id,displayName,mail,userPrincipalName`
        );
        members = membersData.value || [];
      } catch (error) {
        console.error(`Failed to fetch members for mailbox ${mailbox.displayName}:`, error);
      }

      await supabase
        .from('synced_office365_mailboxes')
        .upsert({
          company_id: connection.company_id,
          mailbox_name: mailbox.displayName,
          email_address: mailbox.mail || mailbox.userPrincipalName,
          mailbox_type: 'shared',
          members: members,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'company_id,email_address',
        });
      mailboxesProcessed++;
    }
  }

  // Update connection with new delta links and last sync time
  await supabase
    .from('office365_connections')
    .update({ 
      last_sync_at: new Date().toISOString(),
      users_delta_link: usersData.deltaLink,
      groups_delta_link: mailboxesData.deltaLink,
    })
    .eq('id', connection.id);

  // Log sync to audit logs
  await supabase
    .from('audit_logs')
    .insert({
      action: 'office365_sync',
      table_name: 'office365_connections',
      record_id: connection.id,
      new_data: {
        company_id: connection.company_id,
        users_synced: usersProcessed,
        users_deleted: usersDeleted,
        mailboxes_synced: mailboxesProcessed,
        mailboxes_deleted: mailboxesDeleted,
        sync_type: usersData.deltaLink ? 'differential' : 'full',
        sync_time: new Date().toISOString(),
      },
    });

  return {
    company_id: connection.company_id,
    users_synced: usersProcessed,
    users_deleted: usersDeleted,
    mailboxes_synced: mailboxesProcessed,
    mailboxes_deleted: mailboxesDeleted,
  };
}

Deno.serve(async (req) => {
  try {
    console.log('Starting Office 365 cron sync...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Missing Microsoft Graph credentials');
    }

    // Get all active connections
    const { data: connections, error: connError } = await supabase
      .from('office365_connections')
      .select('*')
      .eq('is_active', true);

    if (connError) throw connError;

    if (!connections || connections.length === 0) {
      console.log('No active Office 365 connections to sync');
      return new Response(
        JSON.stringify({ message: 'No active connections', synced: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    
    // Sync each company
    for (const connection of connections) {
      try {
        console.log(`Syncing company ${connection.company_id}...`);
        const result = await syncCompany(supabase, connection, clientId, clientSecret);
        results.push(result);
        console.log(`Synced company ${connection.company_id}: ${result.users_synced} users (${result.users_deleted} deleted), ${result.mailboxes_synced} mailboxes (${result.mailboxes_deleted} deleted)`);
      } catch (error) {
        console.error(`Error syncing company ${connection.company_id}:`, error);
        
        // Log failed sync to audit logs
        await supabase
          .from('audit_logs')
          .insert({
            action: 'office365_sync_failed',
            table_name: 'office365_connections',
            record_id: connection.id,
            new_data: {
              company_id: connection.company_id,
              error: error instanceof Error ? error.message : 'Unknown error',
              sync_time: new Date().toISOString(),
            },
          });
        
        results.push({
          company_id: connection.company_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Sync completed',
        total_companies: connections.length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cron sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
