import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
// @deno-types="npm:@types/node"
import { NotifyreAPI, FileType } from 'npm:notifyre-nodejs-sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyreFaxLog {
  id: string;
  recipient: string;
  recipient_name?: string;
  status: 'delivered' | 'failed' | 'pending' | 'processing';
  error?: string;
  pages?: number;
  duration?: number;
  cost?: number;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;
}

interface NotifyreCampaign {
  id: string;
  name: string;
  total_recipients: number;
  delivered: number;
  failed: number;
  pending: number;
  sent_at: string;
  faxes: NotifyreFaxLog[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let from_date: string | undefined;
  let to_date: string | undefined;
  let user_id: string | undefined;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    user_id = user.id;

    const requestBody = await req.json();
    from_date = requestBody.from_date;
    to_date = requestBody.to_date;
    const force_full_sync = requestBody.force_full_sync || false;

    const notifyreApiKey = Deno.env.get('NOTIFYRE_API_KEY');
    if (!notifyreApiKey) {
      throw new Error('Notifyre API key not configured');
    }

    console.log('Fetching sent faxes from Notifyre API...');
    console.log('API Key starts with:', notifyreApiKey.substring(0, 8) + '...');
    console.log('API Key length:', notifyreApiKey.length);

    // Calculate date range with differential sync support
    let toDateObj: Date;
    let fromDateObj: Date;
    let isDifferentialSync = false;
    
    // If dates are provided, use them (manual sync)
    if (from_date && to_date) {
      fromDateObj = new Date(from_date);
      toDateObj = new Date(to_date);
      console.log('Using provided date range:', fromDateObj.toISOString(), 'to', toDateObj.toISOString());
    } 
    // If not forcing full sync, try differential sync from last successful sync
    else if (!force_full_sync) {
      // Check for last successful sync
      const { data: lastSync } = await supabaseClient
        .from('notifyre_sync_history')
        .select('to_date, created_at')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (lastSync && lastSync.to_date) {
        // Sync from last sync's to_date to now
        fromDateObj = new Date(lastSync.to_date);
        toDateObj = new Date();
        isDifferentialSync = true;
        console.log('Differential sync from last successful sync:', fromDateObj.toISOString(), 'to', toDateObj.toISOString());
      } else {
        // No previous sync, default to last 30 days
        toDateObj = new Date();
        fromDateObj = new Date();
        fromDateObj.setDate(fromDateObj.getDate() - 30);
        console.log('No previous sync found, using default date range (last 30 days)');
      }
    } 
    // Force full sync - last 30 days
    else {
      toDateObj = new Date();
      fromDateObj = new Date();
      fromDateObj.setDate(fromDateObj.getDate() - 30);
      console.log('Forcing full sync (last 30 days)');
    }

    // Convert to Unix timestamps (seconds)
    const fromDateUnix = Math.floor(fromDateObj.getTime() / 1000);
    const toDateUnix = Math.floor(toDateObj.getTime() / 1000);

    // Fetch all faxes with pagination
    const allFaxes: any[] = [];
    const limit = 100;
    let skip = 0;
    let hasMore = true;

    console.log('Fetching faxes with pagination...');

    while (hasMore) {
      // Add delay between requests to avoid rate limiting (except first request)
      if (skip > 0) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }

      const url = new URL('https://api.notifyre.com/fax/send');
      url.searchParams.set('fromDate', fromDateUnix.toString());
      url.searchParams.set('toDate', toDateUnix.toString());
      url.searchParams.set('sort', 'desc');
      url.searchParams.set('limit', limit.toString());
      url.searchParams.set('skip', skip.toString());

      console.log(`Calling API (skip: ${skip}, limit: ${limit}):`, url.toString());

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
            details: responseText.slice(0, 500)
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      const data = JSON.parse(responseText);
      const payload = data.payload ?? data.Payload ?? data.data ?? {};
      const faxes = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.faxes)
        ? payload.faxes
        : [];

      console.log(`Received ${faxes.length} faxes in this batch`);
      
      // Log first fax to see available fields (for debugging reference fields)
      if (faxes.length > 0 && allFaxes.length === 0) {
        console.log('Sample fax data (first fax) - ALL FIELDS:', JSON.stringify(faxes[0], null, 2));
        console.log('Reference fields found:', {
          clientReference: faxes[0]?.clientReference,
          client_reference: faxes[0]?.client_reference,
          ClientReference: faxes[0]?.ClientReference,
          messageReference: faxes[0]?.messageReference,
          message_reference: faxes[0]?.message_reference,
          reference: faxes[0]?.reference,
          Reference: faxes[0]?.Reference,
          ref: faxes[0]?.ref,
          Ref: faxes[0]?.Ref,
          yourReference: faxes[0]?.yourReference,
          your_reference: faxes[0]?.your_reference,
        });
      }

