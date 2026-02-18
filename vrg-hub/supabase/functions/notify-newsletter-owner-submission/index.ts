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

interface SubmissionNotificationRequest {
  submissionId: string;
  cycleId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { submissionId, cycleId }: SubmissionNotificationRequest = await req.json();

    // Fetch cycle info
    const { data: cycle, error: cycleError } = await supabase
      .from('newsletter_cycles')
      .select('*')
      .eq('id', cycleId)
      .single();

    if (cycleError) throw cycleError;

    // Get all newsletter admins
    const admins = await getNewsletterAdmins(supabase);
    
    if (admins.length === 0) {
      console.log('No newsletter admins configured, skipping notification');
      return new Response(JSON.stringify({ success: true, message: 'No admins to notify' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch submission details
    const { data: submission, error: submissionError } = await supabase
      .from('newsletter_submissions')
      .select(`
        *,
        contributor:profiles!newsletter_submissions_contributor_id_fkey(full_name, email),
        brand:brands(name),
        location:locations(name)
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError) throw submissionError;

    // Build email
    const companyInfo = submission.brand 
      ? ` for ${submission.brand.name}${submission.location ? ` - ${submission.location.name}` : ''}`
      : '';

    const subject = `Newsletter Submission: ${submission.department}${companyInfo}`;
    
    let emailsSent = 0;
    let emailsFailed = 0;

    // Send email to each admin
    for (const admin of admins) {
      if (!admin.email) continue;

      const html = `
        <h2>New Newsletter Contribution Submitted</h2>
        <p>Hello ${admin.full_name || 'Newsletter Admin'},</p>
        <p>A new contribution has been submitted for the <strong>${cycle.name}</strong> newsletter cycle.</p>
        
        <h3>Submission Details:</h3>
        <ul>
          <li><strong>Department:</strong> ${submission.department}</li>
          ${submission.brand ? `<li><strong>Company:</strong> ${submission.brand.name}</li>` : ''}
          ${submission.location ? `<li><strong>Location:</strong> ${submission.location.name}</li>` : ''}
          <li><strong>Contributor:</strong> ${submission.contributor.full_name} (${submission.contributor.email})</li>
          <li><strong>Submitted:</strong> ${new Date(submission.submitted_at).toLocaleString()}</li>
          <li><strong>Status:</strong> ${submission.status}</li>
        </ul>
        
        <p>You can review this submission in the newsletter admin dashboard.</p>
        
        <p>Best regards,<br/>Newsletter System</p>
      `;

      try {
        await sendEmail(admin.email, subject, html);
        emailsSent++;

        // Log to email_logs for audit trail
        await supabase.from('email_logs').insert({
          recipient_email: admin.email,
          email_type: 'newsletter_admin_submission_notification',
          subject: subject,
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: {
            cycle_id: cycleId,
            cycle_name: cycle.name,
            submission_id: submissionId,
            department: submission.department,
            contributor: submission.contributor.full_name,
            admin_id: admin.id,
          },
        });

        // Log notification
        await supabase
          .from('newsletter_reminder_logs')
          .insert({
            cycle_id: cycleId,
            recipient_email: admin.email,
            reminder_type: 'admin_submission_notification',
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

        console.log(`Sent submission notification to admin: ${admin.email}`);
      } catch (emailError) {
        console.error(`Failed to send notification to ${admin.email}:`, emailError);
        emailsFailed++;
        
        // Log failure to email_logs
        await supabase.from('email_logs').insert({
          recipient_email: admin.email,
          email_type: 'newsletter_admin_submission_notification',
          subject: subject,
          status: 'failed',
          error_message: emailError instanceof Error ? emailError.message : String(emailError),
          metadata: {
            cycle_id: cycleId,
            submission_id: submissionId,
            admin_id: admin.id,
          },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, emailsSent, emailsFailed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending admin notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
