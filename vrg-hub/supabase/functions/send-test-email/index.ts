// Using Deno.serve instead of deprecated import

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  recipientEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail }: TestEmailRequest = await req.json();
    
    if (!recipientEmail) {
      throw new Error("Recipient email is required");
    }

    console.log('Sending test email to:', recipientEmail);

    const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");
    const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN") || "mg.crowdhub.app";
    
    if (!mailgunApiKey) {
      throw new Error("MAILGUN_API_KEY is not configured");
    }

    console.log('Mailgun domain:', mailgunDomain);
    console.log('API key exists:', !!mailgunApiKey);

    const emailContent = {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 30px;">
            <img src="cid:email-logo.png" alt="Vision Radiology" style="max-width: 200px; height: auto;" />
          </div>
          <h2 style="color: #2563eb;">Test Email - Vision Radiology Hub</h2>
          <p>Hello,</p>
          <p>This is a test email to verify that the Vision Radiology notification system is working correctly.</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>System Test Results:</h3>
            <p><strong>✅ Mailgun Integration:</strong> Working</p>
            <p><strong>✅ Edge Function:</strong> Working</p>
            <p><strong>✅ Email Delivery:</strong> Working</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
          
          <p>If you received this email, your Vision Radiology notification system is properly configured!</p>
        </div>
      `,
      text: `Test Email - Vision Radiology Hub\n\nThis is a test email to verify that the email system is working correctly.\n\nTimestamp: ${new Date().toISOString()}`
    };
    
    const formData = new FormData();
    formData.append("from", "Vision Radiology Hub <hub@visionradiology.com.au>");
    formData.append("to", recipientEmail);
    formData.append("subject", "Test Email - Vision Radiology Hub");
    formData.append("html", emailContent.html);
    formData.append("text", emailContent.text);

    // Attach inline logo image so it displays reliably in email clients
    try {
      // Try multiple logo sources in order of preference
      const logoUrls = [
        Deno.env.get('EMAIL_LOGO_URL'),
        'https://qnavtvxemndvrutnavvm.supabase.co/storage/v1/object/public/company-assets/VR22004_Logo_Update.png',
        'https://qnavtvxemndvrutnavvm.supabase.co/storage/v1/object/public/company-assets/vision-radiology-email-logo.png',
        'https://hub.visionradiology.com.au/vision-radiology-email-logo.png',
      ].filter(Boolean);
      
      let logoRes;
      let workingUrl;
      
      for (const url of logoUrls) {
        logoRes = await fetch(url as string);
        if (logoRes.ok) {
          workingUrl = url;
          console.log('[send-test-email] Logo fetched successfully from:', workingUrl);
          break;
        }
      }
      if (logoRes && logoRes.ok) {
        const logoBuffer = await logoRes.arrayBuffer();
        const contentType = logoRes.headers.get('content-type') || 'image/png';
        const logoBlob = new Blob([logoBuffer], { type: contentType });
        formData.append('inline', logoBlob, 'email-logo.png');
      } else {
        console.warn('[send-test-email] Failed to fetch logo from all URLs');
      }
    } catch (logoError) {
      console.warn('[send-test-email] Error fetching logo:', logoError);
    }

    console.log('Sending email via Mailgun...');

    const response = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`api:${mailgunApiKey}`)}`
      },
      body: formData
    });

    console.log('Mailgun response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mailgun API error:", errorText);
      throw new Error(`Mailgun API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Test email sent successfully to ${recipientEmail}`,
      mailgunResult: result
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-test-email function:", error);
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