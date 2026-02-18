// Using Deno.serve instead of deprecated import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  requestId: string;
  action: 'approved' | 'declined';
  userId?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, action, userId, notes }: NotificationRequest = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request details
    const { data: requestData, error: requestError } = await supabase
      .from('user_account_requests')
      .select(`
        *,
        user_account_applications(
          application:applications(name)
        ),
        company:companies(id)
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !requestData) {
      throw new Error(`Failed to fetch request: ${requestError?.message}`);
    }

    // Get company notification settings for user accounts from user notifications table
    const { data: userNotifications, error: notificationsError } = await supabase
      .from('request_type_notifications')
      .select('user_id, receive_notifications')
      .eq('company_id', requestData.company.id)
      .eq('request_type', 'user_account')
      .eq('receive_notifications', true);

    if (notificationsError || !userNotifications || userNotifications.length === 0) {
      console.error('No notification recipients configured for user account requests');
      throw new Error('No notification recipients configured for user account requests');
    }

    // Get user emails and company_id from profiles for in-app notifications
    const userIds = userNotifications.map(n => n.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, company_id')
      .in('id', userIds);

    if (profilesError || !profiles || profiles.length === 0) {
      console.error('Failed to fetch recipient profiles');
      throw new Error('Failed to fetch recipient profiles');
    }

    const recipientEmails = profiles.map(p => p.email).filter(Boolean);

    // Get requester profile
    const { data: requesterProfile, error: requesterError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', requestData.requested_by)
      .single();

    if (requesterError || !requesterProfile) {
      throw new Error(`Failed to fetch requester profile: ${requesterError?.message}`);
    }

    // Get approver details if userId is provided
    let approverData = null;
    if (userId) {
      const { data } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', userId)
        .single();
      approverData = data;
    }

    if (action === 'approved') {
      // Send notification to all configured recipients
      const subject = `New User Account to Create: ${requestData.first_name} ${requestData.last_name}`;
      
      const applications = requestData.user_account_applications?.map((app: any) => app.application.name) || [];

      const emailData = {
        requestId: requestData.id,
        requestUrl: `https://hub.visionradiology.com.au/admin`,
        firstName: requestData.first_name,
        lastName: requestData.last_name,
        email: requestData.email,
        department: requestData.department,
        jobTitle: requestData.job_title,
        startDate: requestData.start_date,
        office365License: requestData.office365_license?.replace(/_/g, ' '),
        sharedMailboxes: requestData.shared_mailboxes || [],
        roles: requestData.roles || [],
        applications: applications,
        requesterName: requesterProfile.name,
        managerName: approverData?.name,
      };

      // Send to all configured recipients
      for (const profile of profiles) {
        if (!profile.email) continue;

        const emailResult = await supabase.functions.invoke('send-notification-email', {
          body: {
            to: profile.email,
            subject,
            template: 'user_account_notification',
            data: emailData
          }
        });

        // Log the email
        await supabase
          .from('email_logs')
          .insert({
            recipient_email: profile.email,
            email_type: 'user_account_notification',
            subject: subject,
            status: emailResult.error ? 'failed' : 'sent',
            error_message: emailResult.error?.message || null,
            metadata: {
              request_id: requestData.id,
              requester_name: requesterProfile.name,
              approver_name: approverData?.name,
              user_name: `${requestData.first_name} ${requestData.last_name}`,
            }
          });

        // Create in-app notification
        if (profile.id && profile.company_id) {
          const { error: notifError } = await supabase.from('notifications').insert({
            user_id: profile.id,
            company_id: profile.company_id,
            type: 'user_account_request',
            title: 'New User Account to Create',
            message: `User account approved for ${requestData.first_name} ${requestData.last_name}`,
            reference_id: requestData.id,
            reference_url: '/admin/user-accounts',
          });

          if (notifError) {
            console.error('Error creating in-app notification:', notifError);
          } else {
            console.log('In-app notification created for:', profile.id);
          }
        }
      }

      // Log to audit_logs
      await supabase
        .from('audit_logs')
        .insert({
          user_id: requestData.requested_by,
          user_email: recipientEmails.join(', '),
          action: 'email_sent',
          table_name: 'email_logs',
          record_id: requestData.id,
          new_data: {
            email_type: 'user_account_notification',
            subject: subject,
            status: 'sent',
            recipients: recipientEmails
          }
        });

      console.log('User account notification sent to support team');
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-user-account-update function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
