// Using Deno.serve instead of deprecated import

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const MAILCHIMP_API_KEY = Deno.env.get('MAILCHIMP_API_KEY');
    
    if (!MAILCHIMP_API_KEY) {
      throw new Error('MAILCHIMP_API_KEY is not configured');
    }

    // Extract datacenter from API key (last part after the dash)
    const datacenter = MAILCHIMP_API_KEY.split('-')[1];
    
    if (!datacenter) {
      throw new Error('Invalid Mailchimp API key format');
    }

    const url = `https://${datacenter}.api.mailchimp.com/3.0/campaigns?count=100&sort_field=send_time&sort_dir=DESC`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mailchimp API error:', errorText);
      throw new Error(`Mailchimp API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`Fetched ${data.campaigns?.length || 0} campaigns from Mailchimp`);

    return new Response(
      JSON.stringify({ campaigns: data.campaigns || [] }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in fetch-mailchimp-campaigns:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        campaigns: [],
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 with empty array to prevent UI errors
      }
    );
  }
});
