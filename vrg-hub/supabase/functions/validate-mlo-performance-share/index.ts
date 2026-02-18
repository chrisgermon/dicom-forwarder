import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key for this public endpoint
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      throw new Error('Token is required');
    }

    // Find the share link
    const { data: shareLink, error: fetchError } = await supabaseClient
      .from('mlo_performance_shared_links')
      .select('*')
      .eq('share_token', token)
      .eq('is_active', true)
      .single();

    if (fetchError || !shareLink) {
      throw new Error('Invalid or expired share link');
    }

    // Check expiration
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      throw new Error('This share link has expired');
    }

    // Update access count and last accessed
    await supabaseClient
      .from('mlo_performance_shared_links')
      .update({
        access_count: (shareLink.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', shareLink.id);

    // Get list of MLO users for the dropdown
    const { data: mloUsers, error: mloError } = await supabaseClient
      .from('mlo_assignments')
      .select(`
        user_id,
        user:profiles!mlo_assignments_user_id_fkey(id, full_name, email)
      `)
      .order('user_id');

    // Deduplicate MLO users
    const uniqueMlos = new Map();
    if (mloUsers) {
      mloUsers.forEach(assignment => {
        const user = assignment.user as any;
        if (user && !uniqueMlos.has(assignment.user_id)) {
          uniqueMlos.set(assignment.user_id, {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
          });
        }
      });
    }

    return new Response(
      JSON.stringify({ 
        valid: true,
        expiresAt: shareLink.expires_at,
        accessCount: shareLink.access_count + 1,
        mloUsers: Array.from(uniqueMlos.values()).sort((a, b) => 
          (a.full_name || '').localeCompare(b.full_name || '')
        ),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating MLO performance share link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ valid: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
