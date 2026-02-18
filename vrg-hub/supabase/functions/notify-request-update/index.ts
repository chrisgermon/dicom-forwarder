import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  requestId: string;
  action: 'submitted' | 'approved' | 'declined' | 'ordered';
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

    // Get request details first - try tickets table first, then hardware_requests
    let requestData: any = null;
    let ccEmails: string[] = [];
    
    const { data: ticketData } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (ticketData) {
      requestData = ticketData;
      ccEmails = ticketData.cc_emails || [];
    } else {
      const { data: hwData, error: requestError } = await supabase
        .from('hardware_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !hwData) {
        throw new Error(`Failed to fetch request: ${requestError?.message}`);
      }
      
      requestData = hwData;
      ccEmails = hwData.cc_emails || [];
    }

    // Get requester profile
    const { data: requesterProfile, error: requesterError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', requestData.user_id)
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

    let emailData;
    let recipientEmail;
    let subject;

    switch (action) {
      case 'submitted': {
        // Get notification recipients from user notifications table
        const { data: userNotifications } = await supabase
          .from('request_type_notifications')
          .select('user_id, receive_notifications')
          .eq('company_id', requestData.company_id)
          .eq('request_type', 'hardware')
          .eq('receive_notifications', true);

        if (!userNotifications || userNotifications.length === 0) {
          console.log('[notify-request-update] No user notifications configured, using fallback logic');
          
          // Fallback: Get membership_ids with approver/admin roles
          const { data: roleRows } = await supabase
            .from('membership_roles')
            .select('membership_id, role')
            .in('role', ['approver', 'company_admin', 'company_owner']);

          const membershipIds = (roleRows || []).map((r: any) => r.membership_id);

          // Get active memberships for this company matching those roles
          const { data: memberships } = await supabase
            .from('company_memberships')
            .select('id, user_id')
            .eq('company_id', requestData.company_id)
            .eq('status', 'active')
            .in('id', membershipIds);

          let recipientUserIds: string[] = Array.from(new Set((memberships || []).map((m: any) => m.user_id).filter(Boolean)));

          // Backward-compat fallback to legacy user_roles if none found
          if (!recipientUserIds.length) {
            const { data: legacyManagers } = await supabase
              .from('user_roles')
              .select('user_id, role')
              .eq('company_id', requestData.company_id)
              .in('role', ['manager', 'tenant_admin', 'super_admin']);
            recipientUserIds = Array.from(new Set((legacyManagers || []).map((m: any) => m.user_id).filter(Boolean)));
          }

          // Final fallback to company approval_emails
          if (!recipientUserIds.length) {
            const { data: company } = await supabase
              .from('companies')
              .select('approval_emails')
              .eq('id', requestData.company_id)
              .maybeSingle();
            const fallbackEmails = (company?.approval_emails || []).filter((e: string) => !!e);
            
            if (fallbackEmails.length === 0) {
              console.warn('[notify-request-update] No recipients found; skipping email send.');
              break;
            }

            // Send to fallback emails
            for (const email of fallbackEmails) {
              recipientEmail = email;
              subject = `[${requestData.request_number || requestId}] New Hardware Request: ${requestData.title}`;

              emailData = {
                requestTitle: requestData.title,
                requestId: requestData.id,
                requestUrl: `https://hub.visionradiology.com.au/request/VRG-${String(requestData.request_number).padStart(5, '0')}`,
                requesterName: requesterProfile.name,
                totalAmount: requestData.total_amount,
                currency: requestData.currency,
                managerEmail: recipientEmail,
              };

              const emailResult = await supabase.functions.invoke('send-notification-email', {
                body: {
                  to: recipientEmail,
                  cc: ccEmails.length > 0 ? ccEmails : undefined,
                  subject,
                  template: 'request_submitted',
                  data: emailData,
                },
              });

              await supabase.from('email_logs').insert({
                request_id: requestData.id,
                recipient_email: recipientEmail,
                email_type: 'request_submitted',
                subject: subject,
                status: (emailResult as any).error ? 'failed' : 'sent',
                error_message: (emailResult as any).error?.message || null,
                metadata: {
                  requester_name: requesterProfile.name,
                  source: 'fallback_emails',
                  cc_emails: ccEmails,
                },
              });
            }
            break;
          }

          // Fetch profiles for user IDs from fallback
          const { data: profiles } = await supabase
            .from('profiles')
            .select('email, name')
            .in('user_id', recipientUserIds);

          if (!profiles || profiles.length === 0) {
            console.warn('[notify-request-update] No profiles found for recipients.');
            break;
          }

          // Send to fallback user profiles
          for (const profile of profiles) {
            recipientEmail = profile.email;
            subject = `[${requestData.request_number || requestId}] New Hardware Request: ${requestData.title}`;

            emailData = {
              requestTitle: requestData.title,
              requestId: requestData.id,
              requestUrl: `https://hub.visionradiology.com.au/request/VRG-${String(requestData.request_number).padStart(5, '0')}`,
              requesterName: requesterProfile.name,
              totalAmount: requestData.total_amount,
              currency: requestData.currency,
              managerEmail: recipientEmail,
            };

            const emailResult = await supabase.functions.invoke('send-notification-email', {
              body: {
                to: recipientEmail,
                cc: ccEmails.length > 0 ? ccEmails : undefined,
                subject,
                template: 'request_submitted',
                data: emailData,
              },
            });

            await supabase.from('email_logs').insert({
              request_id: requestData.id,
              recipient_email: recipientEmail,
              email_type: 'request_submitted',
              subject: subject,
              status: (emailResult as any).error ? 'failed' : 'sent',
              error_message: (emailResult as any).error?.message || null,
              metadata: {
                requester_name: requesterProfile.name,
                source: 'fallback_profiles',
                cc_emails: ccEmails,
              },
            });
          }
          break;
        }

        // Get user IDs from notifications
        const userIds = userNotifications.map(n => n.user_id);

        // Fetch profiles for these users
        const { data: profiles } = await supabase
          .from('profiles')
          .select('email, name')
          .in('user_id', userIds);

        if (!profiles || profiles.length === 0) {
          console.warn('[notify-request-update] No profiles found; skipping email send.');
          break;
        }

        console.log('[notify-request-update] Sending to user notifications:', profiles.length, 'recipients');

        // Send to all configured recipients
        for (const profile of profiles) {
          recipientEmail = profile.email;
          subject = `[${requestData.request_number || requestId}] New Hardware Request: ${requestData.title}`;

          emailData = {
            requestTitle: requestData.title,
            requestId: requestData.id,
            requestUrl: `https://hub.visionradiology.com.au/request/VRG-${String(requestData.request_number).padStart(5, '0')}`,
            requesterName: requesterProfile.name,
            totalAmount: requestData.total_amount,
            currency: requestData.currency,
            managerEmail: recipientEmail,
          };

          const emailResult = await supabase.functions.invoke('send-notification-email', {
            body: {
              to: recipientEmail,
              cc: ccEmails.length > 0 ? ccEmails : undefined,
              subject,
              template: 'request_submitted',
              data: emailData,
            },
          });

          await supabase.from('email_logs').insert({
            request_id: requestData.id,
            recipient_email: recipientEmail,
            email_type: 'request_submitted',
            subject: subject,
            status: (emailResult as any).error ? 'failed' : 'sent',
            error_message: (emailResult as any).error?.message || null,
            metadata: {
              requester_name: requesterProfile.name,
              source: 'user_notifications',
              cc_emails: ccEmails,
            },
          });
        }
        break;
      }

      case 'approved':
        // Notify requester about approval
        recipientEmail = requesterProfile.email;
        subject = `[${requestData.request_number || requestId}] Request Approved: ${requestData.title}`;
        
        emailData = {
          requestTitle: requestData.title,
          requestId: requestData.id,
          requestUrl: `https://hub.visionradiology.com.au/request/VRG-${String(requestData.request_number).padStart(5, '0')}`,
          requesterName: requesterProfile.name,
          managerName: approverData?.name,
          totalAmount: requestData.total_amount,
          currency: requestData.currency
        };

        const emailResult = await supabase.functions.invoke('send-notification-email', {
          body: {
            to: recipientEmail,
            cc: ccEmails.length > 0 ? ccEmails : undefined,
            subject,
            template: 'request_approved',
            data: emailData
          }
        });

        // Log the email
        await supabase
          .from('email_logs')
          .insert({
            request_id: requestData.id,
            recipient_email: recipientEmail,
            email_type: 'request_approved',
            subject: subject,
            status: emailResult.error ? 'failed' : 'sent',
            error_message: emailResult.error?.message || null,
            metadata: {
              approver_name: approverData?.name,
              requester_name: requesterProfile.name,
              cc_emails: ccEmails,
            }
          });

        // Also notify IT/orders team
        const ordersEmail = 'hub@visionradiology.com.au';
        const ordersSubject = `[${requestData.request_number || requestId}] Hardware Order Approved: ${requestData.title}`;
        
        // Fetch request items for the orders team
        const { data: requestItems } = await supabase
          .from('request_items')
          .select('*')
          .eq('request_id', requestData.id);

        // Generate secure token for order confirmation
        const confirmToken = crypto.randomUUID() + '-' + crypto.randomUUID();
        const { data: tokenData, error: tokenError } = await supabase
          .from('order_confirmation_tokens')
          .insert({
            request_id: requestData.id,
            token: confirmToken
          })
          .select()
          .single();

        if (tokenError) {
          console.error('Error creating confirmation token:', tokenError);
        }

        const ordersEmailData = {
          requestTitle: requestData.title,
          requestId: requestData.id,
          requestUrl: `https://hub.visionradiology.com.au/request/VRG-${String(requestData.request_number).padStart(5, '0')}`,
          requesterName: requesterProfile.name,
          managerName: approverData?.name,
          totalAmount: requestData.total_amount,
          currency: requestData.currency,
          items: requestItems || [],
          clinicName: requestData.clinic_name,
          businessJustification: requestData.business_justification,
          confirmToken: confirmToken // Add the token to email data
        };

        const ordersEmailResult = await supabase.functions.invoke('send-notification-email', {
          body: {
            to: ordersEmail,
            subject: ordersSubject,
            template: 'hardware_order_notification',
            data: ordersEmailData
          }
        });

        // Log the orders email
        await supabase
          .from('email_logs')
          .insert({
            request_id: requestData.id,
            recipient_email: ordersEmail,
            email_type: 'hardware_order_notification',
            subject: ordersSubject,
            status: ordersEmailResult.error ? 'failed' : 'sent',
            error_message: ordersEmailResult.error?.message || null,
            metadata: {
              approver_name: approverData?.name,
              requester_name: requesterProfile.name
            }
          });
        break;

      case 'declined':
        // Notify requester about decline
        recipientEmail = requesterProfile.email;
        subject = `[${requestData.request_number || requestId}] Request Declined: ${requestData.title}`;
        
        emailData = {
          requestTitle: requestData.title,
          requestId: requestData.id,
          requestUrl: `https://hub.visionradiology.com.au/request/VRG-${String(requestData.request_number).padStart(5, '0')}`,
          requesterName: requesterProfile.name,
          managerName: approverData?.name,
          declineReason: requestData.decline_reason || notes,
          totalAmount: requestData.total_amount,
          currency: requestData.currency
        };

        const emailResultDeclined = await supabase.functions.invoke('send-notification-email', {
          body: {
            to: recipientEmail,
            cc: ccEmails.length > 0 ? ccEmails : undefined,
            subject,
            template: 'request_declined',
            data: emailData
          }
        });

        // Log the email
        await supabase
          .from('email_logs')
          .insert({
            request_id: requestData.id,
            recipient_email: recipientEmail,
            email_type: 'request_declined',
            subject: subject,
            status: emailResultDeclined.error ? 'failed' : 'sent',
            error_message: emailResultDeclined.error?.message || null,
            metadata: {
              approver_name: approverData?.name,
              requester_name: requesterProfile.name,
              decline_reason: requestData.decline_reason || notes,
              cc_emails: ccEmails,
            }
          });
        break;

      case 'ordered':
        // Notify requester that items have been ordered
        recipientEmail = requesterProfile.email;
        subject = `[${requestData.request_number || requestId}] Request Ordered: ${requestData.title}`;
        
        emailData = {
          requestTitle: requestData.title,
          requestId: requestData.id,
          requestUrl: `https://hub.visionradiology.com.au/request/VRG-${String(requestData.request_number).padStart(5, '0')}`,
          requesterName: requesterProfile.name,
          totalAmount: requestData.total_amount,
          currency: requestData.currency
        };

        const emailResultOrdered = await supabase.functions.invoke('send-notification-email', {
          body: {
            to: recipientEmail,
            cc: ccEmails.length > 0 ? ccEmails : undefined,
            subject,
            template: 'request_ordered',
            data: emailData
          }
        });

        // Log the email
        await supabase
          .from('email_logs')
          .insert({
            request_id: requestData.id,
            recipient_email: recipientEmail,
            email_type: 'request_ordered',
            subject: subject,
            status: emailResultOrdered.error ? 'failed' : 'sent',
            error_message: emailResultOrdered.error?.message || null,
            metadata: {
              requester_name: requesterProfile.name,
              cc_emails: ccEmails,
            }
          });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-request-update function:", error);
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