import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header and extract user ID from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[send-welcome-email] No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract JWT token and decode it to get user ID (handle base64url)
    const jwt = authHeader.replace('Bearer ', '');
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      console.error('[send-welcome-email] Invalid JWT format');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const b64url = parts[1];
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    const userId = payload.sub as string;

    if (!userId) {
      console.error('[send-welcome-email] No user ID in JWT');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[send-welcome-email] Processing for user ID:', userId);

    // Check if this is the user's first login
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('last_login, full_name, email')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('[send-welcome-email] Error fetching profile:', profileError);
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if last_login is null or this is the first login
    const isFirstLogin = !profile.last_login;

    console.log('[send-welcome-email] Is first login:', isFirstLogin);

    if (isFirstLogin) {
      // Send welcome email
      console.log('[send-welcome-email] Sending welcome email to:', profile.email);
      
      const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: profile.email,
          subject: 'Welcome to Vision Radiology Hub!',
          template: 'welcome_email',
          data: {
            userName: profile.full_name || profile.email,
          },
        },
      });

      if (emailError) {
        console.error('[send-welcome-email] Error sending email:', emailError);
        // Don't fail the request, just log it
      }
    }

    // Update last_login timestamp and ensure account is active
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        last_login: new Date().toISOString(),
        is_active: true 
      })
      .eq('id', userId);
    
    console.log('[send-welcome-email] Account activated and last_login updated');

    if (updateError) {
      console.error('[send-welcome-email] Error updating last_login:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        welcomeEmailSent: isFirstLogin,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[send-welcome-email] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
