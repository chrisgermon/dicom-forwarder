import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, company_id, ...params } = await req.json();

    console.log('n8n webhook triggered:', { action, company_id, params });

    let result: any = {};

    switch (action) {
      case 'sync-office365-users': {
        // Trigger Office 365 user sync
        const { data, error } = await supabase.functions.invoke('office365-sync-data', {
          body: { company_id }
        });
        
        if (error) throw error;
        result = { success: true, message: 'Office 365 sync triggered', data };
        break;
      }

      case 'get-sharepoint-sites': {
        // Get SharePoint sites
        const { data, error } = await supabase.functions.invoke('sharepoint-get-sites', {
          body: { company_id }
        });
        
        if (error) throw error;
        result = { success: true, sites: data };
        break;
      }

      case 'browse-sharepoint-folder': {
        // Browse SharePoint folder
        const { site_id, folder_path } = params;
        const { data, error } = await supabase.functions.invoke('sharepoint-browse-folders', {
          body: { company_id, site_id, folder_path }
        });
        
        if (error) throw error;
        result = { success: true, items: data };
        break;
      }

      case 'sync-notifyre-fax': {
        // Sync Notifyre fax logs
        const { from_date, to_date } = params;
        const { data, error } = await supabase.functions.invoke('sync-notifyre-fax-logs', {
          body: {
            from_date: from_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            to_date: to_date || new Date().toISOString(),
            force_full_sync: false
          }
        });
        
        if (error) throw error;
        result = { success: true, message: 'Notifyre sync completed', data };
        break;
      }

      case 'test': {
        // Test endpoint
        result = { success: true, message: 'n8n webhook is working', timestamp: new Date().toISOString() };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}. Available actions: sync-office365-users, get-sharepoint-sites, browse-sharepoint-folder, sync-notifyre-fax, test`);
    }

    // Log the webhook call
    await supabase.from('audit_logs').insert({
      action: 'n8n_webhook',
      table_name: 'n8n_integration',
      new_data: { action, company_id, params, result }
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in n8n webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