      allFaxes.push(...faxes);

      // Check if there are more results
      if (faxes.length < limit) {
        hasMore = false;
      } else {
        skip += limit;
      }
    }

    console.log(`Total faxes fetched: ${allFaxes.length}`);

    // Group faxes by campaign (you can adjust this logic based on actual data structure)
    const campaignMap = new Map<string, any[]>();
    
    for (const fax of allFaxes) {
      const campaignKey = fax.friendlyID || fax.batchId || fax.id || 'individual';
      if (!campaignMap.has(campaignKey)) {
        campaignMap.set(campaignKey, []);
      }
      campaignMap.get(campaignKey)!.push(fax);
    }

    let totalInserted = 0;

    // Process each campaign
    for (const [campaignKey, campaignFaxes] of campaignMap.entries()) {
      const stats = {
        delivered: campaignFaxes.filter(f => ['delivered', 'sent', 'successful'].includes((f.status || '').toLowerCase())).length,
        failed: campaignFaxes.filter(f => ['failed', 'error'].includes((f.status || '').toLowerCase())).length,
        pending: campaignFaxes.filter(f => ['pending', 'processing', 'queued', 'scheduled'].includes((f.status || '').toLowerCase())).length,
      };

      // Extract client reference and message reference from the first fax in the campaign
      // Try many variations of reference field names
      const clientReference = campaignFaxes[0]?.clientReference || 
                              campaignFaxes[0]?.client_reference || 
                              campaignFaxes[0]?.ClientReference ||
                              null;
      
      const messageReference = campaignFaxes[0]?.messageReference || 
                               campaignFaxes[0]?.message_reference || 
                               campaignFaxes[0]?.reference || 
                               campaignFaxes[0]?.Reference ||
                               campaignFaxes[0]?.ref ||
                               campaignFaxes[0]?.Ref ||
                               campaignFaxes[0]?.yourReference ||
                               campaignFaxes[0]?.your_reference ||
                               null;
      
      // Extract contact group information
      const contactGroupId = campaignFaxes[0]?.contactGroupId || 
                            campaignFaxes[0]?.contact_group_id || 
                            campaignFaxes[0]?.groupId || 
                            campaignFaxes[0]?.group_id || 
                            null;
      
      const contactGroupName = campaignFaxes[0]?.contactGroupName || 
                              campaignFaxes[0]?.contact_group_name || 
                              campaignFaxes[0]?.groupName || 
                              campaignFaxes[0]?.group_name || 
                              null;
      
      // Generate descriptive campaign name with date
      const sentDate = campaignFaxes[0]?.sentAt || campaignFaxes[0]?.createdAt || 
                       (campaignFaxes[0]?.createdDateUtc ? new Date(campaignFaxes[0].createdDateUtc * 1000).toISOString() : new Date().toISOString());
      const dateStr = new Date(sentDate).toLocaleDateString('en-AU', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Build campaign name with priority: clientReference > messageReference > contactGroupName + date > campaign key + date
      let campaignName: string;
      const reference = clientReference || messageReference;
      
      if (reference) {
        campaignName = reference;
      } else if (contactGroupName) {
        campaignName = `${contactGroupName} - ${dateStr}`;
      } else {
        campaignName = `Fax Campaign ${campaignKey} - ${dateStr}`;
      }
      
      // Store reference in metadata for future use
      const metadata = {
        clientReference,
        messageReference,
        reference,
        originalCampaignKey: campaignKey,
      };

      // Insert or update campaign
      const { data: campaign, error: campaignError } = await supabaseClient
        .from('notifyre_fax_campaigns')
        .upsert({
          campaign_id: String(campaignKey),
          campaign_name: campaignName,
          contact_group_id: contactGroupId,
          contact_group_name: contactGroupName,
          total_recipients: campaignFaxes.length,
          delivered_count: stats.delivered,
          failed_count: stats.failed,
          pending_count: stats.pending,
          sent_at: campaignFaxes[0]?.sentAt || campaignFaxes[0]?.createdAt || (campaignFaxes[0]?.createdDateUtc ? new Date(campaignFaxes[0].createdDateUtc * 1000).toISOString() : new Date().toISOString()),
          metadata,
        }, {
          onConflict: 'campaign_id'
        })
        .select()
        .single();

      if (campaignError) {
        console.error('Error inserting campaign:', campaignError);
        continue;
      }

      // Insert fax logs (without document fields)
      const toIso = (sec: number | null | undefined) => (typeof sec === 'number' ? new Date(sec * 1000).toISOString() : null);
      const faxLogs = campaignFaxes.map((fax: any) => ({
        campaign_id: campaign.id,
        notifyre_fax_id: fax.recipientID || fax.id || fax.faxId,
        recipient_number: fax.to || fax.recipient || 'Unknown',
        recipient_name: fax.recipientName || fax.toName || null,
        status: fax.status || 'pending',
        error_message: fax.failedMessage || fax.error || fax.errorMessage || null,
        pages_sent: fax.pages || fax.pageCount || null,
        duration_seconds: fax.duration || fax.durationSeconds || null,
        cost_cents: typeof fax.cost === 'number' ? Math.round(fax.cost * 100) : (typeof fax.costCents === 'number' ? fax.costCents : null),
        sent_at: fax.sentAt || fax.createdAt || toIso(fax.createdDateUtc),
        delivered_at: (String(fax.status || '').toLowerCase() === 'successful') ? (fax.deliveredAt || fax.completedAt || toIso(fax.lastModifiedDateUtc)) : (fax.deliveredAt || fax.completedAt || null),
        failed_at: (String(fax.status || '').toLowerCase() === 'failed') ? (fax.failedAt || toIso(fax.lastModifiedDateUtc)) : (fax.failedAt || null),
      }));

      const { error: logsError } = await supabaseClient
        .from('notifyre_fax_logs')
        .upsert(faxLogs, {
          onConflict: 'notifyre_fax_id'
        });

      if (logsError) {
        console.error('Error inserting logs:', logsError);
      } else {
        totalInserted += faxLogs.length;
      }

      // Download one document per campaign (using first fax as representative)
      const firstFax = campaignFaxes[0];
      const recipientId = firstFax.recipientID || firstFax.id || firstFax.faxId;
      
      if (recipientId && !campaign.document_path) {
        try {
      console.log(`Downloading campaign document for ${campaignKey} using recipient: ${recipientId}`);
      
      const notifyreAPI = new NotifyreAPI(notifyreApiKey);
      const faxService = notifyreAPI.getFaxService();
      
      const downloadOnce = async () => {
        try {
          const resp = await faxService.downloadSentFax({
            recipientID: recipientId,
            fileType: FileType.Pdf,
          });
          return typeof resp === 'string' ? resp : (resp?.payload ?? (resp as any)?.data ?? null);
        } catch (e) {
          return null;
        }
      };

      let base64: unknown = await downloadOnce();
      if (!base64) {
        console.warn('Merged document not ready, retrying once for campaign:', campaignKey);
        await new Promise(r => setTimeout(r, 1500));
        base64 = await downloadOnce();
      }

      if (typeof base64 !== 'string' || base64.length === 0) {
        throw new Error('Failed to download campaign document (empty payload)');
      }

      const cleaned = base64.includes(',') ? base64.split(',')[1] : base64;
      const binary = atob(cleaned);
      const uploadData = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) uploadData[i] = binary.charCodeAt(i);

      console.log('Upload data length:', uploadData.length);

      // Upload to Supabase Storage
      const fileName = `campaigns/${campaignKey}/campaign-document.pdf`;
      const { error: uploadError } = await supabaseClient.storage
        .from('fax-documents')
        .upload(fileName, uploadData, {
          contentType: 'application/pdf',
          upsert: true
        });

          if (uploadError) {
            console.error(`Error uploading campaign document:`, uploadError);
          } else {
            // Update campaign with document path
            await supabaseClient
              .from('notifyre_fax_campaigns')
              .update({ document_path: fileName })
              .eq('id', campaign.id);

            console.log(`Successfully stored campaign document: ${fileName}`);
          }
        } catch (err) {
          console.error(`Error downloading campaign document:`, err);
        }
      }
    }

    // Log sync history
    await supabaseClient
      .from('notifyre_sync_history')
      .insert({
        synced_by: user_id,
        from_date: fromDateObj.toISOString(),
        to_date: toDateObj.toISOString(),
        campaigns_synced: campaignMap.size,
        faxes_synced: totalInserted,
        status: 'success'
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully synced fax data from Notifyre',
        campaigns: campaignMap.size,
        faxes: totalInserted
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error testing Notifyre API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Try to log failed sync if we have the necessary data
    try {
      if (from_date && to_date) {
        await supabaseClient
          .from('notifyre_sync_history')
          .insert({
            synced_by: user_id,
            from_date: from_date,
            to_date: to_date,
            campaigns_synced: 0,
            faxes_synced: 0,
            status: 'error',
            error_message: errorMessage
          });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});