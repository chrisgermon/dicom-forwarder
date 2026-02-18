// Using Deno.serve instead of deprecated import

const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  displayName: string;
  inviterName: string;
  loginUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, displayName, inviterName, loginUrl }: InviteEmailRequest = await req.json();
    const companyName = "VRG Hub"; // Always use VRG Hub instead of brand name

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      console.error("Mailgun not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You've Been Invited to ${companyName}</h1>
          </div>
          <div class="content">
            <p>Hi ${displayName},</p>
            
            <p>${inviterName} has invited you to join the ${companyName} portal. Your organization uses this platform to manage requests, access resources, and collaborate with your team.</p>
            
            <p><strong>Getting Started:</strong></p>
            <ol>
              <li>Click the button below to access the portal</li>
              <li>Sign in with your Microsoft 365 account (${email})</li>
              <li>You'll be automatically set up and ready to go!</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Access ${companyName} Portal</a>
            </div>
            
            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${loginUrl}">${loginUrl}</a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email from ${companyName}. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const formData = new FormData();
    formData.append("from", `${companyName} <noreply@${MAILGUN_DOMAIN}>`);
    formData.append("to", email);
    formData.append("subject", `Welcome to ${companyName}`);
    formData.append("html", emailHtml);

    const res = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
      },
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Invite email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-office365-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
