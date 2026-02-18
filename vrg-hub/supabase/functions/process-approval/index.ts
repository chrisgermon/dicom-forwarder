import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ticketId = url.searchParams.get("ticketId");
    const action = url.searchParams.get("action");
    const approverId = url.searchParams.get("approverId");
    const token = url.searchParams.get("token");

    if (!ticketId || !action || !approverId || !token) {
      return new Response("Missing required parameters", { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch ticket to verify
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select(`
        *,
        requester:profiles!tickets_user_id_fkey(full_name, email),
        approver:profiles!tickets_approver_id_fkey(full_name, email)
      `)
      .eq("id", ticketId)
      .single();

    if (ticketError) throw ticketError;

    // Verify token (simplified - in production use proper token storage/validation)
    if (ticket.approver_id !== approverId) {
      return new Response("Invalid approver", { status: 403 });
    }

    // Check if already processed
    if (ticket.approval_status !== 'pending') {
      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h2>Request Already Processed</h2>
            <p>This request has already been ${ticket.approval_status}.</p>
          </body>
        </html>
      `;
      return new Response(html, {
        headers: { "Content-Type": "text/html" }
      });
    }

    if (req.method === "GET") {
      // Show confirmation form
      const metadata = ticket.metadata as Record<string, any> || {};
      const justification = metadata.business_justification || metadata.justification || 'Not provided';

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
              .ticket-details { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .actions { margin: 30px 0; }
              button { padding: 12px 24px; margin: 0 10px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; }
              .approve { background: #22c55e; color: white; }
              .decline { background: #ef4444; color: white; }
              textarea { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h2>${action === 'approve' ? 'Approve' : 'Decline'} Request</h2>
            
            <div class="ticket-details">
              <p><strong>Request #:</strong> ${ticket.request_number}</p>
              <p><strong>Title:</strong> ${ticket.title}</p>
              <p><strong>Requested by:</strong> ${ticket.requester?.full_name}</p>
              <p><strong>Priority:</strong> ${ticket.priority}</p>
              <p><strong>Description:</strong> ${ticket.description || 'N/A'}</p>
              <p><strong>Business Justification:</strong> ${justification}</p>
            </div>

            <form method="POST">
              <input type="hidden" name="ticketId" value="${ticketId}" />
              <input type="hidden" name="action" value="${action}" />
              <input type="hidden" name="approverId" value="${approverId}" />
              <input type="hidden" name="token" value="${token}" />
              
              ${action === 'decline' ? `
                <label for="reason"><strong>Decline Reason:</strong></label>
                <textarea name="reason" id="reason" rows="4" required placeholder="Please provide a reason for declining..."></textarea>
              ` : `
                <label for="notes"><strong>Approval Notes (optional):</strong></label>
                <textarea name="notes" id="notes" rows="4" placeholder="Add any notes..."></textarea>
              `}
              
              <div class="actions">
                <button type="submit" class="${action === 'approve' ? 'approve' : 'decline'}">
                  Confirm ${action === 'approve' ? 'Approval' : 'Decline'}
                </button>
              </div>
            </form>
          </body>
        </html>
      `;

      return new Response(html, {
        headers: { "Content-Type": "text/html" }
      });
    }

    if (req.method === "POST") {
      // Process the approval/decline
      const formData = await req.formData();
      const notes = formData.get("notes")?.toString() || null;
      const reason = formData.get("reason")?.toString() || null;

      const updates: any = {
        approval_status: action === 'approve' ? 'approved' : 'declined',
        approved_at: new Date().toISOString(),
        status: action === 'approve' ? 'approved' : 'declined'
      };

      if (action === 'approve') {
        updates.approval_notes = notes;
      } else {
        updates.declined_reason = reason;
      }

      const { error: updateError } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", ticketId);

      if (updateError) throw updateError;

      // Notify requester
      await supabase.functions.invoke('notify-request-update', {
        body: {
          ticketId,
          eventType: action === 'approve' ? 'approved' : 'declined',
          message: action === 'approve' 
            ? `Your request has been approved${notes ? ': ' + notes : ''}`
            : `Your request has been declined: ${reason}`
        }
      });

      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h2>✓ Request ${action === 'approve' ? 'Approved' : 'Declined'}</h2>
            <p>The requester has been notified of your decision.</p>
            <p style="color: #666; margin-top: 30px;">You can close this window.</p>
          </body>
        </html>
      `;

      return new Response(html, {
        headers: { "Content-Type": "text/html" }
      });
    }

    return new Response("Method not allowed", { status: 405 });

  } catch (error: any) {
    console.error("Error in process-approval:", error);
    return new Response(
      `<html><body><h2>Error</h2><p>${error.message}</p></body></html>`,
      { 
        status: 500,
        headers: { "Content-Type": "text/html" } 
      }
    );
  }
});