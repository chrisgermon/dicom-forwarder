import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManualReminderRequest {
  cycleId: string;
  sendOwnerSummary?: boolean;
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { cycleId, sendOwnerSummary = true }: ManualReminderRequest = await req.json();

    if (!cycleId) {
      return new Response(JSON.stringify({ error: 'cycleId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Manual reminder triggered for cycle: ${cycleId}`);

    // Fetch the cycle
    const { data: cycle, error: cycleError } = await supabase
      .from('newsletter_cycles')
      .select('*')
      .eq('id', cycleId)
      .single();

    if (cycleError || !cycle) {
      return new Response(JSON.stringify({ error: 'Cycle not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dueDate = new Date(cycle.due_date);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dueDateFormatted = dueDate.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Get department assignments
    const { data: assignments } = await supabase
      .from('department_assignments')
      .select('department, assignee_ids');

    // Get existing submissions for this cycle
    const { data: submissions } = await supabase
      .from('newsletter_submissions')
      .select('department, contributor_id')
      .eq('cycle_id', cycleId)
      .eq('status', 'submitted');

    const submittedContributors = new Set(submissions?.map((s: any) => s.contributor_id) || []);
    const submittedDepts = new Set(submissions?.map((s: any) => s.department) || []);

    // Build list of pending contributors
    const pendingContributors: Array<{
      department: string;
      userId: string;
      name: string;
      email: string;
    }> = [];

    for (const dept of assignments || []) {
      if (!dept.assignee_ids?.length) continue;

      // Get profiles of assignees who haven't submitted
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', dept.assignee_ids);

      for (const profile of profiles || []) {
        if (!submittedContributors.has(profile.id)) {
          pendingContributors.push({
            department: dept.department,
            userId: profile.id,
            name: profile.full_name || 'Unknown',
            email: profile.email || '',
          });
        }
      }
    }

    const results = {
      contributorReminders: [] as Array<{ email: string; status: string; error?: string }>,
      ownerSummary: null as { email: string; status: string; error?: string } | null,
      pendingCount: pendingContributors.length,
      totalAssigned: assignments?.reduce((sum: number, d: any) => sum + (d.assignee_ids?.length || 0), 0) || 0,
      totalSubmitted: submittedContributors.size,
    };

    // Send reminders to all pending contributors
    const emailHeader = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px 0;">
          <img src="https://hub.visionradiology.com.au/vision-radiology-email-logo.png" alt="Vision Radiology" style="max-width: 250px; height: auto;" />
        </div>
    `;
    const emailFooter = `
        <br>
        <p style="color: #666; font-size: 0.9em;">This is an automated reminder from the Newsletter System.</p>
      </div>
    `;

    for (const contributor of pendingContributors) {
      if (!contributor.email) {
        results.contributorReminders.push({ email: 'no-email', status: 'skipped', error: 'No email address' });
        continue;
      }

      let emailSubject = '';
      let emailBody = '';
      
      if (daysUntilDue < 0) {
        emailSubject = `OVERDUE: Newsletter Submission - ${cycle.name}`;
        emailBody = emailHeader + `
          <h2 style="color: #991B1B;">❌ Newsletter Submission Overdue</h2>
          <p>Hello ${contributor.name},</p>
          <p>The newsletter submission for <strong>${cycle.name}</strong> was due on <strong>${dueDateFormatted}</strong> and is now overdue.</p>
          <p>Department: <strong>${contributor.department}</strong></p>
          <p>Please submit your content urgently.</p>
          <p><a href="https://hub.visionradiology.com.au/newsletter" style="display: inline-block; padding: 12px 24px; background-color: #991B1B; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Submit Your Content Now</a></p>
        ` + emailFooter;
      } else if (daysUntilDue === 0) {
        emailSubject = `URGENT: Newsletter Due Today - ${cycle.name}`;
        emailBody = emailHeader + `
          <h2 style="color: #DC2626;">🚨 Newsletter Due Today</h2>
          <p>Hello ${contributor.name},</p>
          <p>This is an urgent reminder that the newsletter submission for <strong>${cycle.name}</strong> is due <strong>today</strong> (${dueDateFormatted}).</p>
          <p>Department: <strong>${contributor.department}</strong></p>
          <p>Please submit your content immediately.</p>
          <p><a href="https://hub.visionradiology.com.au/newsletter" style="display: inline-block; padding: 12px 24px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Submit Your Content Now</a></p>
        ` + emailFooter;
      } else if (daysUntilDue <= 3) {
        emailSubject = `URGENT: Newsletter Due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''} - ${cycle.name}`;
        emailBody = emailHeader + `
          <h2 style="color: #DC2626;">⚠️ Newsletter Due Soon</h2>
          <p>Hello ${contributor.name},</p>
          <p>This is an urgent reminder that the newsletter submission for <strong>${cycle.name}</strong> is due in <strong>${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}</strong> (${dueDateFormatted}).</p>
          <p>Department: <strong>${contributor.department}</strong></p>
          <p>Please submit your content as soon as possible.</p>
          <p><a href="https://hub.visionradiology.com.au/newsletter" style="display: inline-block; padding: 12px 24px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Submit Your Content Now</a></p>
        ` + emailFooter;
      } else {
        emailSubject = `Newsletter Reminder: ${cycle.name} - ${daysUntilDue} days remaining`;
        emailBody = emailHeader + `
          <h2 style="color: #333;">Newsletter Submission Reminder</h2>
          <p>Hello ${contributor.name},</p>
          <p>This is a reminder that the newsletter submission for <strong>${cycle.name}</strong> is due in <strong>${daysUntilDue} days</strong> (${dueDateFormatted}).</p>
          <p>Department: <strong>${contributor.department}</strong></p>
          <p>Please submit your content before the due date.</p>
          <p><a href="https://hub.visionradiology.com.au/newsletter" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Submit Your Content</a></p>
        ` + emailFooter;
      }

      try {
        await sendEmail(contributor.email, emailSubject, emailBody);
        
        // Log to email_logs
        await supabase.from('email_logs').insert({
          recipient_email: contributor.email,
          email_type: 'newsletter_manual_reminder',
          subject: emailSubject,
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: {
            cycle_id: cycleId,
            cycle_name: cycle.name,
            department: contributor.department,
            due_date: cycle.due_date,
            days_until_due: daysUntilDue,
            reminder_type: 'manual',
          },
        });

        // Log to newsletter_reminder_logs
        await supabase.from('newsletter_reminder_logs').insert({
          cycle_id: cycleId,
          department: contributor.department,
          user_id: contributor.userId,
          channel: 'email',
          type: 'manual',
          recipient_email: contributor.email,
          metadata: {
            cycle_name: cycle.name,
            due_date: cycle.due_date,
            days_until_due: daysUntilDue,
            email_sent: true,
          },
        });

        results.contributorReminders.push({ email: contributor.email, status: 'sent' });
        console.log(`Sent manual reminder to ${contributor.email}`);
      } catch (err: any) {
        console.error(`Failed to send email to ${contributor.email}:`, err);
        
        await supabase.from('email_logs').insert({
          recipient_email: contributor.email,
          email_type: 'newsletter_manual_reminder',
          subject: emailSubject,
          status: 'failed',
          error_message: err.message,
          metadata: {
            cycle_id: cycleId,
            cycle_name: cycle.name,
            department: contributor.department,
            reminder_type: 'manual',
          },
        });

        results.contributorReminders.push({ email: contributor.email, status: 'failed', error: err.message });
      }
    }

    // Send owner summary if requested
    if (sendOwnerSummary && cycle.owner_id) {
      const { data: owner } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', cycle.owner_id)
        .single();

      if (owner?.email) {
        // Build pending contributors table for owner
        let pendingTable = '';
        if (pendingContributors.length > 0) {
          pendingTable = `
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Department</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Contributor</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Email</th>
                </tr>
              </thead>
              <tbody>
                ${pendingContributors.map(c => `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${c.department}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${c.name}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${c.email}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }

        const ownerEmailSubject = `Newsletter Status Update: ${cycle.name} - Manual Reminder Sent`;
        const ownerEmailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
            <div style="text-align: center; padding: 20px 0;">
              <img src="https://hub.visionradiology.com.au/vision-radiology-email-logo.png" alt="Vision Radiology" style="max-width: 250px; height: auto;" />
            </div>
            
            <h2 style="color: #333;">Newsletter Manual Reminder Report</h2>
            <p>Hello ${owner.full_name},</p>
            <p>A manual reminder has just been sent to all pending contributors for <strong>${cycle.name}</strong>.</p>
            <p>Due date: <strong>${dueDateFormatted}</strong> (${daysUntilDue < 0 ? 'OVERDUE' : daysUntilDue + ' days remaining'})</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e293b;">Submission Progress</h3>
              <p style="font-size: 24px; margin: 10px 0;">
                <strong>${results.totalSubmitted}</strong> / <strong>${results.totalAssigned}</strong> submitted
              </p>
              <div style="background-color: #e5e7eb; border-radius: 999px; height: 10px; overflow: hidden;">
                <div style="background-color: ${results.totalSubmitted === results.totalAssigned ? '#22c55e' : '#3b82f6'}; height: 100%; width: ${results.totalAssigned > 0 ? Math.round((results.totalSubmitted / results.totalAssigned) * 100) : 0}%;"></div>
              </div>
            </div>
            
            ${pendingContributors.length > 0 ? `
              <h3 style="color: #dc2626;">⚠️ Pending Submissions (${pendingContributors.length})</h3>
              <p>The following contributors have been sent reminders:</p>
              ${pendingTable}
            ` : `
              <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; text-align: center;">
                <h3 style="color: #16a34a; margin: 0;">🎉 All Submissions Received!</h3>
                <p style="margin: 10px 0 0 0;">Great work! All contributors have submitted their updates.</p>
              </div>
            `}
            
            <p style="margin-top: 30px;">
              <a href="https://hub.visionradiology.com.au/newsletter" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View Newsletter Dashboard</a>
            </p>
            
            <br>
            <p style="color: #666; font-size: 0.9em;">This is an automated notification from the Newsletter System.</p>
          </div>
        `;

        try {
          await sendEmail(owner.email, ownerEmailSubject, ownerEmailBody);
          
          await supabase.from('email_logs').insert({
            recipient_email: owner.email,
            email_type: 'newsletter_owner_summary',
            subject: ownerEmailSubject,
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: {
              cycle_id: cycleId,
              cycle_name: cycle.name,
              pending_count: pendingContributors.length,
              total_assigned: results.totalAssigned,
              total_submitted: results.totalSubmitted,
              reminder_type: 'manual_summary',
            },
          });

          await supabase.from('newsletter_reminder_logs').insert({
            cycle_id: cycleId,
            department: 'owner_notification',
            user_id: owner.id,
            channel: 'email',
            type: 'manual_owner_summary',
            recipient_email: owner.email,
            metadata: {
              cycle_name: cycle.name,
              pending_count: pendingContributors.length,
              total_assigned: results.totalAssigned,
              total_submitted: results.totalSubmitted,
              email_sent: true,
            },
          });

          results.ownerSummary = { email: owner.email, status: 'sent' };
          console.log(`Sent owner summary to ${owner.email}`);
        } catch (err: any) {
          console.error(`Failed to send owner summary to ${owner.email}:`, err);
          results.ownerSummary = { email: owner.email, status: 'failed', error: err.message };
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Sent reminders to ${results.contributorReminders.filter(r => r.status === 'sent').length} contributors`,
      results 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in send-newsletter-reminders-manual:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
