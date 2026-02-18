import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  inviteId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviteId }: InviteEmailRequest = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get invite details
    const { data: inviteData, error: inviteError } = await supabase
      .from('user_invites')
      .select(`
        *,
        brands (
          name
        )
      `)
      .eq('id', inviteId)
      .single();

    if (inviteError || !inviteData) {
      throw new Error(`Failed to fetch invite: ${inviteError?.message}`);
    }

    // Get inviter profile separately
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', inviteData.invited_by)
      .single();

    const inviterData = inviterProfile || { full_name: 'Admin', email: null };

    const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");
    const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN") || "mg.crowdhub.app";
    
    if (!mailgunApiKey) {
      throw new Error("MAILGUN_API_KEY is not configured");
    }

    const appUrl = 'https://hub.visionradiology.com.au';
    const signupUrl = `${appUrl}/auth`;
    const systemName = "VRG Hub"; // Always use VRG Hub instead of brand name
    
    const subject = `You're invited to join ${systemName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 30px;">
          <img src="cid:email-logo.png" alt="Vision Radiology" style="max-width: 200px; height: auto;" />
        </div>
        <h2 style="color: #2563eb;">You're Invited! 🎉</h2>
        <p>Hello,</p>
        <p>${inviterData.full_name || 'Someone'} has invited you to join <strong>${systemName}</strong>.</p>
        
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <p><strong>Your Role:</strong> ${inviteData.role.replace(/_/g, ' ')}</p>
          <p><strong>Invite Expires:</strong> ${new Date(inviteData.expires_at).toLocaleDateString('en-AU', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>

        <p>To accept this invitation and set up your account, click the button below:</p>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${signupUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Accept Invitation & Sign Up</a>
        </p>

        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>Important:</strong> You must sign up using this email address (<strong>${inviteData.email}</strong>) to accept this invitation.</p>
        </div>

        <p style="font-size: 14px; color: #64748b;">If you didn't expect this invitation, you can safely ignore this email. The invitation will expire automatically.</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          This invitation was sent by ${inviterData.full_name || 'a team member'}
        </p>
      </div>
    `;

    const text = `
You're Invited to Join ${inviteData.brands.name} on Vision Radiology Hub

    Hello,

${inviterData.full_name || 'Someone'} has invited you to join ${systemName}.

Your Role: ${inviteData.role.replace(/_/g, ' ')}
Invite Expires: ${new Date(inviteData.expires_at).toLocaleDateString('en-AU')}

To accept this invitation and set up your account, visit: ${signupUrl}

Important: You must sign up using this email address (${inviteData.email}) to accept this invitation.

If you didn't expect this invitation, you can safely ignore this email.
    `;

    const formData = new FormData();
    formData.append("from", "Vision Radiology Hub <hub@visionradiology.com.au>");
    formData.append("to", inviteData.email);
    formData.append("subject", subject);
    formData.append("html", html);
    formData.append("text", text);

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
          console.log('[send-user-invite-email] Logo fetched successfully from:', workingUrl);
          break;
        }
      }
      if (logoRes && logoRes.ok) {
        const logoBuffer = await logoRes.arrayBuffer();
        const contentType = logoRes.headers.get('content-type') || 'image/png';
        const logoBlob = new Blob([logoBuffer], { type: contentType });
        formData.append('inline', logoBlob, 'email-logo.png');
      } else {
        console.warn('[send-user-invite-email] Failed to fetch logo from all URLs');
      }
    } catch (e) {
      console.warn('[send-user-invite-email] Error attaching inline logo:', e);
    }

    console.log('Sending invite email via Mailgun to:', inviteData.email);
    
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
    console.log("Invite email sent successfully:", result);

    // Log the email
    await supabase
      .from('email_logs')
      .insert({
        recipient_email: inviteData.email,
        email_type: 'user_invite',
        subject: subject,
        status: 'sent',
        metadata: {
          invite_id: inviteData.id,
          brand_name: inviteData.brands.name,
          role: inviteData.role,
          inviter_name: inviterData.full_name,
        }
      });

    // Log to audit_logs
    await supabase
      .from('audit_logs')
      .insert({
        user_id: inviteData.invited_by,
        user_email: inviteData.email,
        action: 'email_sent',
        table_name: 'email_logs',
        record_id: inviteData.id,
        new_data: {
          email_type: 'user_invite',
          subject: subject,
          status: 'sent',
          recipient: inviteData.email
        }
      });

    return new Response(JSON.stringify({ success: true, messageId: result.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-user-invite-email function:", error);
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
