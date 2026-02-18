// Using Deno.serve instead of deprecated import

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeocodeRequest {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  locationId?: string;
}

interface GeocodeResponse {
  lat: number;
  lng: number;
  formatted_address?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, city, state, zipCode, locationId }: GeocodeRequest = await req.json();
    
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!googleMapsApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    // Build address string
    const addressParts = [address, city, state, zipCode].filter(Boolean);
    const fullAddress = addressParts.join(', ');

    if (!fullAddress) {
      throw new Error('No address provided');
    }

    // Call Google Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${googleMapsApiKey}`;
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Geocoding failed:', data.status, data.error_message);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to geocode address',
          status: data.status,
          message: data.error_message 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const location = data.results[0].geometry.location;
    const result: GeocodeResponse = {
      lat: location.lat,
      lng: location.lng,
      formatted_address: data.results[0].formatted_address,
    };

    // Save coordinates to database if locationId is provided
    if (locationId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      await fetch(`${supabaseUrl}/rest/v1/locations?id=eq.${locationId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng
        })
      });
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[geocode-address] ERROR:", error);
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
