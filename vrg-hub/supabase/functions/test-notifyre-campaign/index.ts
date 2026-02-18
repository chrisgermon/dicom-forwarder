import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, faxId } = await req.json();
    
    if (!campaignId && !faxId) {
      throw new Error('campaignId or faxId is required');
    }

    const notifyreApiKey = Deno.env.get('NOTIFYRE_API_KEY');
    if (!notifyreApiKey) {
      throw new Error('Notifyre API key not configured');
    }

    console.log('Fetching data for', campaignId ? `campaign: ${campaignId}` : `fax: ${faxId}`);

    // Fetch recent faxes (filter by campaign after fetch)
    const url = new URL('https://api.notifyre.com/fax/send');

    // Use Unix seconds (no milliseconds) and same param casing as working sync function
    const nowSec = Math.floor(Date.now() / 1000);
    const fromSec = nowSec - 60 * 60 * 24 * 365; // last 12 months
    url.searchParams.set('fromDate', String(fromSec));
    url.searchParams.set('toDate', String(nowSec));
    url.searchParams.set('sort', 'desc');
    url.searchParams.set('limit', '1000');
    url.searchParams.set('skip', '0');

    console.log('Calling Notifyre API:', url.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-api-token': notifyreApiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `API returned ${response.status}: ${response.statusText}`,
          details: responseText
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const data = JSON.parse(responseText);
    
    // Normalize faxes array
    const payload = data.payload ?? data.Payload ?? data.data ?? {};
    const faxes = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.faxes)
      ? payload.faxes
      : [];

    if (faxId) {
      // Find specific fax by various possible ID fields
      const targetFax = faxes.find((f: any) =>
        f.id === faxId || f.recipientID === faxId || f.faxId === faxId || f.messageID === faxId
      );
      console.log(`Total fetched: ${faxes.length} | Found target fax: ${!!targetFax}`);
      if (targetFax) {
        console.log('Complete fax data:', JSON.stringify(targetFax, null, 2));
      }
      return new Response(
        JSON.stringify({
          success: true,
          fax_id: faxId,
          found: !!targetFax,
          fax: targetFax,
          available_fields: targetFax ? Object.keys(targetFax) : [],
          total_searched: faxes.length,
          raw: data
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Else filter by campaign ID (friendlyID/batchId/id)
    const faxesForCampaign = faxes.filter((f: any) => {
      const key = f.friendlyID || f.batchId || f.id;
      return key === campaignId;
    });

    console.log(`Total fetched: ${faxes.length} | Matching campaign ${campaignId}: ${faxesForCampaign.length}`);
    if (faxesForCampaign[0]) {
      console.log('Sample matching fax:', JSON.stringify(faxesForCampaign[0], null, 2));
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_fetched: faxes.length,
        campaign_id: campaignId,
        matching_count: faxesForCampaign.length,
        faxes: faxesForCampaign,
        raw: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error fetching campaign:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
