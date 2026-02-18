import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN') || 'mg.crowdhub.app';
    
    if (!mailgunApiKey) {
      throw new Error('MAILGUN_API_KEY is not configured');
    }

    const recipientEmail = 'chris@crowdit.com.au';
    const results = [];

    // 1. TONER REQUEST SAMPLE EMAIL
    const tonerSubject = 'SAMPLE: New Toner Request';
    const tonerHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #92400e; font-weight: bold;">⚠️ THIS IS A SAMPLE EMAIL FOR TESTING PURPOSES</p>
        </div>

        <h2 style="color: #2563eb;">New Toner Request Received</h2>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Request Details:</h3>
          <p><strong>Title:</strong> HP LaserJet Toner Cartridges</p>
          <p><strong>Description:</strong> Need replacement toner cartridges for office printer</p>
          <p><strong>Site/Location:</strong> Melbourne Office - Level 3</p>
          <p><strong>Quantity:</strong> 4 cartridges</p>
          <p><strong>Printer Model:</strong> HP LaserJet Pro M404dn</p>
          <p><strong>Colors Required:</strong> Black, Cyan, Magenta, Yellow</p>
          <p><strong>Urgency:</strong> High</p>
        </div>

        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4>AI-Predicted Toner Models:</h4>
          <ul style="line-height: 1.8;">
            <li>HP 58A (CF258A) - Black Standard Yield</li>
            <li>HP 58X (CF258X) - Black High Yield</li>
            <li>Compatible cartridge: CE278A</li>
          </ul>
        </div>

        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p><strong>Requested by:</strong></p>
          <p>Name: Sarah Johnson</p>
          <p>Email: sarah.johnson@example.com</p>
          <p>Company: Example Company</p>
        </div>

        <p style="font-size: 12px; color: #64748b; margin-top: 30px;">
          Request ID: sample-toner-123<br>
          Date: ${new Date().toLocaleString('en-AU')}
        </p>
      </div>
    `;

    const tonerFormData = new FormData();
    tonerFormData.append('from', `Vision Radiology Hub Test <noreply@${mailgunDomain}>`);
    tonerFormData.append('to', recipientEmail);
    tonerFormData.append('subject', tonerSubject);
    tonerFormData.append('html', tonerHtml);

    const tonerResponse = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${mailgunApiKey}`)}`
      },
      body: tonerFormData
    });

    if (tonerResponse.ok) {
      results.push({ type: 'toner_request', status: 'sent' });
      console.log('Toner request sample email sent');
    }

    // 2. HARDWARE APPROVAL SAMPLE EMAIL
    const hardwareSubject = 'SAMPLE: Hardware Request Approved ✅';
    const hardwareHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #92400e; font-weight: bold;">⚠️ THIS IS A SAMPLE EMAIL FOR TESTING PURPOSES</p>
        </div>

        <h2 style="color: #16a34a;">Request Approved ✅</h2>
        <p>Hello Sarah Johnson,</p>
        <p>Great news! Your hardware request has been approved:</p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <h3>Dell Precision Workstation 5820</h3>
          <p><strong>Request ID:</strong> sample-hw-456</p>
          <p><strong>Approved by:</strong> Michael Chen (IT Manager)</p>
          <p><strong>Total Amount:</strong> AUD $3,450.00</p>
        </div>

        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4>Specifications:</h4>
          <ul style="line-height: 1.8;">
            <li>Intel Xeon W-2235 Processor</li>
            <li>32GB DDR4 RAM</li>
            <li>1TB NVMe SSD</li>
            <li>NVIDIA Quadro P2200 5GB</li>
            <li>Windows 11 Pro</li>
          </ul>
        </div>
        
        <p>Your request is now being processed and you'll receive updates on the delivery status.</p>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="https://hub.visionradiology.com.au/requests/sample-hw-456" 
             style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Request Details
          </a>
        </p>

        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin-top: 30px;">
          <p style="font-size: 14px; margin: 0;">
            <strong>Estimated Delivery:</strong> 5-7 business days<br>
            <strong>Clinic:</strong> Melbourne Medical Centre<br>
            <strong>Business Justification:</strong> Required for DICOM image processing and radiologist workstation
          </p>
        </div>
        
      </div>
    `;

    const hardwareFormData = new FormData();
    hardwareFormData.append('from', `Vision Radiology Hub Test <noreply@${mailgunDomain}>`);
    hardwareFormData.append('to', recipientEmail);
    hardwareFormData.append('subject', hardwareSubject);
    hardwareFormData.append('html', hardwareHtml);

    const hardwareResponse = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${mailgunApiKey}`)}`
      },
      body: hardwareFormData
    });

    if (hardwareResponse.ok) {
      results.push({ type: 'hardware_approval', status: 'sent' });
      console.log('Hardware approval sample email sent');
    }

    // 3. NEW ACCOUNT INVITE SAMPLE EMAIL
    const inviteSubject = 'SAMPLE: You\'re invited to join Vision Radiology Hub';
    const inviteHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #92400e; font-weight: bold;">⚠️ THIS IS A SAMPLE EMAIL FOR TESTING PURPOSES</p>
        </div>

        <h2 style="color: #2563eb;">You're Invited! 🎉</h2>
        <p>Hello,</p>
        <p>Michael Chen has invited you to join <strong>Vision Radiology Hub</strong>.</p>
        
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <p><strong>Your Role:</strong> Manager</p>
          <p><strong>Invite Expires:</strong> ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4>What you'll be able to do:</h4>
          <ul style="line-height: 1.8;">
            <li>✅ Submit hardware and equipment requests</li>
            <li>✅ Approve requests from your team</li>
            <li>✅ View request metrics and analytics</li>
            <li>✅ Manage team user accounts</li>
            <li>✅ Access company documentation and resources</li>
          </ul>
        </div>

        <p>To accept this invitation and set up your account, click the button below:</p>

        <p style="text-align: center; margin: 30px 0;">
          <a href="https://hub.visionradiology.com.au/auth" 
             style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Accept Invitation & Sign Up
          </a>
        </p>

        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">
            <strong>Important:</strong> You must sign up using this email address (<strong>chris@crowdit.com.au</strong>) to accept this invitation.
          </p>
        </div>

        <p style="font-size: 14px; color: #64748b;">
          If you didn't expect this invitation, you can safely ignore this email. The invitation will expire automatically.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          This invitation was sent by Michael Chen
        </p>
      </div>
    `;

    const inviteFormData = new FormData();
    inviteFormData.append('from', `Vision Radiology Hub Test <noreply@${mailgunDomain}>`);
    inviteFormData.append('to', recipientEmail);
    inviteFormData.append('subject', inviteSubject);
    inviteFormData.append('html', inviteHtml);

    const inviteResponse = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${mailgunApiKey}`)}`
      },
      body: inviteFormData
    });

    if (inviteResponse.ok) {
      results.push({ type: 'user_invite', status: 'sent' });
      console.log('User invite sample email sent');
    }

    console.log('All sample emails sent successfully to:', recipientEmail);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sample emails sent to ${recipientEmail}`,
        results 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in send-sample-emails:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
