import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(to: string, subject: string, html: string) {
  const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN");
  const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");

  if (!mailgunDomain || !mailgunApiKey) {
    throw new Error("Mailgun credentials not configured");
  }

  const auth = btoa(`api:${mailgunApiKey}`);
  const body = new FormData();
  body.append("from", `Newsletter System <newsletter@${mailgunDomain}>`);
  body.append("to", to);
  body.append("subject", subject);
  body.append("html", html);

  const response = await fetch(
    `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mailgun API error: ${error}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Running newsletter owner daily reminder check...');

    // Find cycles due tomorrow that haven't had reminders sent
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const { data: cycles, error: cyclesError } = await supabase
      .from('newsletter_cycles')
      .select(`
        *,
        owner:profiles!newsletter_cycles_owner_id_fkey(id, email, full_name)
      `)
      .gte('due_date', tomorrow.toISOString().split('T')[0])
      .lt('due_date', dayAfterTomorrow.toISOString().split('T')[0])
      .eq('owner_reminder_sent', false)
      .not('owner_id', 'is', null)
      .in('status', ['active', 'in_review']);

    if (cyclesError) throw cyclesError;

    console.log(`Found ${cycles?.length || 0} cycles due tomorrow with owners`);

    let notifiedCount = 0;

    for (const cycle of cycles || []) {
      if (!cycle.owner?.email) continue;

      // Fetch all assignments for this cycle
      const { data: assignments, error: assignmentsError } = await supabase
        .from('newsletter_assignments')
        .select(`
          *,
          contributor:profiles!newsletter_assignments_contributor_id_fkey(full_name, email),
          brand:brands(name),
          location:locations(name)
        `)
        .eq('cycle_id', cycle.id);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        continue;
      }

      // Group by status
      const pending = assignments?.filter(a => a.status === 'pending') || [];
      const inProgress = assignments?.filter(a => a.status === 'in_progress') || [];
      const submitted = assignments?.filter(a => a.status === 'submitted') || [];
      const completed = assignments?.filter(a => a.status === 'completed') || [];

      const totalAssignments = assignments?.length || 0;
      const notSubmitted = pending.length + inProgress.length;

      // Build pending list
      let pendingList = '';
      if (notSubmitted > 0) {
        pendingList = '<h3>Contributors Not Yet Submitted:</h3><ul>';
        [...pending, ...inProgress].forEach(assignment => {
          const companyInfo = assignment.brand 
            ? ` - ${assignment.brand.name}${assignment.location ? ` (${assignment.location.name})` : ''}`
            : '';
          pendingList += `<li><strong>${assignment.department}</strong>${companyInfo}: ${assignment.contributor.full_name} (${assignment.contributor.email}) - <em>${assignment.status}</em></li>`;
        });
        pendingList += '</ul>';
      }

      // Build email
      const subject = `Newsletter Reminder: ${cycle.name} Due Tomorrow`;
      
      const html = `
        <h2>Newsletter Cycle Due Tomorrow</h2>
        <p>Hello ${cycle.owner.full_name},</p>
        <p>This is a reminder that the <strong>${cycle.name}</strong> newsletter cycle is due tomorrow (${new Date(cycle.due_date).toLocaleDateString()}).</p>
        
        <h3>Submission Status:</h3>
        <ul>
          <li><strong>Total Assignments:</strong> ${totalAssignments}</li>
          <li><strong>Submitted/Completed:</strong> ${submitted.length + completed.length}</li>
          <li><strong>In Progress:</strong> ${inProgress.length}</li>
          <li><strong>Not Started:</strong> ${pending.length}</li>
        </ul>
        
        ${pendingList}
        
        ${notSubmitted > 0 ? '<p><strong>Action Required:</strong> Please follow up with contributors who have not yet submitted.</p>' : '<p>All contributions have been submitted! 🎉</p>'}
        
        <p>Best regards,<br/>Newsletter System</p>
      `;

      // Send email
      try {
        await sendEmail(cycle.owner.email, subject, html);
        
        // Mark as sent
        await supabase
          .from('newsletter_cycles')
          .update({ owner_reminder_sent: true })
          .eq('id', cycle.id);

        // Log to email_logs for audit trail
        await supabase.from('email_logs').insert({
          recipient_email: cycle.owner.email,
          email_type: 'newsletter_owner_daily_reminder',
          subject: subject,
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: {
            cycle_id: cycle.id,
            cycle_name: cycle.name,
            due_date: cycle.due_date,
            pending_count: notSubmitted,
            total_assignments: totalAssignments,
          },
        });

        // Log notification
        await supabase
          .from('newsletter_reminder_logs')
          .insert({
            cycle_id: cycle.id,
            recipient_email: cycle.owner.email,
            reminder_type: 'owner_daily_reminder',
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

        notifiedCount++;
        console.log(`Sent reminder to owner: ${cycle.owner.email} for cycle: ${cycle.name}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${cycle.owner.email}:`, emailError);
        
        // Log failure to email_logs
        await supabase.from('email_logs').insert({
          recipient_email: cycle.owner.email,
          email_type: 'newsletter_owner_daily_reminder',
          subject: subject,
          status: 'failed',
          error_message: emailError instanceof Error ? emailError.message : String(emailError),
          metadata: {
            cycle_id: cycle.id,
            cycle_name: cycle.name,
          },
        });
        
        // Log failure
        await supabase
          .from('newsletter_reminder_logs')
          .insert({
            cycle_id: cycle.id,
            recipient_email: cycle.owner.email,
            reminder_type: 'owner_daily_reminder',
            status: 'failed',
            error_message: emailError instanceof Error ? emailError.message : String(emailError),
          });
      }
    }

    console.log(`Daily reminder check complete. Notified ${notifiedCount} owners.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifiedCount,
        cyclesChecked: cycles?.length || 0 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in daily reminder function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});