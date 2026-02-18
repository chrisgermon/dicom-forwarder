import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderRequest {
  cycleId: string;
  department?: string;
  type: 'opening' | 'day_10' | 'day_7' | 'day_3' | 'day_1' | 'past_due' | 'escalation';
}

async function getNewsletterAdmins(supabase: any) {
  const { data: roleData, error: roleError } = await supabase
    .from('rbac_roles')
    .select('id')
    .eq('name', 'newsletter_admin')
    .single();

  if (roleError || !roleData) {
    console.log('No newsletter_admin role found');
    return [];
  }

  const { data: userRoles, error: userRolesError } = await supabase
    .from('rbac_user_roles')
    .select('user_id')
    .eq('role_id', roleData.id);

  if (userRolesError || !userRoles?.length) {
    console.log('No users with newsletter_admin role');
    return [];
  }

  const userIds = userRoles.map((ur: any) => ur.user_id);

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

const getReminderSubject = (type: string, cycleName: string): string => {
  const subjects: Record<string, string> = {
    'opening': `Newsletter Cycle Open: ${cycleName}`,
    'day_10': `Reminder: Newsletter submission due in 10 days - ${cycleName}`,
    'day_7': `Reminder: Newsletter submission due in 7 days - ${cycleName}`,
    'day_3': `Reminder: Newsletter submission due in 3 days - ${cycleName}`,
    'day_1': `URGENT: Newsletter submission due tomorrow - ${cycleName}`,
    'past_due': `OVERDUE: Newsletter submission past due - ${cycleName}`,
    'escalation': `ESCALATION: Newsletter submission required - ${cycleName}`,
  };
  return subjects[type] || `Newsletter Reminder: ${cycleName}`;
};

const getReminderBody = (type: string, cycleName: string, department: string, dueDate: string, userName: string): string => {
  const formattedDate = new Date(dueDate).toLocaleDateString('en-AU', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const urgencyMessages: Record<string, string> = {
    'opening': 'A new newsletter cycle has been opened and you have been assigned to contribute.',
    'day_10': 'This is a friendly reminder that your newsletter contribution is due in 10 days.',
    'day_7': 'This is a reminder that your newsletter contribution is due in 7 days.',
    'day_3': 'Your newsletter contribution is due in 3 days. Please submit your content soon.',
    'day_1': 'URGENT: Your newsletter contribution is due tomorrow. Please submit immediately.',
    'past_due': 'Your newsletter contribution is now OVERDUE. Please submit as soon as possible.',
    'escalation': 'This is an escalation notice. Your newsletter contribution is significantly overdue and requires immediate attention.',
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0891B2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
        .footer { background-color: #1e293b; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background-color: #0891B2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        .urgent { color: #dc2626; font-weight: bold; }
        .info-box { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #0891B2; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>VRG Hub Newsletter</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p class="${type === 'past_due' || type === 'escalation' || type === 'day_1' ? 'urgent' : ''}">${urgencyMessages[type] || 'This is a newsletter reminder.'}</p>
          
          <div class="info-box">
            <p><strong>Newsletter:</strong> ${cycleName}</p>
            <p><strong>Your Department:</strong> ${department}</p>
            <p><strong>Due Date:</strong> ${formattedDate}</p>
          </div>
          
          <p>Please log in to VRG Hub to submit your newsletter contribution.</p>
          
          <a href="https://vrghub.lovableproject.com/newsletter" class="button">Submit Your Contribution</a>
        </div>
        <div class="footer">
          <p>This is an automated message from VRG Hub.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getAdminReminderSummary = (cycleName: string, dueDate: string, type: string, remindersSent: any[]): string => {
  const formattedDate = new Date(dueDate).toLocaleDateString('en-AU', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const typeLabels: Record<string, string> = {
    'opening': 'Cycle Opening',
    'day_10': '10 Days Before Due',
    'day_7': '7 Days Before Due',
    'day_3': '3 Days Before Due',
    'day_1': '1 Day Before Due (Urgent)',
    'past_due': 'Past Due',
    'escalation': 'Escalation',
  };

  let recipientsList = '';
  if (remindersSent.length > 0) {
    recipientsList = '<h3>Reminders Sent To:</h3><table style="width: 100%; border-collapse: collapse; margin-top: 10px;"><thead><tr style="background-color: #f1f5f9;"><th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Department</th><th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Email</th><th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Status</th></tr></thead><tbody>';
    for (const reminder of remindersSent) {
      const statusColor = reminder.status === 'sent' ? '#16a34a' : '#dc2626';
      recipientsList += `<tr><td style="padding: 8px; border: 1px solid #e2e8f0;">${reminder.department}</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${reminder.email}</td><td style="padding: 8px; border: 1px solid #e2e8f0; color: ${statusColor};">${reminder.status}</td></tr>`;
    }
    recipientsList += '</tbody></table>';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
        .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
        .footer { background-color: #1e293b; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
        .info-box { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #7c3aed; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Newsletter Admin Notification</h1>
          <p style="margin: 0; opacity: 0.9;">Reminder Summary</p>
        </div>
        <div class="content">
          <p>Newsletter reminders have been sent for the following cycle:</p>
          
          <div class="info-box">
            <p><strong>Newsletter:</strong> ${cycleName}</p>
            <p><strong>Due Date:</strong> ${formattedDate}</p>
            <p><strong>Reminder Type:</strong> ${typeLabels[type] || type}</p>
            <p><strong>Total Reminders Sent:</strong> ${remindersSent.length}</p>
          </div>
          
          ${recipientsList}
          
          <p style="margin-top: 20px;">You are receiving this because you are a Newsletter Admin.</p>
        </div>
        <div class="footer">
          <p>This is an automated admin notification from VRG Hub.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
  const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN');

  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    console.log('Mailgun not configured, skipping email send');
    return { success: false, error: 'Mailgun not configured' };
  }

  try {
    const formData = new FormData();
    formData.append('from', `VRG Hub <noreply@${MAILGUN_DOMAIN}>`);
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', html);

    const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mailgun error:', errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { cycleId, department, type }: ReminderRequest = await req.json();

    console.log('Sending reminders:', { cycleId, department, type });

    // Get cycle details
    const { data: cycle, error: cycleError } = await supabase
      .from('newsletter_cycles')
      .select('*')
      .eq('id', cycleId)
      .single();

    if (cycleError) throw cycleError;

    // Get departments to remind
    let departmentsToRemind: string[] = [];
    if (department) {
      departmentsToRemind = [department];
    } else {
      const { data: assignments } = await supabase
        .from('department_assignments')
        .select('department, assignee_ids');
      
      departmentsToRemind = (assignments || [])
        .filter(a => a.assignee_ids?.length > 0)
        .map(a => a.department);
    }

    // Get all users who have already submitted for this cycle
    const { data: submissions } = await supabase
      .from('newsletter_submissions')
      .select('contributor_id, department')
      .eq('cycle_id', cycleId)
      .eq('status', 'submitted');

    const submittedUserIds = new Set(submissions?.map(s => s.contributor_id) || []);

    console.log('Departments to remind:', departmentsToRemind);

    const remindersSent: Array<{department: string, email: string, status: string}> = [];

    // For each department, get assignees and send reminders
    for (const dept of departmentsToRemind) {
      const { data: assignment } = await supabase
        .from('department_assignments')
        .select('assignee_ids')
        .eq('department', dept)
        .single();

      if (!assignment?.assignee_ids?.length) {
        console.log(`No assignees for department: ${dept}`);
        continue;
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', assignment.assignee_ids);

      if (profileError) {
        console.error(`Error fetching profiles for ${dept}:`, profileError);
        continue;
      }

      console.log(`Found ${profiles?.length || 0} profiles for ${dept}`);

      for (const profile of profiles || []) {
        if (submittedUserIds.has(profile.id)) {
          console.log(`Skipping ${profile.full_name} (${profile.email}) - already submitted`);
          continue;
        }

        if (!profile.email) {
          console.log(`No email for profile: ${profile.id}`);
          continue;
        }

        const userName = profile.full_name || 'Team Member';
        const subject = getReminderSubject(type, cycle.name);
        const html = getReminderBody(type, cycle.name, dept, cycle.due_date, userName);
        
        const emailResult = await sendEmail(profile.email, subject, html);
        const emailStatus = emailResult.success ? 'sent' : 'failed';

        remindersSent.push({ department: dept, email: profile.email, status: emailStatus });

        // Log to email_logs
        await supabase.from('email_logs').insert({
          recipient_email: profile.email,
          email_type: 'newsletter_reminder',
          subject: subject,
          status: emailStatus,
          sent_at: emailStatus === 'sent' ? new Date().toISOString() : null,
          error_message: emailResult.error || null,
          metadata: {
            cycle_id: cycleId,
            cycle_name: cycle.name,
            department: dept,
            due_date: cycle.due_date,
            reminder_type: type,
          },
        });

        // Log reminder to database
        const { error: logError } = await supabase.from('newsletter_reminder_logs').insert({
          cycle_id: cycleId,
          department: dept,
          user_id: profile.id,
          channel: 'email',
          type,
          metadata: {
            cycle_name: cycle.name,
            cycle_month: cycle.month,
            due_date: cycle.due_date,
            email: profile.email,
            user_name: userName,
            email_status: emailStatus,
            error: emailResult.error || null,
          },
        });

        if (logError) {
          console.error(`Failed to log reminder for ${profile.email}:`, logError);
        } else {
          console.log(`Logged reminder for ${profile.email} in ${dept} (status: ${emailStatus})`);
        }
      }
    }

    // Notify all Newsletter Admins about the reminders sent
    if (remindersSent.length > 0) {
      const admins = await getNewsletterAdmins(supabase);
      console.log(`Notifying ${admins.length} newsletter admins about reminders`);

      for (const admin of admins) {
        if (!admin.email) continue;

        const adminSubject = `[Admin] Newsletter Reminders Sent: ${cycle.name}`;
        const adminHtml = getAdminReminderSummary(cycle.name, cycle.due_date, type, remindersSent);

        try {
          await sendEmail(admin.email, adminSubject, adminHtml);
          console.log(`Sent admin summary to: ${admin.email}`);
        } catch (adminError) {
          console.error(`Failed to send admin summary to ${admin.email}:`, adminError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminded: departmentsToRemind.length,
        details: remindersSent,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error sending reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
