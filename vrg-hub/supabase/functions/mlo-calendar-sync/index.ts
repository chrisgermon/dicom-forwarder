import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarEvent {
  subject: string;
  body: { contentType: string; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  reminderMinutesBeforeStart?: number;
}

async function refreshTokenIfNeeded(
  supabaseAdmin: any,
  connection: any
): Promise<string> {
  const expiresAt = new Date(connection.expires_at);
  const now = new Date();
  
  // Refresh if expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return connection.access_token;
  }

  console.log('Token expired or expiring soon, refreshing...');
  
  const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
  const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft Graph credentials not configured');
  }

  const tokenResponse = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    }
  );

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token refresh failed:', errorText);
    throw new Error('Failed to refresh Office 365 token. User needs to reconnect.');
  }

  const tokens = await tokenResponse.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  const updateData: Record<string, any> = {
    access_token: tokens.access_token,
    expires_at: newExpiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (tokens.refresh_token) {
    updateData.refresh_token = tokens.refresh_token;
  }

  await supabaseAdmin
    .from('office365_connections')
    .update(updateData)
    .eq('id', connection.id);

  console.log('Token refreshed successfully');
  return tokens.access_token;
}

async function createCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<{ id: string; webLink: string }> {
  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/events',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to create calendar event:', errorText);
    throw new Error(`Failed to create calendar event: ${response.status}`);
  }

  const data = await response.json();
  return { id: data.id, webLink: data.webLink };
}

async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<void> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to update calendar event:', errorText);
    throw new Error(`Failed to update calendar event: ${response.status}`);
  }
}

async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    console.error('Failed to delete calendar event:', errorText);
    throw new Error(`Failed to delete calendar event: ${response.status}`);
  }
}

