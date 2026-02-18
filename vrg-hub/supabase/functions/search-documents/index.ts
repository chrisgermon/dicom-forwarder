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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { searchQuery } = await req.json();

    if (!searchQuery || searchQuery.trim() === '') {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const query = searchQuery.toLowerCase();
    const results: Array<{ name: string; id: string; path: string; created_at: string; metadata: any }> = [];

    // Recursive function to search through folders
    async function searchInFolder(path: string) {
      const { data, error } = await supabaseClient.storage
        .from('documents')
        .list(path, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) {
        console.error(`Error listing folder ${path}:`, error);
        return;
      }

      for (const item of data || []) {
        if (item.id === null) {
          // It's a folder, search recursively
          await searchInFolder(`${path}${item.name}/`);
        } else if (item.name !== '.keep' && item.name.toLowerCase().includes(query)) {
          // It's a file that matches the search
          results.push({
            name: item.name,
            id: item.id,
            path: path,
            created_at: item.created_at || new Date().toISOString(),
            metadata: item.metadata || {}
          });
        }
      }
    }

    // Start search from shared folder
    await searchInFolder('shared/');

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-documents function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
