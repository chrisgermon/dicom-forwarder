// Using Deno.serve instead of deprecated import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  token: string;
  clinicName: string;
  excelBase64: string;
  fileName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, token, clinicName, excelBase64, fileName }: EmailRequest = await req.json();
    
    const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");
    const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN") || "mg.crowdhub.app";
    const appUrl = "https://hub.visionradiology.com.au";
    
    console.log('Sending clinic details email via Mailgun...');
    console.log('Recipient:', to);
    console.log('Clinic:', clinicName);
    
    if (!mailgunApiKey) {
      throw new Error("MAILGUN_API_KEY is not configured");
    }

    const shareUrl = `${appUrl}/shared/${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Clinic Network Configuration Details</h2>
        <p>Hello,</p>
        <p>Please find attached the network configuration details for <strong>${clinicName}</strong>.</p>
        
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <h3>${clinicName}</h3>
          <p>This email contains:</p>
          <ul>
            <li>Network configuration details</li>
            <li>DICOM servers information</li>
            <li>Modality configurations</li>
          </ul>
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${shareUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Online
          </a>
        </p>

        <p style="color: #6b7280; font-size: 14px;">
          The attached Excel file contains all the configuration details in a convenient spreadsheet format.
        </p>
      </div>
    `;

    const text = `Clinic Network Configuration Details\n\nHello,\n\nPlease find attached the network configuration details for ${clinicName}.\n\nYou can also view these details online at: ${shareUrl}`;
    
    const formData = new FormData();
    formData.append("from", "Vision Radiology Hub <hub@visionradiology.com.au>");
    formData.append("to", to);
    formData.append("subject", `Network Configuration - ${clinicName}`);
    formData.append("html", html);
    formData.append("text", text);
    
    // Decode base64 and attach the Excel file
    const excelBuffer = Uint8Array.from(atob(excelBase64), c => c.charCodeAt(0));
    const excelBlob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    formData.append("attachment", excelBlob, fileName);

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

    return new Response(JSON.stringify({ success: true, messageId: result.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-clinic-details-email function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

Deno.serve(handler);
