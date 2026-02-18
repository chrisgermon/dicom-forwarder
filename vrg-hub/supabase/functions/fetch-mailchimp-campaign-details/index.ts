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

    const { campaignId } = await req.json();
    
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }

    // Extract datacenter from API key
    const datacenter = MAILCHIMP_API_KEY.split('-')[1];
    
    if (!datacenter) {
      throw new Error('Invalid Mailchimp API key format');
    }

    // Fetch sent-to details for the campaign
    const url = `https://${datacenter}.api.mailchimp.com/3.0/reports/${campaignId}/sent-to?count=1000`;
    
    console.log(`Fetching recipients for campaign ${campaignId}`);
    
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
      
      // If campaign hasn't been sent yet, return empty array
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ recipients: [] }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
      
      throw new Error(`Mailchimp API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`Fetched ${data.sent_to?.length || 0} recipients for campaign ${campaignId}`);

    // Transform the data to match our interface
    const recipients = (data.sent_to || []).map((recipient: any) => ({
      email_address: recipient.email_address,
      status: recipient.status,
      open_count: recipient.open_count || 0,
      click_count: recipient.click_count || 0,
      last_open: recipient.last_open,
      last_click: recipient.last_click,
    }));

    return new Response(
      JSON.stringify({ recipients }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in fetch-mailchimp-campaign-details:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        recipients: [],
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
