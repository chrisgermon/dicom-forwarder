// Using Deno.serve instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSReminderRequest {
  reminderId: string;
  phoneNumber: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestBody: SMSReminderRequest | null = null;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    requestBody = await req.json();
    
    if (!requestBody) {
      throw new Error('Invalid request body');
    }

    const { reminderId, phoneNumber, message } = requestBody;

    console.log('Sending SMS reminder:', { reminderId, phoneNumber });

    // Compute days_before for de-duplication based on reminder date
    let daysBefore: number | null = null;
    try {
      const { data: reminder } = await supabase
        .from('reminders')
        .select('reminder_date')
        .eq('id', reminderId)
        .maybeSingle();
      if (reminder?.reminder_date) {
        const now = new Date();
        const rDate = new Date(reminder.reminder_date);
        daysBefore = Math.ceil((rDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    } catch (_) {/* non-blocking */}

    // Get Notifyre API key from secrets
    const notifyreApiKey = Deno.env.get('NOTIFYRE_API_KEY');
    
    if (!notifyreApiKey) {
      throw new Error('Notifyre API key not configured');
    }

    // Send SMS via Notifyre API (per docs: https://docs.notifyre.com/api/sms-send)
    const smsUrl = `https://api.notifyre.com/sms/send`;
    const fromNumber = Deno.env.get('NOTIFYRE_SMS_FROM') || undefined;

    // Ensure E.164 format - handle Australian numbers starting with 0
    let e164 = phoneNumber;
    if (!e164.startsWith('+')) {
      // If it starts with 0, assume Australian number and convert to +61
      if (e164.startsWith('0')) {
        e164 = '+61' + e164.substring(1);
      } else {
        e164 = '+' + e164;
      }
    }

    let smsResult: any = null;

    // Base payload per docs
    const basePayload: any = {
      Body: message,
      Recipients: [{ type: 'mobile_number', value: e164 }],
      AddUnsubscribeLink: false,
      CallbackUrl: '',
      Metadata: { source: 'send-sms-reminder' },
      CampaignName: 'Reminders',
    };

    const sendPayload = async (withFrom: boolean) => {
      const payloadToSend = withFrom && fromNumber
        ? { ...basePayload, From: fromNumber }
        : basePayload;

      console.log('Notifyre SMS request:', {
        url: smsUrl,
        to: e164,
        messageLength: message?.length,
        hasFrom: withFrom && !!fromNumber,
        recipientsShape: payloadToSend.Recipients,
      });

      const resp = await fetch(smsUrl, {
        method: 'POST',
        headers: {
          'x-api-token': notifyreApiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadToSend),
      });
      return resp;
    };

    // First attempt: include From if provided, else send without From
    let response = await sendPayload(!!fromNumber);

    // If invalid from number, retry without From
    if (!response.ok) {
      const raw = await response.text();
      let parsed: any = null;
      try { parsed = JSON.parse(raw); } catch { /* not JSON */ }
      const msgText = (typeof parsed === 'string' ? parsed : parsed?.message || raw || '').toString().toLowerCase();

      if (fromNumber && response.status === 400 && msgText.includes('invalid from')) {
        console.warn('Notifyre responded with invalid from number. Retrying without From.');
        response = await sendPayload(false);
        if (!response.ok) {
          const raw2 = await response.text();
          let parsed2: any = null;
          try { parsed2 = JSON.parse(raw2); } catch { /* not JSON */ }
          const details2 = parsed2 ?? raw2 ?? 'Unknown error';
          throw new Error(`Notifyre API error (after retry without From): ${response.status} - ${typeof details2 === 'string' ? details2 : JSON.stringify(details2)}`);
        }
      } else {
        const details = parsed ?? raw ?? 'Unknown error';
        throw new Error(`Notifyre API error: ${response.status} - ${typeof details === 'string' ? details : JSON.stringify(details)}`);
      }
    }

    smsResult = await response.json();
    console.log('SMS sent successfully:', smsResult);

    if (!smsResult) {
      throw new Error('Failed to send SMS');
    }

    // Log the notification only when we have a valid reminder_id (UUID)
    const isUuid = typeof reminderId === 'string' && /^[0-9a-fA-F-]{36}$/.test(reminderId);
    if (isUuid) {
      const { error: logError } = await supabase
        .from('reminder_notifications')
        .insert({
          reminder_id: reminderId,
          notification_type: 'sms',
          status: 'sent',
          recipient: phoneNumber,
          days_before: daysBefore,
          metadata: { notifyre_response: smsResult, source: 'send-sms-reminder' },
        });
      if (logError) {
        console.error('Error logging notification:', logError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: smsResult }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in send-sms-reminder:', error);

    // Log failed notification if we have the request body
    if (requestBody) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const isUuid = typeof requestBody.reminderId === 'string' && /^[0-9a-fA-F-]{36}$/.test(requestBody.reminderId);
        
        // Re-compute days_before for failure log
        let daysBefore: number | null = null;
        try {
          const { data: reminder } = await supabase
            .from('reminders')
            .select('reminder_date')
            .eq('id', requestBody.reminderId)
            .maybeSingle();
          if (reminder?.reminder_date) {
            const now = new Date();
            const rDate = new Date(reminder.reminder_date);
            daysBefore = Math.ceil((rDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          }
        } catch (_) {/* ignore */}

        const failurePayload: any = {
          notification_type: 'sms',
          status: 'failed',
          recipient: requestBody.phoneNumber,
          error_message: error.message,
          days_before: daysBefore,
          metadata: { source: 'send-sms-reminder' },
        };
        if (isUuid) failurePayload.reminder_id = requestBody.reminderId;

        if (isUuid) {
          await supabase
            .from('reminder_notifications')
            .insert(failurePayload);
        }
      } catch (logError) {
        console.error('Error logging failed notification:', logError);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

Deno.serve(handler);
