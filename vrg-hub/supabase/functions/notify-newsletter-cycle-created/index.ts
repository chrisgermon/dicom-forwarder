import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(to: string, subject: string, html: string) {
  const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN')!;
  const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY')!;
  
  const formData = new FormData();
  formData.append('from', `Newsletter System <newsletter@${mailgunDomain}>`);
  formData.append('to', to);
  formData.append('subject', subject);
  formData.append('html', html);
  
  const response = await fetch(
    `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${mailgunApiKey}`)}`,
      },
      body: formData,
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Mailgun error:', error);
    throw new Error(`Failed to send email: ${error}`);
  }
  
  return response.json();
}

async function getNewsletterAdmins(supabase: any) {
  // Get the newsletter_admin role
  const { data: roleData, error: roleError } = await supabase
    .from('rbac_roles')
    .select('id')
    .eq('name', 'newsletter_admin')
    .single();

  if (roleError || !roleData) {
    console.log('newsletter_admin role not found');
    return [];
  }

  // Get users with this role
  const { data: userRoles, error: userRolesError } = await supabase
    .from('rbac_user_roles')
    .select('user_id')
    .eq('role_id', roleData.id);

  if (userRolesError || !userRoles?.length) {
    console.log('No newsletter admins found');
    return [];
  }

  const userIds = userRoles.map((ur: any) => ur.user_id);

  // Get admin profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds);

  if (profilesError) {
    console.error('Error fetching admin profiles:', profilesError);
    return [];
  }

  return profiles || [];
}

interface CycleCreatedRequest {
  cycleId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { cycleId }: CycleCreatedRequest = await req.json();

    console.log('Notifying assignments for new cycle:', cycleId);

    // Get cycle details
    const { data: cycle, error: cycleError } = await supabase
      .from('newsletter_cycles')
      .select('*')
      .eq('id', cycleId)
      .single();

    if (cycleError) throw cycleError;

    // Get all department assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('department_assignments')
      .select('department, assignee_ids');

    if (assignmentsError) throw assignmentsError;

    const dueDate = new Date(cycle.due_date).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    let emailsSent = 0;
    let emailsFailed = 0;

    // Get all newsletter admins
    const admins = await getNewsletterAdmins(supabase);
    const adminIds = new Set(admins.map((a: any) => a.id));

    // Send admin notifications with full summary
    for (const admin of admins) {
      if (!admin.email) continue;

      // Build department assignments summary
      const departmentSummaryRows: string[] = [];
      
      for (const assignment of assignments || []) {
        if (!assignment.assignee_ids?.length) {
          departmentSummaryRows.push(`
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${assignment.department}</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #9ca3af; font-style: italic;">No assignees</td>
            </tr>
          `);
          continue;
        }
        
        // Get assignee names
        const { data: assigneeProfiles } = await supabase
          .from('profiles')
          .select('full_name, email')
          .in('id', assignment.assignee_ids);
        
        const assigneeNames = (assigneeProfiles || [])
          .map((p: any) => p.full_name || p.email)
          .join(', ');
        
        departmentSummaryRows.push(`
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${assignment.department}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #374151;">${assigneeNames}</td>
          </tr>
        `);
      }

      const adminSubject = `📰 New Newsletter Cycle Created: ${cycle.name}`;
      const adminEmailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">📰 New Newsletter Cycle</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">You are a Newsletter Admin</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 32px;">
                <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
                  Hello ${admin.full_name || 'Newsletter Admin'},
                </p>
                
                <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
                  A new newsletter cycle has been created. All contributors have been notified.
                </p>
                
                <!-- Cycle Info Box -->
                <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Cycle Name</td>
                      <td style="padding: 4px 0; color: #111827; font-weight: 600; text-align: right;">${cycle.name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Due Date</td>
                      <td style="padding: 4px 0; color: #111827; font-weight: 600; text-align: right;">${dueDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Departments</td>
                      <td style="padding: 4px 0; color: #111827; font-weight: 600; text-align: right;">${assignments?.length || 0}</td>
                    </tr>
                  </table>
                </div>
                
                <!-- Department Assignments Table -->
                <h3 style="color: #111827; font-size: 16px; margin: 0 0 16px 0;">📋 Department Assignments</h3>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                  <thead>
                    <tr style="background: #f9fafb;">
                      <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Department</th>
                      <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Assigned Contributors</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${departmentSummaryRows.length > 0 ? departmentSummaryRows.join('') : '<tr><td colspan="2" style="padding: 16px; text-align: center; color: #6b7280;">No department assignments configured</td></tr>'}
                  </tbody>
                </table>
                
                <!-- Footer Note -->
                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    📬 All assigned contributors have been notified via email.
                  </p>
                  <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0 0;">
                    ⏰ You will receive a reminder <strong>7 days before</strong> the due date showing who hasn't submitted yet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await sendEmail(admin.email, adminSubject, adminEmailBody);
        console.log(`Sent admin notification to ${admin.email}`);
        emailsSent++;

        // Log to email_logs
        await supabase.from('email_logs').insert({
          recipient_email: admin.email,
          email_type: 'newsletter_cycle_created_admin',
          subject: adminSubject,
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: {
            cycle_id: cycleId,
            cycle_name: cycle.name,
            due_date: cycle.due_date,
            department_count: assignments?.length || 0,
            admin_id: admin.id,
          },
        });

        // Log to newsletter_reminder_logs
        await supabase.from('newsletter_reminder_logs').insert({
          cycle_id: cycleId,
          department: 'admin_notification',
          user_id: admin.id,
          channel: 'email',
          type: 'cycle_created_admin',
          metadata: {
            cycle_name: cycle.name,
            due_date: cycle.due_date,
            department_count: assignments?.length || 0,
          },
        });
      } catch (err: any) {
        console.error(`Failed to send admin email to ${admin.email}:`, err);
        emailsFailed++;

        await supabase.from('email_logs').insert({
          recipient_email: admin.email,
          email_type: 'newsletter_cycle_created_admin',
          subject: adminSubject,
          status: 'failed',
          error_message: err.message,
          metadata: {
            cycle_id: cycleId,
            cycle_name: cycle.name,
            admin_id: admin.id,
          },
        });
      }
    }

    // Notify all assigned contributors
    for (const assignment of assignments || []) {
      if (!assignment.assignee_ids?.length) continue;

      // Get user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', assignment.assignee_ids);

      for (const profile of profiles || []) {
        // Skip if this is an admin - they got a different email
        if (adminIds.has(profile.id)) continue;

        const emailSubject = `📝 Newsletter Assignment: ${cycle.name}`;
        const emailBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">📝 Newsletter Assignment</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 32px;">
                  <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
                    Hello ${profile.full_name || 'Contributor'},
                  </p>
                  
                  <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
                    A new newsletter cycle has been created and you've been assigned to contribute content.
                  </p>
                  
                  <!-- Assignment Info Box -->
                  <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Newsletter</td>
                        <td style="padding: 4px 0; color: #111827; font-weight: 600; text-align: right;">${cycle.name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Department</td>
                        <td style="padding: 4px 0; color: #111827; font-weight: 600; text-align: right;">${assignment.department}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Due Date</td>
                        <td style="padding: 4px 0; color: #111827; font-weight: 600; text-align: right;">${dueDate}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">
                    Please prepare and submit your content before the due date.
                  </p>
                  
                  <p style="color: #6b7280; font-size: 13px; margin: 0; font-style: italic;">
                    You will receive reminders as the due date approaches.
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        try {
          await sendEmail(profile.email, emailSubject, emailBody);
          console.log(`Sent notification to ${profile.email} for ${assignment.department}`);
          emailsSent++;

          // Log to email_logs for audit trail
          await supabase.from('email_logs').insert({
            recipient_email: profile.email,
            email_type: 'newsletter_cycle_created',
            subject: emailSubject,
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: {
              cycle_id: cycleId,
              cycle_name: cycle.name,
              department: assignment.department,
              due_date: cycle.due_date,
            },
          });

          // Log notification
          await supabase.from('newsletter_reminder_logs').insert({
            cycle_id: cycleId,
            department: assignment.department,
            user_id: profile.id,
            channel: 'email',
            type: 'cycle_created',
            metadata: {
              cycle_name: cycle.name,
              due_date: cycle.due_date,
              email_sent: true,
            },
          });
        } catch (err: any) {
          console.error(`Failed to send email to ${profile.email}:`, err);
          emailsFailed++;
          
          // Log failure to email_logs
          await supabase.from('email_logs').insert({
            recipient_email: profile.email,
            email_type: 'newsletter_cycle_created',
            subject: emailSubject,
            status: 'failed',
            error_message: err.message,
            metadata: {
              cycle_id: cycleId,
              cycle_name: cycle.name,
              department: assignment.department,
            },
          });
          
          await supabase.from('newsletter_reminder_logs').insert({
            cycle_id: cycleId,
            department: assignment.department,
            user_id: profile.id,
            channel: 'email',
            type: 'cycle_created',
            metadata: {
              cycle_name: cycle.name,
              due_date: cycle.due_date,
              email_sent: false,
              error: err.message,
            },
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        emailsSent,
        emailsFailed,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error notifying cycle creation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
