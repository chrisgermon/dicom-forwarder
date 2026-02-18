// Using Deno.serve instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailReminderRequest {
  reminderId: string;
  email: string;
  subject: string;
  message: string;
  reminderTitle: string;
  reminderDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { reminderId, email, subject, message, reminderTitle, reminderDate }: EmailReminderRequest = await req.json();

    console.log('Sending email reminder:', { reminderId, email });

    // Get Mailgun credentials from environment
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN');
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');

    if (!mailgunDomain || !mailgunApiKey) {
      throw new Error('Mailgun not configured');
    }

    const formData = new FormData();
    formData.append('from', `Reminders <reminders@${mailgunDomain}>`);
    formData.append('to', email);
    formData.append('subject', subject);
    formData.append('html', `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .reminder-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #4F46E5; border-radius: 4px; }
            .reminder-title { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
            .reminder-date { color: #4F46E5; font-size: 18px; font-weight: bold; margin: 10px 0; }
            .message { margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Reminder Alert</h1>
            </div>
            <div class="content">
              <div class="reminder-box">
                <div class="reminder-title">${reminderTitle}</div>
                <div class="reminder-date">📅 ${new Date(reminderDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
                <div class="message">${message}</div>
              </div>
              <p>This is an automated reminder from your reminder system.</p>
            </div>
            <div class="footer">
              <p>You're receiving this because you set up a reminder in the system.</p>
            </div>
          </div>
        </body>
      </html>
    `);

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

    const mailgunData = await mailgunResponse.json();

    if (!mailgunResponse.ok) {
      throw new Error(`Mailgun error: ${JSON.stringify(mailgunData)}`);
    }

    // Log the notification with days_before to avoid duplicate sends
    const now = new Date();
    let days_before: number | null = null;
    try {
      const rDate = new Date(reminderDate);
      days_before = Math.ceil((rDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } catch (_) { /* ignore */ }

    const { error: logError } = await supabase
      .from('reminder_notifications')
      .insert({
        reminder_id: reminderId,
        notification_type: 'email',
        status: 'sent',
        recipient: email,
        days_before,
        metadata: { mailgun_response: mailgunData },
      });

    if (logError) {
      console.error('Error logging notification:', logError);
    }

    console.log('Email sent successfully:', mailgunData);

    return new Response(
      JSON.stringify({ success: true, data: mailgunData }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in send-email-reminder:', error);

    // Log failed notification
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { reminderId, email, reminderDate } = await req.json();

      // compute days_before for failed email log
      let days_before: number | null = null;
      try {
        const rDate = new Date(reminderDate);
        const now = new Date();
        days_before = Math.ceil((rDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      } catch (_) { /* ignore */ }

      await supabase
        .from('reminder_notifications')
        .insert({
          reminder_id: reminderId,
          notification_type: 'email',
          status: 'failed',
          recipient: email,
          error_message: error.message,
          days_before,
        });
    } catch (logError) {
      console.error('Error logging failed notification:', logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

Deno.serve(handler);
