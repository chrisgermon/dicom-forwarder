import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN');
const EMAIL_LOGO_URL = Deno.env.get('EMAIL_LOGO_URL');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const testEmail = 'chris@crowdit.com.au';
    const testInviterName = 'System Administrator';
    const testCompanyName = 'Test Company';
    const testInviteUrl = 'https://app.example.com/accept-invite?token=test-token-12345';

    // Construct HTML email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're Invited!</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 40px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            max-width: 150px;
            height: auto;
          }
          .content {
            margin: 30px 0;
          }
          h1 {
            color: #2c3e50;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .invite-box {
            background-color: #f8f9fa;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 25px 0;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #3b82f6;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #2563eb;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
          .note {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${EMAIL_LOGO_URL ? `<img src="${EMAIL_LOGO_URL}" alt="Company Logo" class="logo">` : ''}
          </div>
          
          <div class="content">
            <h1>🎉 You've Been Invited!</h1>
            
            <p>Hi there!</p>
            
            <p><strong>${testInviterName}</strong> has invited you to join <strong>${testCompanyName}</strong> on our platform.</p>
            
            <div class="invite-box">
              <p style="margin: 0; font-weight: 600;">What's next?</p>
              <p style="margin: 5px 0 0 0;">Click the button below to accept your invitation and set up your account.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${testInviteUrl}" class="button">Accept Invitation</a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 12px; word-break: break-all; color: #3b82f6;">${testInviteUrl}</p>
            
            <div class="note">
              <strong>⚠️ Note:</strong> This invitation link will expire in 7 days. If you don't accept by then, you'll need to request a new invitation.
            </div>
            
            <p style="margin-top: 30px;">If you didn't expect this invitation or believe you received it by mistake, you can safely ignore this email.</p>
          </div>
          
          <div class="footer">
            <p>This is a test invitation email sent from ${testCompanyName}</p>
            <p>© ${new Date().getFullYear()} ${testCompanyName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text version
    const textContent = `
You've Been Invited!

${testInviterName} has invited you to join ${testCompanyName} on our platform.

Accept your invitation by visiting this link:
${testInviteUrl}

This invitation link will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} ${testCompanyName}. All rights reserved.
    `.trim();

    // Prepare form data for Mailgun
    const formData = new FormData();
    formData.append('from', `${testCompanyName} <noreply@${MAILGUN_DOMAIN}>`);
    formData.append('to', testEmail);
    formData.append('subject', `You're invited to join ${testCompanyName}!`);
    formData.append('html', htmlContent);
    formData.append('text', textContent);

    // Send email via Mailgun
    const mailgunResponse = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
        },
        body: formData,
      }
    );

    if (!mailgunResponse.ok) {
      const errorText = await mailgunResponse.text();
      console.error('Mailgun error:', errorText);
      throw new Error(`Failed to send email via Mailgun: ${errorText}`);
    }

    const result = await mailgunResponse.json();
    console.log('Test invitation email sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test invitation email sent successfully',
        mailgun_id: result.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in send-test-invitation function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to send test invitation email'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
