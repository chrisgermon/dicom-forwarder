// Using Deno.serve instead of deprecated import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmOrderRequest {
  token: string;
  eta_delivery?: string;
  tracking_link?: string;
  notes?: string;
  admin_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle GET request - verify token and return request details
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const token = url.searchParams.get('token');

      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify token and get request details
      const { data: tokenData, error: tokenError } = await supabase
        .from('order_confirmation_tokens')
        .select(`
          *,
          request:hardware_requests(
            id,
            title,
            description,
            total_amount,
            currency,
            status,
            created_at,
            user_id
          )
        `)
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if token is still valid
      if (tokenData.used_at || new Date(tokenData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Token has already been used or has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get requester details
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', tokenData.request.user_id)
        .single();

      return new Response(
        JSON.stringify({ 
          valid: true,
          request: tokenData.request,
          requester: requesterProfile
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST request - confirm the order
    if (req.method === 'POST') {
      const { token, eta_delivery, tracking_link, notes, admin_email }: ConfirmOrderRequest = await req.json();

      if (!token || !admin_email) {
        return new Response(
          JSON.stringify({ error: 'Token and admin email are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify token
      const { data: tokenData, error: tokenError } = await supabase
        .from('order_confirmation_tokens')
        .select('*, request:hardware_requests(*)')
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if token is still valid
      if (tokenData.used_at || new Date(tokenData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Token has already been used or has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update the hardware request
      const { error: updateError } = await supabase
        .from('hardware_requests')
        .update({
          status: 'ordered',
          eta_delivery: eta_delivery || null,
          tracking_link: tracking_link || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', tokenData.request_id);

      if (updateError) {
        console.error('Error updating request:', updateError);
        throw new Error('Failed to update request');
      }

      // Mark token as used
      await supabase
        .from('order_confirmation_tokens')
        .update({
          used_at: new Date().toISOString(),
          used_by_email: admin_email
        })
        .eq('id', tokenData.id);

      // Get requester details
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', tokenData.request.user_id)
        .single();

      // Send confirmation email to requester
      if (requesterProfile) {
        const emailData = {
          requestTitle: tokenData.request.title,
          requestId: tokenData.request.id,
          totalAmount: tokenData.request.total_amount,
          currency: tokenData.request.currency || 'AUD',
          eta_delivery: eta_delivery || 'TBA',
          tracking_link: tracking_link || null,
          notes: notes || null
        };

        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: requesterProfile.email,
            subject: `[VRG-${String(tokenData.request.request_number).padStart(5, '0')}] Order Confirmed: ${tokenData.request.title}`,
            template: 'request_ordered',
            data: emailData
          }
        });

        // Log the email
        await supabase.from('email_logs').insert({
          request_id: tokenData.request_id,
          recipient_email: requesterProfile.email,
          email_type: 'order_confirmation',
          subject: `[VRG-${String(tokenData.request.request_number).padStart(5, '0')}] Order Confirmed: ${tokenData.request.title}`,
          status: 'sent',
          metadata: {
            confirmed_by: admin_email,
            eta_delivery,
            tracking_link
          }
        });
      }

      console.log('Order confirmed successfully');

      return new Response(
        JSON.stringify({ success: true, message: 'Order confirmed successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error("Error in confirm-order function:", error);
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
