import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  requestId: string;
  action: 'submitted' | 'updated' | 'completed' | 'cancelled';
  userId?: string;
  notes?: string;
  notificationUserIds?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[notify-department-request] Function invoked');
    const { requestId, action, userId, notes, notificationUserIds }: NotificationRequest = await req.json();
    console.log('[notify-department-request] Payload:', { requestId, action, userId, notificationUserIds });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request details from hardware_requests (which stores all department requests)
    console.log('[notify-department-request] Fetching request details...');
    const { data: requestData, error: requestError } = await supabase
      .from('hardware_requests')
      .select('*, request_number, cc_emails')
      .eq('id', requestId)
      .single();

    if (requestError || !requestData) {
      console.error('[notify-department-request] Failed to fetch request:', requestError);
      throw new Error(`Failed to fetch request: ${requestError?.message}`);
    }

    // Parse department info from business_justification
    let departmentInfo: any = {};
    try {
      departmentInfo = typeof requestData.business_justification === 'string' 
        ? JSON.parse(requestData.business_justification)
        : requestData.business_justification;
    } catch (e) {
      console.error('[notify-department-request] Failed to parse business_justification:', e);
    }
    
    console.log('[notify-department-request] Request data:', {
      id: requestData.id,
      title: requestData.title,
      department: departmentInfo.department,
      brand_id: requestData.brand_id
    });

    // Get requester profile
    console.log('[notify-department-request] Fetching requester profile...');
    const { data: requesterProfile, error: requesterError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', requestData.user_id)
      .single();

    if (requesterError || !requesterProfile) {
      console.error('[notify-department-request] Failed to fetch requester:', requesterError);
      throw new Error(`Failed to fetch requester profile: ${requesterError?.message}`);
    }
    
    console.log('[notify-department-request] Requester:', requesterProfile.email);

    let emailData;
    let recipientEmail;
    let subject;

    switch (action) {
      case 'submitted': {
        console.log('[notify-department-request] Action: submitted');
        
        let usersToNotify: any[] = [];

        // Check if form template has specific notification users
        if (notificationUserIds && notificationUserIds.length > 0) {
          console.log('[notify-department-request] Using template notification users:', notificationUserIds);
          const { data: templateUsers, error: templateUsersError } = await supabase
            .from('profiles')
            .select('id, full_name, email, sms_enabled, phone')
            .in('id', notificationUserIds)
            .eq('is_active', true);
          
          if (templateUsersError) {
            console.error('[notify-department-request] Error fetching template users:', templateUsersError);
          } else {
            usersToNotify = (templateUsers || []).map((u: any) => ({
              user_id: u.id,
              name: u.full_name,
              email: u.email,
              receive_notifications: true,
              sms_enabled: u.sms_enabled,
              phone: u.phone,
            }));
            console.log('[notify-department-request] Template users to notify:', usersToNotify.length);
          }
        }

        // If no template users, check request_categories for assigned users
        if (usersToNotify.length === 0) {
          console.log('[notify-department-request] No template users, checking request categories...');
          const categorySlug = departmentInfo.category_slug || departmentInfo.sub_department;
          if (categorySlug) {
            const { data: category } = await supabase
              .from('request_categories')
              .select('assigned_user_ids')
              .eq('slug', categorySlug)
              .single();

            if (category?.assigned_user_ids && category.assigned_user_ids.length > 0) {
              console.log('[notify-department-request] Found category assigned users:', category.assigned_user_ids);
              const { data: categoryUsers, error: categoryUsersError } = await supabase
                .from('profiles')
                .select('id, full_name, email, sms_enabled, phone')
                .in('id', category.assigned_user_ids)
                .eq('is_active', true);
              
              if (categoryUsersError) {
                console.error('[notify-department-request] Error fetching category users:', categoryUsersError);
              } else {
                usersToNotify = (categoryUsers || []).map((u: any) => ({
                  user_id: u.id,
                  name: u.full_name,
                  email: u.email,
                  receive_notifications: true,
                  sms_enabled: u.sms_enabled,
                  phone: u.phone,
                }));
                console.log('[notify-department-request] Category users to notify:', usersToNotify.length);
              }
            }
          }
        }

        if (usersToNotify.length > 0) {
          // Filter users who should receive notifications
          const notificationUsers = usersToNotify.filter((u: any) => u.receive_notifications);
          console.log('[notify-department-request] Users to notify:', notificationUsers.length);

          for (const user of notificationUsers) {
            console.log('[notify-department-request] Sending email to:', user.email);
            recipientEmail = user.email;
            const deptLabel = departmentInfo.department ? departmentInfo.department.replace('_', ' ') : 'Department';
            const requestNumber = `VRG-${String(requestData.request_number).padStart(5, '0')}`;
            subject = `[${requestNumber}] New ${deptLabel} Request: ${requestData.title}`;

            emailData = {
              requestTitle: requestData.title,
              requestNumber: `VRG-${String(requestData.request_number).padStart(5, '0')}`,
              requestId: requestData.id,
              requestUrl: `https://hub.visionradiology.com.au/request/VRG-${String(requestData.request_number).padStart(5, '0')}`,
              requesterName: requesterProfile.full_name || requesterProfile.email,
              department: deptLabel,
              subDepartment: departmentInfo.sub_department || '',
              priority: requestData.priority,
              description: requestData.description,
              assigneeName: user.name,
            };

            const emailResult = await supabase.functions.invoke('send-notification-email', {
              body: {
                to: recipientEmail,
                cc: requestData.cc_emails || [],
                subject,
                template: 'department_request_submitted',
                data: emailData,
              },
            });
            
            console.log('[notify-department-request] Email result:', emailResult.error ? 'FAILED' : 'SUCCESS');

            // Log to email_logs table
            const { error: emailLogError } = await supabase
              .from('email_logs')
              .insert({
                request_id: requestData.id,
                recipient_email: recipientEmail,
                email_type: 'department_request_submitted',
                subject: subject,
                status: (emailResult as any).error ? 'failed' : 'sent',
                error_message: (emailResult as any).error?.message || null,
                metadata: {
                  request_title: requestData.title,
                  assignee_name: user.name,
                  requester_name: requesterProfile.full_name,
                  department: deptLabel
                }
              });

            if (emailLogError) {
              console.error('[notify-department-request] Failed to insert email_logs:', emailLogError);
            }

            // Log to audit_logs
            const { error: auditError } = await supabase
              .from('audit_logs')
              .insert({
                user_id: requestData.user_id,
                user_email: recipientEmail,
                action: 'email_sent',
                table_name: 'hardware_requests',
                record_id: requestData.id,
                new_data: {
                  email_type: 'department_request_submitted',
                  subject: subject,
                  status: (emailResult as any).error ? 'failed' : 'sent',
                  recipient: recipientEmail,
                  request_title: requestData.title,
                  assignee_name: user.name,
                  requester_name: requesterProfile.full_name
                }
              });
            if (auditError) {
              console.error('[notify-department-request] Failed to insert audit_logs:', auditError);
            }

            // Create in-app notification for this user
            if (user.user_id && requestData.company_id) {
              const { error: notifError } = await supabase.from('notifications').insert({
                user_id: user.user_id,
                company_id: requestData.company_id,
                type: 'department_request',
                title: `New ${deptLabel} Request`,
                message: `New request ${requestNumber}: ${requestData.title}`,
                reference_id: requestData.id,
                reference_url: `/request/${requestNumber}`,
              });

              if (notifError) {
                console.error('[notify-department-request] Error creating in-app notification:', notifError);
              } else {
                console.log('[notify-department-request] In-app notification created for:', user.user_id);
              }
            }
          }
        } else {
          console.log('[notify-department-request] No assigned users, falling back to admin roles...');
          // Fallback: notify users with admin roles
          const { data: adminRoles } = await supabase
            .from('rbac_user_roles')
            .select('user_id')
            .in('role_id', (
              await supabase
                .from('rbac_roles')
                .select('id')
                .in('name', ['manager', 'tenant_admin', 'super_admin'])
            ).data?.map(r => r.id) || []);

          if (adminRoles && adminRoles.length > 0) {
            const adminIds = adminRoles.map((m: any) => m.user_id).filter(Boolean);

            const { data: managerProfiles } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .in('id', adminIds);

            if (managerProfiles && managerProfiles.length > 0) {
              for (const m of managerProfiles) {
                recipientEmail = m.email;
                const deptLabel = departmentInfo.department ? departmentInfo.department.replace('_', ' ') : 'Department';
                const requestNumber = `VRG-${String(requestData.request_number).padStart(5, '0')}`;
                subject = `[${requestNumber}] New ${deptLabel} Request: ${requestData.title}`;
                console.log('[notify-department-request] Sending email to admin:', recipientEmail);
                emailData = {
                  requestTitle: requestData.title,
                  requestNumber: `VRG-${String(requestData.request_number).padStart(5, '0')}`,
                  requestId: requestData.id,
                  requestUrl: `https://hub.visionradiology.com.au/request/VRG-${String(requestData.request_number).padStart(5, '0')}`,
                  requesterName: requesterProfile.full_name || requesterProfile.email,
                  department: deptLabel,
                  subDepartment: departmentInfo.sub_department || '',
                  priority: requestData.priority,
                  description: requestData.description,
                  managerName: m.full_name,
                };

                const emailResult = await supabase.functions.invoke('send-notification-email', {
                  body: {
                    to: recipientEmail,
                    cc: requestData.cc_emails || [],
                    subject,
                    template: 'department_request_submitted',
                    data: emailData,
                  },
                });

                // Log to email_logs table
                const { error: emailLogError } = await supabase
                  .from('email_logs')
                  .insert({
                    request_id: requestData.id,
                    recipient_email: recipientEmail,
                    email_type: 'department_request_submitted',
                    subject: subject,
                    status: (emailResult as any).error ? 'failed' : 'sent',
                    error_message: (emailResult as any).error?.message || null,
                    metadata: {
                      request_title: requestData.title,
                      manager_name: m.full_name,
                      requester_name: requesterProfile.full_name,
                      department: deptLabel
                    }
                  });

                if (emailLogError) {
                  console.error('[notify-department-request] Failed to insert email_logs (admin):', emailLogError);
                }

                // Log to audit_logs
                const { error: auditError2 } = await supabase
                  .from('audit_logs')
                  .insert({
                    user_id: requestData.user_id,
                    user_email: recipientEmail,
                    action: 'email_sent',
                    table_name: 'hardware_requests',
                    record_id: requestData.id,
                    new_data: {
                      email_type: 'department_request_submitted',
                      subject: subject,
                      status: (emailResult as any).error ? 'failed' : 'sent',
                      recipient: recipientEmail,
                      request_title: requestData.title,
                      manager_name: m.full_name,
                      requester_name: requesterProfile.full_name
                    }
                  });
                if (auditError2) {
                  console.error('[notify-department-request] Failed to insert audit_logs (admin fallback):', auditError2);
                }

                // Create in-app notification for admin user
                if (m.id && requestData.company_id) {
                  const { error: notifError } = await supabase.from('notifications').insert({
                    user_id: m.id,
                    company_id: requestData.company_id,
                    type: 'department_request',
                    title: `New ${deptLabel} Request`,
                    message: `New request ${requestNumber}: ${requestData.title}`,
                    reference_id: requestData.id,
                    reference_url: `/request/${requestNumber}`,
                  });

                  if (notifError) {
                    console.error('[notify-department-request] Error creating in-app notification (admin):', notifError);
                  } else {
                    console.log('[notify-department-request] In-app notification created for admin:', m.id);
                  }
                }
              }
            }
          }
        }
        break;
      }

      default:
        console.log(`Action ${action} not yet implemented for department requests`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[notify-department-request] ERROR:", error);
    console.error("[notify-department-request] Stack:", error.stack);
    return new Response(
      JSON.stringify({ error: error.message, details: error.stack }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
