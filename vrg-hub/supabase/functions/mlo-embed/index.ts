import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const METABASE_SECRET = Deno.env.get('METABASE_SECRET_KEY')!;
const METABASE_URL = 'https://metabase-lypf4vkh4q-ts.a.run.app';
const DASHBOARD_ID = 4;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Admin users - can see ALL MLOs (filter is editable)
const ADMIN_EMAILS = new Set([
  'chris@crowdit.com.au',
  'chris@visionradiology.com.au',
  'crowdit@system.local',
  // Add more admin emails as needed
]);

// Email to MLO mapping - supports both email formats
const EMAIL_TO_MLO: Record<string, string> = {
  // Vision Radiology
  'danielle.jensen@visionradiology.com.au': 'Danielle Jensen',
  'djensen@visionradiology.com.au': 'Danielle Jensen',
  'megan.smythe@visionradiology.com.au': 'Megan Smythe',
  'msmythe@visionradiology.com.au': 'Megan Smythe',
  'kristina.bilic@visionradiology.com.au': 'Kristina Bilic',
  'kbilic@visionradiology.com.au': 'Kristina Bilic',
  'suella.panagiotou@visionradiology.com.au': 'Suella Panagiotou',
  'spanagiotou@visionradiology.com.au': 'Suella Panagiotou',
  // Quantum Radiology
  'alicia.beeby@quantumradiology.com.au': 'Alicia Beeby',
  'abeeby@quantumradiology.com.au': 'Alicia Beeby',
  'leigh.sparkes@quantumradiology.com.au': 'Leigh Sparkes',
  'lsparkes@quantumradiology.com.au': 'Leigh Sparkes',
  // Light Radiology
  'kim.baker@lightradiology.com.au': 'Kim Baker',
  'kbaker@lightradiology.com.au': 'Kim Baker',
  // Focus Radiology
  'djessy.farah@focusradiology.com.au': 'Djessy Farah',
  'dfarah@focusradiology.com.au': 'Djessy Farah',
  'michele.barrett@focusradiology.com.au': 'Michele Barrett',
  'mbarrett@focusradiology.com.au': 'Michele Barrett',
  'tara.arkins@focusradiology.com.au': 'Tara Arkins',
  'tarkins@focusradiology.com.au': 'Tara Arkins',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      console.error('[mlo-embed] No email provided');
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('[mlo-embed] Looking up user for email:', normalizedEmail);
    
    // Check if admin
    const isAdmin = ADMIN_EMAILS.has(normalizedEmail);
    
    // Check if MLO
    const mloName = EMAIL_TO_MLO[normalizedEmail];

    // Must be either admin or valid MLO
    if (!isAdmin && !mloName) {
      console.log('[mlo-embed] No MLO mapping or admin access for email:', normalizedEmail);
      return new Response(
        JSON.stringify({ error: 'Access denied - no MLO mapping for this email' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[mlo-embed] User access:', { isAdmin, mloName });

    if (!METABASE_SECRET) {
      console.error('[mlo-embed] METABASE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Metabase not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create JWT payload
    // For admins: no mlo param (they can select any)
    // For MLOs: mlo param locked to their name
    const payload: { resource: { dashboard: number }; params: { mlo?: string }; exp: number } = {
      resource: { dashboard: DASHBOARD_ID },
      params: {},
      exp: Math.floor(Date.now() / 1000) + 600, // 10 minute expiry
    };

    // Only set mlo param for non-admins (locks the filter)
    if (!isAdmin && mloName) {
      payload.params.mlo = mloName;
    }

    // Sign the JWT with Metabase secret
    const secret = new TextEncoder().encode(METABASE_SECRET);
    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);

    // Build embed URL
    // Admins see the MLO filter; MLOs have it hidden
    const hideParams = isAdmin ? '' : '&hide_parameters=mlo';
    const embedUrl = `${METABASE_URL}/embed/dashboard/${token}#bordered=false&titled=false${hideParams}`;

    console.log('[mlo-embed] Generated embed URL:', { isAdmin, mloName });

    return new Response(
      JSON.stringify({ embedUrl, mloName: mloName || null, isAdmin }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[mlo-embed] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
