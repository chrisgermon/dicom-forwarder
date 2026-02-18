import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TonerRequestEmailData {
  requestId: string;
  userId: string;
}

async function predictTonerModels(printerModel: string, colors: string[]): Promise<string> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!lovableApiKey) {
    console.log('LOVABLE_API_KEY not configured, skipping AI prediction');
    return 'Not available';
  }

  try {
    const prompt = `Given the printer model "${printerModel}" and required colors: ${colors.join(', ')}, 
please provide the exact toner cartridge model numbers that are compatible. 
Format the response as a simple list of model numbers, one per line. 
Be specific and include manufacturer part numbers if available.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a printer expert. Provide concise, accurate toner cartridge model numbers for the given printer and colors.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('AI prediction failed:', response.status);
      return 'Not available';
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Not available';
  } catch (error) {
    console.error('Error predicting toner models:', error);
    return 'Not available';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { requestId, userId }: TonerRequestEmailData = await req.json();

    // Fetch toner request details
    const { data: request, error: requestError } = await supabase
      .from('toner_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('Failed to fetch toner request:', requestError);
      throw new Error('Failed to fetch toner request details');
    }

    // Fetch requester profile
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', request.user_id)
      .single();

    // Fetch company details
    const { data: companyData } = await supabase
      .from('companies')
      .select('name, id')
      .eq('id', request.company_id)
      .single();

    // Get notification recipients from user notifications table
    const { data: userNotifications } = await supabase
      .from('request_type_notifications')
      .select('user_id, receive_notifications')
      .eq('company_id', request.company_id)
      .eq('request_type', 'toner')
      .eq('receive_notifications', true);

    let recipientEmails: string[] = [];

    if (userNotifications && userNotifications.length > 0) {
      // Get user emails from profiles
      const userIds = userNotifications.map(n => n.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email')
        .in('user_id', userIds);
      
      recipientEmails = (profiles || []).map(p => p.email).filter(Boolean);
      console.log('Using user notifications:', recipientEmails);
    }

    if (recipientEmails.length === 0) {
      recipientEmails = ['hub@visionradiology.com.au'];
      console.log('No user notifications configured, using fallback:', recipientEmails);
    }

    // Predict toner models using AI
    const predictedModels = await predictTonerModels(
      request.printer_model || 'Unknown',
      request.colors_required || []
    );

    // Update the request with predicted models
    await supabase
      .from('toner_requests')
      .update({ predicted_toner_models: predictedModels })
      .eq('id', requestId);

    // Send email using Mailgun
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN');
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');

    if (!mailgunDomain || !mailgunApiKey) {
      throw new Error('Mailgun configuration missing');
    }

    const emailSubject = `[${(request as any).request_number || requestId}] New Toner Request: ${request.title}`;
    const emailBody = `
New Toner Request Received

Request Details:
- Title: ${request.title}
- Description: ${request.description || 'N/A'}
- Site/Location: ${request.site || 'N/A'}
- Quantity: ${request.quantity}
- Printer Model: ${request.printer_model || 'N/A'}
- Colors Required: ${request.colors_required?.join(', ') || 'N/A'}
- Urgency: ${request.urgency}

AI-Predicted Toner Models:
${predictedModels}

Requested by:
- Name: ${requesterProfile?.name || 'Unknown'}
- Email: ${requesterProfile?.email || 'Unknown'}
- Company: ${companyData?.name || 'Unknown'}

Request ID: ${request.id}
Date: ${new Date(request.created_at).toLocaleString()}
    `;

    const formData = new FormData();
    formData.append('from', `Toner Requests <noreply@${mailgunDomain}>`);
    // Send to orders@crowdit.com.au
    recipientEmails.forEach((email: string) => {
      formData.append('to', email);
    });
    formData.append('subject', emailSubject);
    formData.append('text', emailBody);

    const mailgunResponse = await fetch(
      `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`api:${mailgunApiKey}`)}`,
        },
        body: formData,
      }
    );

    if (!mailgunResponse.ok) {
      const errorText = await mailgunResponse.text();
      console.error('Mailgun error:', errorText);
      throw new Error('Failed to send email via Mailgun');
    }

    // Log email sent for each recipient
    for (const recipientEmail of recipientEmails) {
      await supabase.from('email_logs').insert({
        request_id: requestId,
        email_type: 'toner_request',
        recipient_email: recipientEmail,
        subject: emailSubject,
        status: 'sent',
        metadata: { request_type: 'toner' }
      });
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: request.user_id,
      user_email: recipientEmails.join(', '),
      action: 'email_sent',
      table_name: 'email_logs',
      record_id: requestId,
      new_data: {
        email_type: 'toner_request',
        subject: emailSubject,
        status: 'sent',
        recipients: recipientEmails
      }
    });

    console.log('Toner request email sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in send-toner-request-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});