import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalRequest {
  ticketId: string;
  requestNumber: number;
  approverId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { ticketId, requestNumber, approverId }: ApprovalRequest = await req.json();

    console.log("Sending approval request for ticket:", ticketId);

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select(`
        *,
        requester:profiles!tickets_user_id_fkey(full_name, email),
        request_type:request_types(name),
        brand:brands(name),
        location:locations(name)
      `)
      .eq("id", ticketId)
      .single();

    if (ticketError) throw ticketError;

    // Fetch approver details
    const { data: approver, error: approverError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", approverId)
      .single();

    if (approverError) throw approverError;

    // Generate approval token (simple hash for security)
    const token = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${ticketId}-${approverId}-${Date.now()}`)
    );
    const tokenHash = Array.from(new Uint8Array(token))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const approveUrl = `${supabaseUrl}/functions/v1/process-approval?ticketId=${ticketId}&action=approve&approverId=${approverId}&token=${tokenHash}`;
    const declineUrl = `${supabaseUrl}/functions/v1/process-approval?ticketId=${ticketId}&action=decline&approverId=${approverId}&token=${tokenHash}`;

    // Extract metadata for display
    const metadata = ticket.metadata as Record<string, any> || {};
    const justification = metadata.business_justification || metadata.justification || 'Not provided';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Request Awaiting Your Approval</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Request #:</strong> ${requestNumber}</p>
          <p><strong>Type:</strong> ${ticket.request_type?.name || 'N/A'}</p>
          <p><strong>Title:</strong> ${ticket.title}</p>
          <p><strong>Requested by:</strong> ${ticket.requester?.full_name || 'Unknown'}</p>
          <p><strong>Brand:</strong> ${ticket.brand?.name || 'N/A'}</p>
          <p><strong>Location:</strong> ${ticket.location?.name || 'N/A'}</p>
          <p><strong>Priority:</strong> ${ticket.priority}</p>
          <p><strong>Description:</strong> ${ticket.description || 'N/A'}</p>
          <p><strong>Business Justification:</strong> ${justification}</p>
        </div>

        <div style="margin: 30px 0;">
          <a href="${approveUrl}" 
             style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
            Approve Request
          </a>
          
          <a href="${declineUrl}" 
             style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Decline Request
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">
          You can also review this request in detail by logging into the system.
        </p>
      </div>
    `;

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Requests <onboarding@resend.dev>",
        to: [approver.email],
        subject: `Approval Required: ${ticket.request_type?.name || 'Request'} #${requestNumber}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    // Log email sent
    await supabase.from("email_logs").insert({
      email_type: "approval_request",
      recipient_email: approver.email,
      subject: `Approval Required: ${ticket.request_type?.name || 'Request'} #${requestNumber}`,
      status: "sent",
      metadata: { ticket_id: ticketId, request_number: requestNumber }
    });

    console.log("Approval email sent successfully to:", approver.email);

    return new Response(
      JSON.stringify({ success: true, message: "Approval email sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-approval-request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});