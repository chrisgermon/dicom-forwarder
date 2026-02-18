import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalRequest {
  requestId: string;
  action: 'approve' | 'decline';
  managerEmail: string;
  reason?: string;
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const requestId = url.searchParams.get('requestId');
    const action = url.searchParams.get('action');
    const managerEmail = url.searchParams.get('managerEmail');
    const token = url.searchParams.get('token');

    if (!requestId || !action || !managerEmail || !token) {
      return new Response('Missing required parameters', { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token (simple hash of requestId + managerEmail + secret)
    const secret = Deno.env.get('EMAIL_APPROVAL_SECRET') || 'fallback-secret';
    const expectedToken = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${requestId}:${managerEmail}:${secret}`)
    );
    const expectedTokenHex = Array.from(new Uint8Array(expectedToken))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (token !== expectedTokenHex) {
      return new Response('Invalid token', { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // Get request details
    const { data: requestData, error: requestError } = await supabase
      .from('hardware_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (requestError || !requestData) {
      return new Response('Request not found', { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // Fetch requester profile for display purposes
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', requestData.user_id)
      .maybeSingle();
    const requesterName = requesterProfile?.name || requesterProfile?.email || 'Requester';
    
    // Get manager profile
    const { data: managerData } = await supabase
      .from('profiles')
      .select('user_id, name')
      .eq('email', managerEmail)
      .single();

    if (!managerData) {
      return new Response('Manager not found', { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // Check if already processed
    const validStatuses = ['submitted', 'pending_manager_approval', 'pending_admin_approval'];
    if (!validStatuses.includes(requestData.status)) {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Request Already Processed</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2>Request Already Processed</h2>
            <p>This request has already been processed and cannot be modified.</p>
            <p><strong>Current Status:</strong> ${requestData.status}</p>
          </body>
        </html>
      `, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (action === 'decline' && req.method === 'GET') {
      // Show decline form
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Decline Request</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2>Decline Request</h2>
            <p><strong>Request:</strong> ${requestData.title}</p>
            <p><strong>Requester:</strong> ${requesterName}</p>
            
            <form method="POST" style="margin-top: 30px;">
              <input type="hidden" name="requestId" value="${requestId}">
              <input type="hidden" name="action" value="decline">
              <input type="hidden" name="managerEmail" value="${managerEmail}">
              <input type="hidden" name="token" value="${token}">
              
              <label for="reason" style="display: block; margin-bottom: 10px; font-weight: bold;">
                Reason for decline (required):
              </label>
              <textarea 
                name="reason" 
                id="reason" 
                required 
                style="width: 100%; height: 100px; padding: 10px; border: 1px solid #ccc; border-radius: 4px;"
                placeholder="Please provide a reason for declining this request..."
              ></textarea>
              
              <div style="margin-top: 20px;">
                <button 
                  type="submit" 
                  style="background-color: #dc2626; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;"
                >
                  Decline Request
                </button>
                <a 
                  href="javascript:history.back()" 
                  style="background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;"
                >
                  Cancel
                </a>
              </div>
            </form>
          </body>
        </html>
      `, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    let updateData: any = {};
    let newStatus = '';
    let reason = '';

    // For safety, only allow state-changing actions via POST to avoid link scanners auto-approving
    if (action === 'approve' && req.method === 'GET') {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirm Approval</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2>Confirm Approval</h2>
            <p><strong>Request:</strong> ${requestData.title}</p>
            <p><strong>Requester:</strong> ${requesterName}</p>
            <p>This action will ${requestData.total_amount && requestData.total_amount > 5000 ? 'forward to admin for final approval' : 'approve the request'}.</p>
            <form method="POST" style="margin-top: 20px;">
              <input type="hidden" name="requestId" value="${requestId}">
              <input type="hidden" name="action" value="approve">
              <input type="hidden" name="managerEmail" value="${managerEmail}">
              <input type="hidden" name="token" value="${token}">
              <button 
                type="submit" 
                style="background-color: #16a34a; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;"
              >
                Confirm Approve
              </button>
              <a href="javascript:history.back()" style="background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Cancel</a>
            </form>
          </body>
        </html>
      `, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (action === 'approve') {
      if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
      // Determine next status based on current status and amount
      const requiresAdminApproval = requestData.total_amount && requestData.total_amount > 5000;
      
      if (requestData.status === 'submitted' || requestData.status === 'pending_manager_approval') {
        if (requiresAdminApproval) {
          newStatus = 'pending_admin_approval';
        } else {
          newStatus = 'approved';
        }
        updateData = {
          status: newStatus,
          manager_id: managerData.user_id,
          manager_approved_at: new Date().toISOString(),
          manager_approval_notes: 'Approved via email'
        };
      } else if (requestData.status === 'pending_admin_approval') {
        newStatus = 'approved';
        updateData = {
          status: newStatus,
          admin_id: managerData.user_id,
          admin_approved_at: new Date().toISOString(),
          admin_approval_notes: 'Approved via email'
        };
      }
    } else if (action === 'decline') {
      if (req.method === 'POST') {
        const formData = await req.formData();
        reason = formData.get('reason')?.toString() || '';
        
        if (!reason.trim()) {
          return new Response('Reason is required for decline', { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }

        newStatus = 'declined';
        updateData = {
          status: newStatus,
          declined_by: managerData.user_id,
          declined_at: new Date().toISOString(),
          decline_reason: reason
        };
      }
    }

    // Update request
    const { error: updateError } = await supabase
      .from('hardware_requests')
      .update(updateData)
      .eq('id', requestId);

    if (updateError) {
      throw new Error(`Failed to update request: ${updateError.message}`);
    }

    // Send notification to requester
    if (newStatus === 'approved') {
      await supabase.functions.invoke('notify-request-update', {
        body: {
          requestId,
          action: 'approved',
          userId: managerData.user_id
        }
      });
    } else if (newStatus === 'declined') {
      await supabase.functions.invoke('notify-request-update', {
        body: {
          requestId,
          action: 'declined',
          userId: managerData.user_id,
          notes: reason
        }
      });
    }

    // Return success page
    const actionText = action === 'approve' ? 'approved' : 'declined';
    const statusText = newStatus === 'pending_admin_approval' ? 
      'forwarded to admin for final approval' : actionText;

    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Request ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <div style="text-align: center;">
            <h2 style="color: ${action === 'approve' ? '#16a34a' : '#dc2626'};">
              Request ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}
            </h2>
            <p>The request "${requestData.title}" has been successfully ${statusText}.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>The requester has been notified via email.</p>
          </div>
        </body>
      </html>
    `, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error: any) {
    console.error("Error in approve-request-email function:", error);
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