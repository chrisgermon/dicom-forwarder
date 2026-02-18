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

async function sendOwnerWeeklyReminder(supabase: any, cycle: any) {
  // Fetch owner details
  const { data: owner, error: ownerError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', cycle.owner_id)
    .single();

  if (ownerError || !owner?.email) {
    console.log(`No owner or email for cycle ${cycle.name}`);
    return;
  }

  // Check if we already sent this reminder today
  const today = new Date().toISOString().split('T')[0];
  const { data: existingLog } = await supabase
    .from('newsletter_reminder_logs')
    .select('id')
    .eq('cycle_id', cycle.id)
    .eq('type', 'owner_weekly_7')
    .gte('sent_at', today)
    .limit(1);

  if (existingLog && existingLog.length > 0) {
    console.log(`Already sent owner_weekly_7 reminder for cycle ${cycle.name} today`);
    return;
  }

  // Get department assignments and who hasn't submitted
  const { data: deptAssignments } = await supabase
    .from('department_assignments')
    .select('department, assignee_ids');

  const { data: submissions } = await supabase
    .from('newsletter_submissions')
    .select('department, contributor_id')
    .eq('cycle_id', cycle.id)
    .eq('status', 'submitted');

  const submittedContributors = new Set(submissions?.map((s: any) => s.contributor_id) || []);
  const submittedDepts = new Set(submissions?.map((s: any) => s.department) || []);

  // Build list of pending contributors
  const pendingContributors: Array<{department: string, name: string, email: string}> = [];
  
  for (const dept of deptAssignments || []) {
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
          name: profile.full_name || 'Unknown',
          email: profile.email || '',
        });
      }
    }
  }

  const dueDateFormatted = new Date(cycle.due_date).toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Build pending contributors table
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

  const totalAssigned = deptAssignments?.reduce((sum: number, d: any) => sum + (d.assignee_ids?.length || 0), 0) || 0;
  const totalSubmitted = submittedContributors.size;

  const emailSubject = `Newsletter Status: ${cycle.name} - 7 Days Until Due`;
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="text-align: center; padding: 20px 0;">
        <img src="https://hub.visionradiology.com.au/vision-radiology-email-logo.png" alt="Vision Radiology" style="max-width: 250px; height: auto;" />
      </div>
      
      <h2 style="color: #333;">Newsletter Owner Weekly Update</h2>
      <p>Hello ${owner.full_name},</p>
      <p>This is your weekly status update for the <strong>${cycle.name}</strong> newsletter, which is due in <strong>7 days</strong> (${dueDateFormatted}).</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1e293b;">Submission Progress</h3>
        <p style="font-size: 24px; margin: 10px 0;">
          <strong>${totalSubmitted}</strong> / <strong>${totalAssigned}</strong> submitted
        </p>
        <div style="background-color: #e5e7eb; border-radius: 999px; height: 10px; overflow: hidden;">
          <div style="background-color: ${totalSubmitted === totalAssigned ? '#22c55e' : '#3b82f6'}; height: 100%; width: ${totalAssigned > 0 ? Math.round((totalSubmitted / totalAssigned) * 100) : 0}%;"></div>
        </div>
      </div>
      
      ${pendingContributors.length > 0 ? `
        <h3 style="color: #dc2626;">⚠️ Pending Submissions (${pendingContributors.length})</h3>
        <p>The following contributors have not yet submitted their updates:</p>
        ${pendingTable}
        <p>Please follow up with these contributors to ensure timely submissions.</p>
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
      <p style="color: #666; font-size: 0.9em;">This is an automated reminder from the Newsletter System.</p>
    </div>
  `;

  try {
    await sendEmail(owner.email, emailSubject, emailBody);
    
    // Log to email_logs for audit trail
    await supabase.from('email_logs').insert({
      recipient_email: owner.email,
      email_type: 'newsletter_owner_reminder',
      subject: emailSubject,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: {
        cycle_id: cycle.id,
        cycle_name: cycle.name,
        due_date: cycle.due_date,
        pending_count: pendingContributors.length,
        total_assigned: totalAssigned,
        total_submitted: totalSubmitted,
        reminder_type: 'owner_weekly_7',
      },
    });
    
    await supabase.from('newsletter_reminder_logs').insert({
      cycle_id: cycle.id,
      department: 'owner_notification',
      user_id: owner.id,
      channel: 'email',
      type: 'owner_weekly_7',
      metadata: {
        cycle_name: cycle.name,
        due_date: cycle.due_date,
        pending_count: pendingContributors.length,
        total_assigned: totalAssigned,
        total_submitted: totalSubmitted,
        email_sent: true,
      },
    });
    
    console.log(`Sent owner weekly reminder to ${owner.email} for cycle ${cycle.name}`);
  } catch (err: any) {
    console.error(`Failed to send owner reminder to ${owner.email}:`, err);
    
    // Log failure to email_logs
    await supabase.from('email_logs').insert({
      recipient_email: owner.email,
      email_type: 'newsletter_owner_reminder',
      subject: emailSubject,
      status: 'failed',
      error_message: err.message,
      metadata: {
        cycle_id: cycle.id,
        cycle_name: cycle.name,
        reminder_type: 'owner_weekly_7',
      },
    });
    
    await supabase.from('newsletter_reminder_logs').insert({
      cycle_id: cycle.id,
      department: 'owner_notification',
      user_id: owner.id,
      channel: 'email',
      type: 'owner_weekly_7',
      metadata: {
        cycle_name: cycle.name,
        due_date: cycle.due_date,
        email_sent: false,
        error: err.message,
      },
    });
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

    console.log('Running newsletter reminder cron job');

    const now = new Date();
    
    // Get all active cycles
    const { data: cycles, error: cyclesError } = await supabase
      .from('newsletter_cycles')
      .select('*')
      .in('status', ['planning', 'active']);

    if (cyclesError) throw cyclesError;

    for (const cycle of cycles || []) {
      const dueDate = new Date(cycle.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`Cycle ${cycle.name}: ${daysUntilDue} days until due`);

      let reminderType: string | null = null;

      // Determine reminder type based on days until due
      if (daysUntilDue === 7) {
        reminderType = 'weekly_7';
        // Also send owner reminder at 7 days
        if (cycle.owner_id) {
          await sendOwnerWeeklyReminder(supabase, cycle);
        }
      } else if (daysUntilDue === 3) {
        reminderType = 'weekly_3';
      } else if (daysUntilDue === 1) {
        reminderType = 'day_before';
      } else if (daysUntilDue === 0) {
        reminderType = 'due_today';
      } else if (daysUntilDue < 0) {
        reminderType = 'overdue';
      }

      // Send reminders if needed
      if (reminderType) {
        console.log(`Sending ${reminderType} reminders for cycle ${cycle.name}`);
        
        // Get departments that haven't submitted
        const { data: assignments } = await supabase
          .from('department_assignments')
          .select('department, assignee_ids');

        const { data: submissions } = await supabase
          .from('newsletter_submissions')
          .select('department')
          .eq('cycle_id', cycle.id)
          .eq('status', 'submitted');

        const submittedDepts = submissions?.map(s => s.department) || [];
        const departmentsToRemind = (assignments || [])
          .filter(a => !submittedDepts.includes(a.department))
          .filter(a => a.assignee_ids?.length > 0);

        // For each department, get assignees and log reminders
        for (const dept of departmentsToRemind) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, email, name')
            .in('user_id', dept.assignee_ids);

          // Send email reminders to each user
          for (const profile of profiles || []) {
            console.log(`Sending ${reminderType} reminder to ${profile.email} - ${dept.department}`);
            
            const dueDateFormatted = new Date(cycle.due_date).toLocaleDateString();
            let emailSubject = '';
            let emailBody = '';
            
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
            
            if (reminderType.startsWith('weekly_')) {
              emailSubject = `Newsletter Reminder: ${cycle.name} - ${daysUntilDue} days remaining`;
              emailBody = emailHeader + `
                <h2 style="color: #333;">Newsletter Submission Reminder</h2>
                <p>Hello ${profile.name},</p>
                <p>This is a reminder that the newsletter submission for <strong>${cycle.name}</strong> is due in <strong>${daysUntilDue} days</strong> (${dueDateFormatted}).</p>
                <p>Department: <strong>${dept.department}</strong></p>
                <p>Please submit your content before the due date.</p>
                <p><a href="https://hub.visionradiology.com.au/newsletter" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Submit Your Content</a></p>
              ` + emailFooter;
            } else if (reminderType === 'day_before') {
              emailSubject = `URGENT: Newsletter Due Tomorrow - ${cycle.name}`;
              emailBody = emailHeader + `
                <h2 style="color: #DC2626;">⚠️ Newsletter Due Tomorrow</h2>
                <p>Hello ${profile.name},</p>
                <p>This is an urgent reminder that the newsletter submission for <strong>${cycle.name}</strong> is due <strong>tomorrow</strong> (${dueDateFormatted}).</p>
                <p>Department: <strong>${dept.department}</strong></p>
                <p>Please submit your content as soon as possible.</p>
                <p><a href="https://hub.visionradiology.com.au/newsletter" style="display: inline-block; padding: 12px 24px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Submit Your Content Now</a></p>
              ` + emailFooter;
            } else if (reminderType === 'due_today') {
              emailSubject = `URGENT: Newsletter Due Today - ${cycle.name}`;
              emailBody = emailHeader + `
                <h2 style="color: #DC2626;">🚨 Newsletter Due Today</h2>
                <p>Hello ${profile.name},</p>
                <p>This is an urgent reminder that the newsletter submission for <strong>${cycle.name}</strong> is due <strong>today</strong> (${dueDateFormatted}).</p>
                <p>Department: <strong>${dept.department}</strong></p>
                <p>Please submit your content immediately.</p>
                <p><a href="https://hub.visionradiology.com.au/newsletter" style="display: inline-block; padding: 12px 24px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Submit Your Content Now</a></p>
              ` + emailFooter;
            } else if (reminderType === 'overdue') {
              emailSubject = `OVERDUE: Newsletter Submission - ${cycle.name}`;
              emailBody = emailHeader + `
                <h2 style="color: #991B1B;">❌ Newsletter Submission Overdue</h2>
                <p>Hello ${profile.name},</p>
                <p>The newsletter submission for <strong>${cycle.name}</strong> was due on <strong>${dueDateFormatted}</strong> and is now overdue.</p>
                <p>Department: <strong>${dept.department}</strong></p>
                <p>Please submit your content urgently.</p>
                <p><a href="https://hub.visionradiology.com.au/newsletter" style="display: inline-block; padding: 12px 24px; background-color: #991B1B; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Submit Your Content Now</a></p>
              ` + emailFooter;
            }
            
            try {
              await sendEmail(profile.email, emailSubject, emailBody);
              
              // Log to email_logs for audit trail
              await supabase.from('email_logs').insert({
                recipient_email: profile.email,
                email_type: 'newsletter_contributor_reminder',
                subject: emailSubject,
                status: 'sent',
                sent_at: new Date().toISOString(),
                metadata: {
                  cycle_id: cycle.id,
                  cycle_name: cycle.name,
                  department: dept.department,
                  due_date: cycle.due_date,
                  days_until_due: daysUntilDue,
                  reminder_type: reminderType,
                },
              });
              
              await supabase.from('newsletter_reminder_logs').insert({
                cycle_id: cycle.id,
                department: dept.department,
                user_id: profile.user_id,
                channel: 'email',
                type: reminderType,
                metadata: {
                  cycle_name: cycle.name,
                  due_date: cycle.due_date,
                  days_until_due: daysUntilDue,
                  email_sent: true,
                },
              });
            } catch (err: any) {
              console.error(`Failed to send email to ${profile.email}:`, err);
              
              // Log failure to email_logs
              await supabase.from('email_logs').insert({
                recipient_email: profile.email,
                email_type: 'newsletter_contributor_reminder',
                subject: emailSubject,
                status: 'failed',
                error_message: err.message,
                metadata: {
                  cycle_id: cycle.id,
                  cycle_name: cycle.name,
                  department: dept.department,
                  reminder_type: reminderType,
                },
              });
              
              await supabase.from('newsletter_reminder_logs').insert({
                cycle_id: cycle.id,
                department: dept.department,
                user_id: profile.user_id,
                channel: 'email',
                type: reminderType,
                metadata: {
                  cycle_name: cycle.name,
                  due_date: cycle.due_date,
                  days_until_due: daysUntilDue,
                  email_sent: false,
                  error: err.message,
                },
              });
            }
          }
        }

      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: cycles?.length || 0,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in newsletter cron:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});