import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAILGUN_DOMAIN = 'visionradiology.com.au';
const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { recipientEmail, shareUrl, modalityName, clinicName } = await req.json();

    if (!recipientEmail || !shareUrl || !modalityName) {
      throw new Error('Missing required fields');
    }

    // Send email via Mailgun
    const formData = new FormData();
    formData.append('from', `Vision Radiology Hub <hub@${MAILGUN_DOMAIN}>`);
    formData.append('to', recipientEmail);
    formData.append('subject', `Modality Details: ${modalityName}`);
    formData.append('html', `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0066cc; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Modality Configuration Details</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You have been sent the configuration details for the following modality:</p>
            <p><strong>Modality:</strong> ${modalityName}</p>
            ${clinicName ? `<p><strong>Clinic:</strong> ${clinicName}</p>` : ''}
            <p>Click the button below to view the full details:</p>
            <a href="${shareUrl}" class="button">View Modality Details</a>
            <p style="color: #666; font-size: 14px;">Or copy this link: ${shareUrl}</p>
          </div>
          <div class="footer">
            <p>This email was sent from Vision Radiology Hub</p>
            <p>hub.visionradiology.com.au</p>
          </div>
        </div>
      </body>
      </html>
    `);

    const mailgunResponse = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
        },
        body: formData,
      }
    );

    if (!mailgunResponse.ok) {
      const errorText = await mailgunResponse.text();
      console.error('Mailgun error:', errorText);
      throw new Error(`Failed to send email: ${mailgunResponse.status}`);
    }

    const result = await mailgunResponse.json();
    console.log('Email sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        messageId: result.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});