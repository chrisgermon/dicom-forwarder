// Public Google Maps API Key provider
// Returns a public key for loading Google Maps JavaScript API on the client
// Uses either VITE_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY from backend secrets

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const viteKey = Deno.env.get('VITE_GOOGLE_MAPS_API_KEY');
    const serverKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    const apiKey = viteKey || serverKey || '';

    return new Response(
      JSON.stringify({ apiKey, hasKey: !!apiKey }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (e) {
    console.error('public-google-maps-key error', e);
    return new Response(
      JSON.stringify({ error: 'Failed to read Google Maps API key' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});