async function getCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<any | null> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to get calendar event:', errorText);
    throw new Error(`Failed to get calendar event: ${response.status}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, visitId, eventType = 'follow_up' } = body;

    console.log(`Calendar sync action: ${action} for visit: ${visitId}, user: ${user.id}`);

    // Handle check_status without requiring connection - just check database
    if (action === 'check_status') {
      const { data: syncRecords } = await supabaseAdmin
        .from('mlo_calendar_sync')
        .select('*')
        .eq('mlo_visit_id', visitId);

      return new Response(
        JSON.stringify({ synced: syncRecords && syncRecords.length > 0, records: syncRecords || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's Office 365 connection (required for other actions)
    const { data: connection, error: connError } = await supabaseAdmin
      .from('office365_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ 
          error: 'Office 365 not connected',
          code: 'NOT_CONNECTED',
          message: 'Please connect your Office 365 account to sync calendar events.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get a valid access token
    const accessToken = await refreshTokenIfNeeded(supabaseAdmin, connection);

    if (action === 'sync_visit') {
      // Get the visit details
      const { data: visit, error: visitError } = await supabaseAdmin
        .from('mlo_visits')
        .select('*')
        .eq('id', visitId)
        .single();

      if (visitError || !visit) {
        return new Response(
          JSON.stringify({ error: 'Visit not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Only sync if there's a follow-up date
      if (!visit.follow_up_date) {
        return new Response(
          JSON.stringify({ error: 'No follow-up date set for this visit' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already synced
      const { data: existingSync } = await supabaseAdmin
        .from('mlo_calendar_sync')
        .select('*')
        .eq('mlo_visit_id', visitId)
        .eq('event_type', eventType)
        .maybeSingle();

      // Parse the follow-up date and time
      let followUpDate: Date;
      if (visit.follow_up_time) {
        // Combine date and time
        const [hours, minutes] = visit.follow_up_time.split(':').map(Number);
        followUpDate = new Date(visit.follow_up_date);
        followUpDate.setHours(hours, minutes, 0, 0);
      } else {
        // Default to 9 AM if no time specified
        followUpDate = new Date(visit.follow_up_date);
        followUpDate.setHours(9, 0, 0, 0);
      }
      const endDate = new Date(followUpDate.getTime() + 60 * 60 * 1000); // 1 hour duration

      // Use follow_up_location if set, otherwise fall back to location_name
      const eventLocation = visit.follow_up_location || visit.location_name;
      
      const calendarEvent: CalendarEvent = {
        subject: `MLO Follow-up: ${visit.contact_name || 'Visit'}`,
        body: {
          contentType: 'text',
          content: `Follow-up for MLO visit\n\nLocation: ${eventLocation || 'N/A'}\nPurpose: ${visit.purpose || 'N/A'}\nNotes: ${visit.follow_up_notes || visit.notes || 'N/A'}`,
        },
        start: {
          dateTime: followUpDate.toISOString(),
          timeZone: 'Australia/Sydney',
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: 'Australia/Sydney',
        },
        location: eventLocation ? { displayName: eventLocation } : undefined,
        reminderMinutesBeforeStart: 30,
      };

      if (existingSync) {
        // Update existing event
        await updateCalendarEvent(accessToken, existingSync.outlook_event_id, calendarEvent);
        
        await supabaseAdmin
          .from('mlo_calendar_sync')
          .update({
            synced_at: new Date().toISOString(),
            sync_status: 'synced',
            error_message: null,
          })
          .eq('id', existingSync.id);

        return new Response(
          JSON.stringify({ success: true, action: 'updated', eventId: existingSync.outlook_event_id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Create new event
        const { id: outlookEventId, webLink } = await createCalendarEvent(accessToken, calendarEvent);

        await supabaseAdmin
          .from('mlo_calendar_sync')
          .insert({
            mlo_visit_id: visitId,
            user_id: user.id,
            outlook_event_id: outlookEventId,
            event_type: eventType,
            sync_status: 'synced',
          });

        return new Response(
          JSON.stringify({ success: true, action: 'created', eventId: outlookEventId, webLink }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'delete_sync') {
      const { data: existingSync } = await supabaseAdmin
        .from('mlo_calendar_sync')
        .select('*')
        .eq('mlo_visit_id', visitId)
        .eq('event_type', eventType)
        .maybeSingle();

      if (existingSync) {
        await deleteCalendarEvent(accessToken, existingSync.outlook_event_id);
        
        await supabaseAdmin
          .from('mlo_calendar_sync')
          .delete()
          .eq('id', existingSync.id);
      }

      return new Response(
        JSON.stringify({ success: true, action: 'deleted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // check_status is handled earlier without requiring connection

    if (action === 'sync_from_outlook') {
      // Two-way sync: check if event was modified in Outlook
      const { data: syncRecords } = await supabaseAdmin
        .from('mlo_calendar_sync')
        .select('*')
        .eq('user_id', user.id)
        .eq('sync_status', 'synced');

      const updates = [];

      for (const sync of syncRecords || []) {
        try {
          const outlookEvent = await getCalendarEvent(accessToken, sync.outlook_event_id);
          
          if (!outlookEvent) {
            // Event was deleted in Outlook - mark follow-up as completed
            await supabaseAdmin
              .from('mlo_visits')
              .update({ follow_up_completed: true })
              .eq('id', sync.mlo_visit_id);

            await supabaseAdmin
              .from('mlo_calendar_sync')
              .delete()
              .eq('id', sync.id);

            updates.push({ visitId: sync.mlo_visit_id, action: 'completed_from_deletion' });
          } else {
            // Check if date/time changed - update both date and time
            const outlookDate = new Date(outlookEvent.start.dateTime);
            const dateStr = outlookDate.toISOString().split('T')[0];
            const hours = outlookDate.getHours().toString().padStart(2, '0');
            const minutes = outlookDate.getMinutes().toString().padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;
            
            await supabaseAdmin
              .from('mlo_visits')
              .update({ 
                follow_up_date: dateStr,
                follow_up_time: timeStr
              })
              .eq('id', sync.mlo_visit_id);

            await supabaseAdmin
              .from('mlo_calendar_sync')
              .update({
                last_modified: outlookEvent.lastModifiedDateTime,
                synced_at: new Date().toISOString(),
              })
              .eq('id', sync.id);

            updates.push({ visitId: sync.mlo_visit_id, action: 'synced' });
          }
        } catch (error) {
          console.error(`Error syncing event ${sync.outlook_event_id}:`, error);
          updates.push({ visitId: sync.mlo_visit_id, action: 'error', error: String(error) });
        }
      }

      return new Response(
        JSON.stringify({ success: true, updates }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'initial_sync') {
      // Pull existing Outlook events from -1 week to +1 year and store for reference
      console.log('Starting initial sync from Outlook calendar...');
      
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      
      const startDateTime = oneWeekAgo.toISOString();
      const endDateTime = oneYearFromNow.toISOString();
      
      // Fetch events from Outlook Calendar
      const calendarUrl = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}&$top=500&$select=id,subject,start,end,location,bodyPreview,lastModifiedDateTime,webLink`;
      
      const response = await fetch(calendarUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'outlook.timezone="Australia/Sydney"',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch calendar events:', errorText);
        throw new Error(`Failed to fetch calendar events: ${response.status}`);
      }

      const calendarData = await response.json();
      const events = calendarData.value || [];
      
      console.log(`Found ${events.length} events in Outlook calendar`);

      // Store imported events in a separate table or just return them for now
      // We'll store them in mlo_outlook_events table for reference
      const importedEvents = [];
      
      for (const event of events) {
        try {
          // Check if this event is already linked to an MLO visit
          const { data: existingSync } = await supabaseAdmin
            .from('mlo_calendar_sync')
            .select('id')
            .eq('outlook_event_id', event.id)
            .maybeSingle();

          if (!existingSync) {
            // Store the imported event for reference
            await supabaseAdmin
              .from('mlo_outlook_events')
              .upsert({
                user_id: user.id,
                outlook_event_id: event.id,
                subject: event.subject,
                start_datetime: event.start?.dateTime,
                end_datetime: event.end?.dateTime,
                location: event.location?.displayName,
                body_preview: event.bodyPreview,
                web_link: event.webLink,
                last_modified: event.lastModifiedDateTime,
                synced_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id,outlook_event_id',
              });

            importedEvents.push({
              id: event.id,
              subject: event.subject,
              start: event.start?.dateTime,
              end: event.end?.dateTime,
              location: event.location?.displayName,
            });
          }
        } catch (err) {
          console.error(`Error importing event ${event.id}:`, err);
        }
      }

      console.log(`Imported ${importedEvents.length} new events from Outlook`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          totalEvents: events.length,
          importedEvents: importedEvents.length,
          events: importedEvents.slice(0, 50) // Return first 50 for preview
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Calendar sync error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
