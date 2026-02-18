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
    const { campaignId } = await req.json();

    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }

    const MAILCHIMP_API_KEY = Deno.env.get('MAILCHIMP_API_KEY');
    
    if (!MAILCHIMP_API_KEY) {
      throw new Error('MAILCHIMP_API_KEY is not configured');
    }

    // Extract datacenter from API key
    const datacenter = MAILCHIMP_API_KEY.split('-')[1];
    
    if (!datacenter) {
      throw new Error('Invalid Mailchimp API key format');
    }

    const url = `https://${datacenter}.api.mailchimp.com/3.0/campaigns/${campaignId}/content`;
    
    console.log(`Fetching content for campaign ${campaignId}`);
    
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
    
    console.log(`Successfully fetched content for campaign ${campaignId}`);

    return new Response(
      JSON.stringify({ 
        html: data.html || '',
        plain_text: data.plain_text || '',
        archive_html: data.archive_html || '',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in fetch-mailchimp-campaign-content:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        html: '',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
