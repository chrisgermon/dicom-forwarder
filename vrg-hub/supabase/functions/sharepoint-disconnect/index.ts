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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Disconnecting SharePoint for user ${user.id}`);

    // Get all company IDs associated with this user's connections
    const { data: connections } = await supabase
      .from('office365_connections')
      .select('company_id')
      .or(`user_id.eq.${user.id},user_id.is.null`);

    const companyIds = connections?.map(c => c.company_id).filter(Boolean) || [];

    // Delete SharePoint configurations for these companies
    if (companyIds.length > 0) {
      const { error: configError } = await supabase
        .from('sharepoint_configurations')
        .delete()
        .in('company_id', companyIds);

      if (configError) {
        console.error('Error deleting SharePoint configurations:', configError);
      } else {
        console.log(`Deleted SharePoint configurations for ${companyIds.length} companies`);
      }

      // Clear SharePoint cache for these companies
      const { error: cacheError } = await supabase
        .from('sharepoint_cache')
        .delete()
        .in('company_id', companyIds);

      if (cacheError) {
        console.error('Error clearing SharePoint cache:', cacheError);
      } else {
        console.log(`Cleared SharePoint cache for ${companyIds.length} companies`);
      }
    }

    // Delete Office 365 connections
    const { error: connectionError } = await supabase
      .from('office365_connections')
      .delete()
      .eq('user_id', user.id);

    if (connectionError) {
      console.error('Error deleting Office 365 connections:', connectionError);
      return new Response(
        JSON.stringify({ error: 'Failed to disconnect Office 365' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully disconnected SharePoint for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'SharePoint disconnected successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Disconnect error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
