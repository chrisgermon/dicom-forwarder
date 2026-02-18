import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { NotifyreAPI, FileType } from 'npm:notifyre-nodejs-sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sanitizeBase64(b64: string): string {
  let s = (b64 || '').toString().trim();
  // Strip quotes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.substring(1, s.length - 1);
  }
  // Handle data URLs
  if (s.includes(',')) s = s.split(',').pop() || '';
  // URL-safe to standard
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  // Remove whitespace/newlines
  s = s.replace(/\s+/g, '');
  // Pad to multiple of 4
  const pad = s.length % 4;
  if (pad) s = s + '='.repeat(4 - pad);
  return s;
}

function decodeBase64ToUint8Array(b64: string): Uint8Array {
  try {
    const cleaned = sanitizeBase64(b64);
    const binary = atob(cleaned);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch (e) {
    console.error('Failed to decode base64', e);
    return new Uint8Array();
  }
}

async function tryDownloadMergedPdf(
  faxService: any,
  recipientId: string,
  attempt = 1,
  maxAttempts = 6
): Promise<string | null> {
  try {
    const response = await faxService.downloadSentFax({
      recipientID: recipientId,
      fileType: FileType.Pdf,
    });

    // Normalize SDK response shapes
    let base64: string | null = null;
    if (typeof response === 'string') {
      base64 = response;
    } else if (response?.payload) {
      const p: any = response.payload;
      base64 = typeof p === 'string' ? p : (p.base64Str ?? null);
    } else if ((response as any)?.data) {
      const d: any = (response as any).data;
      base64 = typeof d === 'string' ? d : (d.base64Str ?? null);
    }

    if (typeof base64 === 'string' && base64.length > 0) {
      const cleaned = sanitizeBase64(base64);
      const looksPdf = cleaned.startsWith('JVBERi0'); // %PDF-
      if (!looksPdf || cleaned.length < 1024) {
        console.warn('downloadSentFax payload not yet a full PDF (attempt', attempt, ')');
        if (attempt < maxAttempts) {
          const delay = 1000 + attempt * 1000;
          await new Promise((r) => setTimeout(r, delay));
          return tryDownloadMergedPdf(faxService, recipientId, attempt + 1, maxAttempts);
        }
        return null;
      }
      return base64;
    }

    console.warn('downloadSentFax returned empty payload');

    if (attempt < maxAttempts) {
      const delay = 1000 + attempt * 1000;
      await new Promise((r) => setTimeout(r, delay));
      return tryDownloadMergedPdf(faxService, recipientId, attempt + 1, maxAttempts);
    }

    return null;
  } catch (err: any) {
    const msg = String(err?.message ?? '');
    // Notifyre can respond with 400 "Failed to find the merged document" shortly after send
    if (attempt < maxAttempts && msg.includes('Failed to find the merged document')) {
      const delay = 1000 + attempt * 1000;
      console.warn('Merged document not ready, retrying... attempt', attempt, 'delay', delay);
      await new Promise((r) => setTimeout(r, delay));
      return tryDownloadMergedPdf(faxService, recipientId, attempt + 1, maxAttempts);
    }
    console.error('downloadSentFax error:', err);
    return null;
  }
}

async function findRecipientIdByFriendlyId(
  faxService: any,
  friendlyId: string
): Promise<string | null> {
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const yearAgoSec = nowSec - 3600 * 24 * 365;
    let skip = 0;
    const limit = 100;

    while (skip < 2000) {
      const res = await faxService.listSentFaxes({
        fromDate: yearAgoSec,
        toDate: nowSec,
        sort: 'desc',
        limit,
        skip,
      });

      const faxes = (res?.payload?.faxes ?? []) as any[];
      if (Array.isArray(faxes) && faxes.length) {
        const match = faxes.find((f) => f?.friendlyID === friendlyId);
        if (match?.recipientID) {
          console.log('Resolved recipientID from friendlyID:', match.recipientID);
          return match.recipientID as string;
        }
      }

      const total = Number(res?.payload?.total ?? 0);
      skip += limit;
      if (skip >= total) break;
    }
  } catch (e) {
    console.error('findRecipientIdByFriendlyId error:', e);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { campaignId, force } = await req.json();
    
    if (!campaignId) {
      throw new Error('campaignId is required');
    }

    const notifyreApiKey = Deno.env.get('NOTIFYRE_API_KEY');
    if (!notifyreApiKey) {
      throw new Error('Notifyre API key not configured');
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('notifyre_fax_campaigns')
      .select('*')
      .eq('id', campaignId)
      .maybeSingle();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // If document already exists and not forcing, validate it's not empty and return it
    if (campaign.document_path && !force) {
      console.log('Document already exists:', campaign.document_path);
      let shouldRedownload = false;
      try {
        const { data: existingBlob, error: dlError } = await supabaseClient.storage
          .from('fax-documents')
          .download(campaign.document_path);

        if (dlError) {
          console.error('Error downloading existing document for size check:', dlError);
          shouldRedownload = true;
        } else if (existingBlob) {
          const size = (existingBlob as any).size ?? (await (existingBlob as Blob).arrayBuffer()).byteLength;
          console.log('Existing document size:', size);
          if (!size || size < 1024) {
            console.warn('Existing document appears empty, will re-download.');
            shouldRedownload = true;
          }
        }
      } catch (e) {
        console.error('Existing document size check failed:', e);
        shouldRedownload = true;
      }

      if (!shouldRedownload) {
        // Get signed URL for download
        const { data: signedUrlData, error: urlError } = await supabaseClient.storage
          .from('fax-documents')
          .createSignedUrl(campaign.document_path, 60); // 60 seconds expiry

        if (urlError) {
          console.error('Error creating signed URL:', urlError);
          throw new Error('Failed to get document URL');
        }

        return new Response(
          JSON.stringify({
            success: true,
            url: signedUrlData.signedUrl,
            cached: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    // Get candidate faxes from campaign to download document
    const { data: faxes, error: faxError } = await supabaseClient
      .from('notifyre_fax_logs')
      .select('notifyre_fax_id,status,pages,created_at')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (faxError || !faxes || faxes.length === 0) {
      throw new Error('No fax found for campaign');
    }

    const preferred = (faxes as any[]).find(f => f?.status === 'successful' && f?.notifyre_fax_id)
      ?? (faxes as any[]).find(f => f?.notifyre_fax_id);

    const chosenRecipientId: string | null = preferred?.notifyre_fax_id ?? null;

    if (!chosenRecipientId) {
      throw new Error('No recipient id available for campaign');
    }

    console.log(`Downloading campaign document using recipient: ${chosenRecipientId}`);
    
    // Download from Notifyre
    const notifyreAPI = new NotifyreAPI(notifyreApiKey);
    const faxService = notifyreAPI.getFaxService();
    
    let base64 = await tryDownloadMergedPdf(faxService, chosenRecipientId);
    if (!base64) {
      console.warn('Initial download by DB id failed or not ready, attempting lookup by friendlyID...');
      const recipientId = await findRecipientIdByFriendlyId(faxService, campaign.campaign_id);
      if (recipientId) {
        base64 = await tryDownloadMergedPdf(faxService, recipientId);
      }
    }
    if (!base64) {
      throw new Error('Failed to download document from Notifyre');
    }

    const uploadData = decodeBase64ToUint8Array(base64);
    console.log('Upload data length:', uploadData.length);

    // Validate PDF magic header %PDF-
    const isPdf =
      uploadData.length >= 1024 &&
      uploadData[0] === 0x25 && // %
      uploadData[1] === 0x50 && // P
      uploadData[2] === 0x44 && // D
      uploadData[3] === 0x46 && // F
      uploadData[4] === 0x2d;   // -

    if (!isPdf) {
      console.warn('Downloaded bytes do not look like a valid PDF yet. Length:', uploadData.length);
      throw new Error('Downloaded document is empty or invalid PDF');
    }

    // Upload to Supabase Storage
    const fileName = `${campaign.company_id}/${campaign.campaign_id}/campaign-document.pdf`;
    const { error: uploadError } = await supabaseClient.storage
      .from('fax-documents')
      .upload(fileName, uploadData, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading document:', uploadError);
      throw new Error('Failed to upload document');
    }

    // Update campaign with document path
    await supabaseClient
      .from('notifyre_fax_campaigns')
      .update({ document_path: fileName })
      .eq('id', campaignId);

    console.log(`Successfully stored campaign document: ${fileName}`);

    // Get signed URL for download
    const { data: signedUrlData, error: urlError } = await supabaseClient.storage
      .from('fax-documents')
      .createSignedUrl(fileName, 60);

    if (urlError) {
      throw new Error('Failed to get document URL');
    }

    return new Response(
      JSON.stringify({ success: true, url: signedUrlData.signedUrl, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error downloading campaign document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
