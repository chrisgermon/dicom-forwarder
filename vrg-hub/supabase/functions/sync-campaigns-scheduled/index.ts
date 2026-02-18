import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate secret header for cron job authentication
    const authHeader = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    
    if (!authHeader || authHeader !== expectedSecret) {
      console.error('[sync-campaigns-scheduled] Unauthorized access attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[sync-campaigns-scheduled] Starting automated campaign sync');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      mailchimp: { success: false, error: null as string | null },
      fax: { success: false, error: null as string | null, campaigns: 0, faxes: 0 },
      referrers: { success: false, error: null as string | null, referrers: 0, clinics: 0 },
    };

    // 1. Sync Mailchimp campaigns
    try {
      console.log('[sync-campaigns-scheduled] Fetching Mailchimp campaigns');
      const mailchimpApiKey = Deno.env.get('MAILCHIMP_API_KEY');
      
      if (mailchimpApiKey) {
        const datacenter = mailchimpApiKey.split('-')[1];
        const mailchimpUrl = `https://${datacenter}.api.mailchimp.com/3.0/campaigns?count=100&sort_field=send_time&sort_dir=DESC`;
        
        const mailchimpResponse = await fetch(mailchimpUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mailchimpApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (mailchimpResponse.ok) {
          const mailchimpData = await mailchimpResponse.json();
          console.log(`[sync-campaigns-scheduled] Fetched ${mailchimpData.campaigns?.length || 0} Mailchimp campaigns`);
          results.mailchimp.success = true;
        } else {
          const errorText = await mailchimpResponse.text();
          results.mailchimp.error = `Mailchimp API error: ${mailchimpResponse.status}`;
          console.error('[sync-campaigns-scheduled] Mailchimp error:', errorText);
        }
      } else {
        results.mailchimp.error = 'MAILCHIMP_API_KEY not configured';
        console.log('[sync-campaigns-scheduled] Mailchimp API key not configured, skipping');
      }
    } catch (error) {
      results.mailchimp.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[sync-campaigns-scheduled] Mailchimp sync error:', error);
    }

    // 2. Sync Notifyre fax campaigns (differential sync)
    try {
      console.log('[sync-campaigns-scheduled] Starting Notifyre fax sync');
      const notifyreApiKey = Deno.env.get('NOTIFYRE_API_KEY');
      
      if (notifyreApiKey) {
        // Get system admin user for logging purposes
        const { data: adminUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', 'crowdit@system.local')
          .single();

        // Calculate date range - sync last 7 days by default
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 7);

        // Check for last successful sync to do differential sync
        const { data: lastSync } = await supabase
          .from('notifyre_sync_history')
          .select('to_date, created_at')
          .eq('status', 'success')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastSync && lastSync.to_date) {
          const lastSyncDate = new Date(lastSync.to_date);
          // Only sync from last sync date if it's within the last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          if (lastSyncDate > thirtyDaysAgo) {
            fromDate.setTime(lastSyncDate.getTime());
            console.log('[sync-campaigns-scheduled] Using differential sync from:', lastSyncDate.toISOString());
          }
        }

        // Call the sync function with service role authentication
        const { data: syncResult, error: syncError } = await supabase.functions.invoke(
          'sync-notifyre-fax-logs',
          {
            body: {
              from_date: fromDate.toISOString(),
              to_date: toDate.toISOString(),
              force_full_sync: false,
            },
          }
        );

        if (syncError) {
          results.fax.error = syncError.message;
          console.error('[sync-campaigns-scheduled] Fax sync error:', syncError);
        } else {
          results.fax.success = true;
          results.fax.campaigns = syncResult?.campaigns || 0;
          results.fax.faxes = syncResult?.faxes || 0;
          console.log(`[sync-campaigns-scheduled] Synced ${results.fax.campaigns} fax campaigns, ${results.fax.faxes} faxes`);
        }
      } else {
        results.fax.error = 'NOTIFYRE_API_KEY not configured';
        console.log('[sync-campaigns-scheduled] Notifyre API key not configured, skipping');
      }
    } catch (error) {
      results.fax.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[sync-campaigns-scheduled] Fax sync error:', error);
    }

    // 3. Sync Referrers from BigQuery
    try {
      console.log('[sync-campaigns-scheduled] Starting Referrer sync from BigQuery');
      
      const { data: syncResult, error: syncError } = await supabase.functions.invoke(
        'sync-referrers',
        { body: {} }
      );

      if (syncError) {
        results.referrers.error = syncError.message;
        console.error('[sync-campaigns-scheduled] Referrer sync error:', syncError);
      } else if (syncResult?.error) {
        results.referrers.error = syncResult.error;
        console.error('[sync-campaigns-scheduled] Referrer sync error:', syncResult.error);
      } else {
        results.referrers.success = true;
        results.referrers.referrers = syncResult?.referrers || 0;
        results.referrers.clinics = syncResult?.clinics || 0;
        console.log(`[sync-campaigns-scheduled] Synced ${results.referrers.referrers} referrers, ${results.referrers.clinics} clinics`);
      }
    } catch (error) {
      results.referrers.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[sync-campaigns-scheduled] Referrer sync error:', error);
    }

    // Log the sync results
    console.log('[sync-campaigns-scheduled] Sync completed:', JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[sync-campaigns-scheduled] Fatal error:', error);
    return new Response(
      JSON.stringify({
        error: 'Campaign sync failed',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
