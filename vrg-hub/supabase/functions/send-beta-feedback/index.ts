// Using Deno.serve instead of deprecated import

const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  feedback_id: string;
  user_email: string;
  user_name: string;
  feedback_type: string;
  subject: string;
  message: string;
  page_url: string;
  browser_info: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      feedback_id,
      user_email,
      user_name,
      feedback_type,
      subject,
      message,
      page_url,
      browser_info,
    }: FeedbackRequest = await req.json();

    console.log("Processing beta feedback submission:", { feedback_id, user_email, feedback_type });

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      throw new Error("Mailgun configuration missing");
    }

    // Format feedback type for display
    const typeLabel = feedback_type === "bug" 
      ? "🐛 Bug Report" 
      : feedback_type === "feature_request" 
      ? "💡 Feature Request" 
      : "💬 General Feedback";

    // Create email body
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #4b5563; }
          .value { margin-top: 5px; padding: 10px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; }
          .message-box { background: white; padding: 15px; border-radius: 4px; border: 1px solid #e5e7eb; white-space: pre-wrap; }
          .footer { margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">CrowdHub Beta Feedback</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">${typeLabel}</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Subject:</div>
              <div class="value">${subject}</div>
            </div>
            
            <div class="field">
              <div class="label">Submitted by:</div>
              <div class="value">${user_name} (${user_email})</div>
            </div>
            
            <div class="field">
              <div class="label">Message:</div>
              <div class="message-box">${message}</div>
            </div>
            
            <div class="field">
              <div class="label">Page URL:</div>
              <div class="value"><a href="${page_url}">${page_url}</a></div>
            </div>
            
            <div class="field">
              <div class="label">Browser Info:</div>
              <div class="value" style="font-size: 11px;">${browser_info}</div>
            </div>
            
            <div class="field">
              <div class="label">Feedback ID:</div>
              <div class="value" style="font-family: monospace; font-size: 11px;">${feedback_id}</div>
            </div>
          </div>
          <div class="footer">
            This feedback was submitted via the CrowdHub Beta Feedback form.
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Mailgun
    const formData = new FormData();
    formData.append("from", `CrowdHub Beta <noreply@${MAILGUN_DOMAIN}>`);
    formData.append("to", "chris@crowdit.com.au");
    formData.append("subject", `[CrowdHub ${typeLabel}] ${subject}`);
    formData.append("html", emailHtml);

    const response = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mailgun error:", errorText);
      throw new Error(`Mailgun API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Feedback email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, message: "Feedback submitted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-beta-feedback function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
