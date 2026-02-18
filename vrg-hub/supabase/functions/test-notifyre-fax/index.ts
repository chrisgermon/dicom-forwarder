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
    const { faxId } = await req.json();
    
    if (!faxId) {
      throw new Error('Fax ID is required');
    }

    const notifyreApiKey = Deno.env.get('NOTIFYRE_API_KEY');
    if (!notifyreApiKey) {
      throw new Error('Notifyre API key not configured');
    }

    console.log('Fetching data for fax ID:', faxId);

    // Fetch recent faxes and filter by ID
    const url = new URL('https://api.notifyre.com/fax/send');

    // Use Unix seconds (no milliseconds)
    const nowSec = Math.floor(Date.now() / 1000);
    const fromSec = nowSec - 60 * 60 * 24 * 365; // last 12 months
    url.searchParams.set('fromDate', String(fromSec));
    url.searchParams.set('toDate', String(nowSec));
    url.searchParams.set('sort', 'desc');
    url.searchParams.set('limit', '100');
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

    // Find the specific fax by ID (check multiple ID fields)
    const targetFax = faxes.find((f: any) => 
      f.id === faxId || 
      f.recipientID === faxId || 
      f.faxId === faxId ||
      f.messageID === faxId
    );

    console.log(`Total fetched: ${faxes.length} | Found target fax: ${!!targetFax}`);
    if (targetFax) {
      console.log('Complete fax data:', JSON.stringify(targetFax, null, 2));
    } else {
      console.log('Fax not found. Sample IDs from results:', faxes.slice(0, 5).map((f: any) => ({
        id: f.id,
        recipientID: f.recipientID,
        faxId: f.faxId,
        messageID: f.messageID
      })));
    }

    return new Response(
      JSON.stringify({
        success: true,
        fax_id: faxId,
        found: !!targetFax,
        fax: targetFax,
        available_fields: targetFax ? Object.keys(targetFax) : [],
        total_searched: faxes.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error fetching fax:', error);
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
