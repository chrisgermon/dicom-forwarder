import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendEmailRequest {
  emailLogId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { emailLogId }: ResendEmailRequest = await req.json();

    console.log('Resending email for log ID:', emailLogId);

    // Fetch the email log
    const { data: emailLog, error: logError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('id', emailLogId)
      .single();

    if (logError || !emailLog) {
      throw new Error('Email log not found');
    }

    // Fetch Mailgun credentials
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN');

    if (!mailgunApiKey || !mailgunDomain) {
      throw new Error('Mailgun credentials not configured');
    }

    // Prepare email data from the original log
    const formData = new FormData();
    formData.append('from', `Vision Radiology Hub <notifications@${mailgunDomain}>`);
    formData.append('to', emailLog.recipient_email);
    formData.append('subject', emailLog.subject);
    
    // Extract HTML from metadata if available
    const htmlContent = emailLog.metadata?.html || `
      <h2>${emailLog.subject}</h2>
      <p>This is a resent notification from Vision Radiology Hub.</p>
    `;
    formData.append('html', htmlContent);

    // Send via Mailgun
    const mailgunResponse = await fetch(
      `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`api:${mailgunApiKey}`)}`,
        },
        body: formData,
      }
    );

    if (!mailgunResponse.ok) {
      const errorText = await mailgunResponse.text();
      console.error('Mailgun error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const mailgunResult = await mailgunResponse.json();
    console.log('Email sent successfully:', mailgunResult);

    // Log the resend
    const { error: insertError } = await supabase
      .from('email_logs')
      .insert({
        request_id: emailLog.request_id,
        marketing_request_id: emailLog.marketing_request_id,
        user_account_request_id: emailLog.user_account_request_id,
        request_type: emailLog.request_type,
        email_type: `${emailLog.email_type}_resent`,
        recipient_email: emailLog.recipient_email,
        subject: `[RESENT] ${emailLog.subject}`,
        status: 'sent',
        metadata: {
          ...emailLog.metadata,
          original_log_id: emailLogId,
          mailgun_id: mailgunResult.id,
        },
      });

    if (insertError) {
      console.error('Failed to log resent email:', insertError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email resent successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in resend-notification-email:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
