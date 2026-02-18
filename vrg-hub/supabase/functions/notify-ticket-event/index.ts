import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyTicketEventRequest {
  requestId: string;
  requestType: string;
  eventType: 'created' | 'assigned' | 'reassigned' | 'status_changed' | 'commented' | 'escalated' | 'resolved';
  actorId?: string;
  oldValue?: string;
  newValue?: string;
  commentText?: string;
}

// Background task to process notifications
async function processNotifications(
  requestId: string,
  requestType: string,
  eventType: string,
  actorId: string | undefined,
  oldValue: string | undefined,
  newValue: string | undefined,
  commentText: string | undefined
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`[notify-ticket-event] Processing ${eventType} for ${requestType} request ${requestId}`);

  try {
    // Fetch request details - try tickets table first, then fallback to specific tables
    let request: any = null;
    let ccEmails: string[] = [];
    
    const { data: ticketData } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (ticketData) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', ticketData.user_id)
        .maybeSingle();
      
      request = { ...ticketData, profiles: userProfile };
      ccEmails = ticketData.cc_emails || [];
    } else {
      const tableName = requestType === 'hardware' ? 'hardware_requests' : 'department_requests';
      const { data: requestData, error: requestError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !requestData) {
        console.error(`[notify-ticket-event] Request not found: ${requestError?.message}`);
        return;
      }
      
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', requestData.user_id)
        .maybeSingle();
      
      request = { ...requestData, profiles: userProfile };
      ccEmails = requestData.cc_emails || [];
    }

    // Get actor details
    let actorName = 'System';
    if (actorId) {
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', actorId)
        .maybeSingle();
      actorName = actorProfile?.full_name || actorProfile?.email || 'Unknown User';
    }

    // Collect recipients
    const recipients: Set<string> = new Set();
    const inAppRecipients: Map<string, { userId: string }> = new Map();

    // Always notify the requester (unless they are the actor)
    const requesterEmail = request.profiles?.email;
    if (requesterEmail && actorId !== request.user_id) {
      recipients.add(requesterEmail);
      inAppRecipients.set(request.user_id, { userId: request.user_id });
    }

    // Notify assigned user - for assignment events, always notify the assignee (even if self-assigned)
    if (request.assigned_to) {
      const isAssignmentEvent = eventType === 'assigned' || eventType === 'reassigned';
      const shouldNotifyAssignee = isAssignmentEvent || actorId !== request.assigned_to;

      if (shouldNotifyAssignee) {
        inAppRecipients.set(request.assigned_to, { userId: request.assigned_to });

        const { data: assignedProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', request.assigned_to)
          .maybeSingle();

        if (assignedProfile?.email && actorId !== request.assigned_to) {
          recipients.add(assignedProfile.email);
        }
      }
    }

    // Notify watchers (except the actor)
    const { data: watchers } = await supabase
      .from('ticket_watchers')
      .select('user_id')
      .eq('ticket_id', requestId);

    if (watchers) {
      for (const watcher of watchers) {
        if (watcher.user_id !== actorId) {
          const { data: watcherProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', watcher.user_id)
            .maybeSingle();

          if (watcherProfile?.email) {
            recipients.add(watcherProfile.email);
            inAppRecipients.set(watcher.user_id, { userId: watcher.user_id });
          }
        }
      }
    }

    // Add CC emails
    if (ccEmails && ccEmails.length > 0) {
      ccEmails.forEach(email => {
        if (email && email.trim()) {
          recipients.add(email.trim());
        }
      });
    }

    // Notify users assigned via request_notification_assignments
    const { data: notificationAssignments } = await supabase
      .from('request_notification_assignments')
      .select('assignee_ids, notification_level')
      .eq('request_type', requestType);

    if (notificationAssignments && notificationAssignments.length > 0) {
      for (const assignment of notificationAssignments) {
        const shouldNotify =
          assignment.notification_level === 'all' ||
          (assignment.notification_level === 'new_only' && eventType === 'created') ||
          (assignment.notification_level === 'updates_only' && eventType !== 'created');

        if (shouldNotify && assignment.assignee_ids && Array.isArray(assignment.assignee_ids)) {
          for (const userId of assignment.assignee_ids) {
            if (userId !== actorId) {
              const { data: assigneeProfile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', userId)
                .maybeSingle();

              if (assigneeProfile?.email) {
                recipients.add(assigneeProfile.email);
                inAppRecipients.set(userId, { userId });
              }
            }
          }
        }
      }
    }

    if (recipients.size === 0 && inAppRecipients.size === 0) {
      console.log('[notify-ticket-event] No recipients to notify');
      return;
    }

    // Determine template and subject
    let template = 'request_notification';
    let subject = '';
    const requestNumber = `VRG-${String(request.request_number).padStart(5, '0')}`;
    let emailData: any = {
      requestId,
      requestNumber,
      requestTitle: request.title,
      requesterName: request.profiles?.full_name || request.profiles?.email || 'Unknown',
      actorName,
      requestUrl: `https://hub.visionradiology.com.au/request/${requestNumber}`,
    };

    switch (eventType) {
      case 'created':
        template = 'request_created';
        subject = `New Request: ${requestNumber} - ${request.title}`;
        break;
      case 'assigned':
        template = 'request_assigned';
        subject = `You've been assigned to ${requestNumber}`;
        break;
      case 'reassigned':
        template = 'request_reassigned';
        subject = `Request Reassigned: ${requestNumber}`;
        emailData.oldAssignee = oldValue;
        emailData.newAssignee = newValue;
        break;
      case 'status_changed':
        template = 'request_status_changed';
        subject = `Status Updated: ${requestNumber}`;
        emailData.oldStatus = oldValue;
        emailData.newStatus = newValue;
        break;
      case 'commented':
        template = 'request_comment_added';
        subject = `New Comment on ${requestNumber}`;
        emailData.commentText = commentText || '';
        break;
      case 'resolved':
        template = 'request_resolved';
        subject = `Request Completed: ${requestNumber}`;
        break;
      case 'escalated':
        template = 'request_escalated';
        subject = `ESCALATED: ${requestNumber}`;
        break;
    }

    // Send emails (fire and forget individual emails)
    for (const email of recipients) {
      try {
        const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
          body: { to: email, subject, template, data: emailData },
        });

        await supabase.from('email_logs').insert({
          request_id: requestId,
          recipient_email: email,
          email_type: template,
          subject: subject,
          status: emailError ? 'failed' : 'sent',
          error_message: emailError?.message || null,
          metadata: { event_type: eventType, actor_name: actorName, request_type: requestType },
        });

        if (emailError) {
          console.error(`[notify-ticket-event] Error sending to ${email}:`, emailError);
        } else {
          console.log(`[notify-ticket-event] Sent ${eventType} notification to ${email}`);
        }
      } catch (error) {
        console.error(`[notify-ticket-event] Failed to send to ${email}:`, error);
      }
    }

    // Create in-app notifications
    let inAppTitle = '';
    let inAppMessage = '';

    switch (eventType) {
      case 'created':
        inAppTitle = 'New Request Created';
        inAppMessage = `New request ${requestNumber}: ${request.title || request.subject || 'Untitled'}`;
        break;
      case 'assigned':
        inAppTitle = 'Request Assigned to You';
        inAppMessage = `You have been assigned to ${requestNumber}`;
        break;
      case 'reassigned':
        inAppTitle = 'Request Reassigned';
        inAppMessage = `Request ${requestNumber} has been reassigned`;
        break;
      case 'status_changed':
        inAppTitle = 'Request Status Updated';
        inAppMessage = `Request ${requestNumber} is now ${newValue || 'updated'}`;
        break;
      case 'commented':
        inAppTitle = 'New Comment';
        inAppMessage = `${actorName} commented on ${requestNumber}`;
        break;
      case 'resolved':
        inAppTitle = 'Request Completed';
        inAppMessage = `Request ${requestNumber} has been completed`;
        break;
      case 'escalated':
        inAppTitle = '⚠️ Request Escalated';
        inAppMessage = `Request ${requestNumber} has been escalated`;
        break;
      default:
        inAppTitle = 'Request Update';
        inAppMessage = `Update on request ${requestNumber}`;
    }

    for (const recipient of inAppRecipients.values()) {
      try {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: recipient.userId,
          type: 'ticket',
          title: inAppTitle,
          message: inAppMessage,
          reference_url: `/request/${requestNumber}`,
          is_read: false,
        });

        if (notifError) {
          console.error(`[notify-ticket-event] Error creating in-app notification for ${recipient.userId}:`, notifError);
        } else {
          console.log(`[notify-ticket-event] Created in-app notification for ${recipient.userId}`);
        }
      } catch (error) {
        console.error(`[notify-ticket-event] Failed to create in-app notification for ${recipient.userId}:`, error);
      }
    }

    console.log(`[notify-ticket-event] Completed: ${recipients.size} emails, ${inAppRecipients.size} in-app notifications`);
  } catch (error) {
    console.error('[notify-ticket-event] Background task error:', error);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, requestType, eventType, actorId, oldValue, newValue, commentText }: NotifyTicketEventRequest = await req.json();

    // Use EdgeRuntime.waitUntil to run notifications in background
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(
      processNotifications(requestId, requestType, eventType, actorId, oldValue, newValue, commentText)
    );

    // Return immediately
    return new Response(
      JSON.stringify({ success: true, message: 'Notification processing started' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('[notify-ticket-event] ERROR parsing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});