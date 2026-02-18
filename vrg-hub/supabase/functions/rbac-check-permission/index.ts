import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PermissionCheckRequest {
  userId?: string; // Optional - defaults to current user
  resource: string;
  action: string;
  includeTrace?: boolean; // For debugging
}

interface PermissionTrace {
  step: string;
  result: 'allow' | 'deny' | 'skip';
  reason: string;
}

interface PermissionCheckResponse {
  allowed: boolean;
  trace?: PermissionTrace[];
}

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

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { userId, resource, action, includeTrace } = await req.json() as PermissionCheckRequest;
    const targetUserId = userId || user.id;

    // Admin client for unrestricted queries
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const trace: PermissionTrace[] = [];

    // Step 1: Check if user is active (via profiles table)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', targetUserId)
      .maybeSingle();

    if (!profile) {
      if (includeTrace) {
        trace.push({
          step: 'user_status',
          result: 'deny',
          reason: 'User not found or inactive'
        });
      }
      return new Response(
        JSON.stringify({ allowed: false, trace }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Get the permission ID for this resource:action
    const { data: permission } = await supabaseAdmin
      .from('rbac_permissions')
      .select('id')
      .eq('resource', resource)
      .eq('action', action)
      .maybeSingle();

    if (!permission) {
      // Check for wildcard permissions (resource:*)
      const { data: wildcardPermission } = await supabaseAdmin
        .from('rbac_permissions')
        .select('id')
        .eq('resource', resource)
        .eq('action', '*')
        .maybeSingle();

      if (!wildcardPermission) {
        // Check for global wildcard (*:*)
        const { data: globalWildcard } = await supabaseAdmin
          .from('rbac_permissions')
          .select('id')
          .eq('resource', '*')
          .eq('action', '*')
          .maybeSingle();

        if (!globalWildcard) {
          if (includeTrace) {
            trace.push({
              step: 'permission_lookup',
              result: 'deny',
              reason: `No permission defined for ${resource}:${action}`
            });
          }
          return new Response(
            JSON.stringify({ allowed: false, trace }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const permissionId = permission?.id;

    // Step 3: Check user permission overrides (highest priority)
    if (permissionId) {
      const { data: userPermission } = await supabaseAdmin
        .from('rbac_user_permissions')
        .select('effect')
        .eq('user_id', targetUserId)
        .eq('permission_id', permissionId)
        .maybeSingle();

      if (userPermission) {
        const allowed = userPermission.effect === 'allow';
        if (includeTrace) {
          trace.push({
            step: 'user_override',
            result: userPermission.effect as 'allow' | 'deny',
            reason: `User has explicit ${userPermission.effect} override for ${resource}:${action}`
          });
        }
        return new Response(
          JSON.stringify({ allowed, trace }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Step 4: Check role permissions
    // Get all roles for the user
    const { data: userRoles } = await supabaseAdmin
      .from('rbac_user_roles')
      .select('role_id')
      .eq('user_id', targetUserId);

    if (!userRoles || userRoles.length === 0) {
      if (includeTrace) {
        trace.push({
          step: 'role_lookup',
          result: 'deny',
          reason: 'User has no roles assigned'
        });
      }
      return new Response(
        JSON.stringify({ allowed: false, trace }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roleIds = userRoles.map(r => r.role_id);

    // Get all role permissions for these roles
    if (permissionId) {
      const { data: rolePermissions } = await supabaseAdmin
        .from('rbac_role_permissions')
        .select('effect, role_id')
        .in('role_id', roleIds)
        .eq('permission_id', permissionId);

      if (rolePermissions && rolePermissions.length > 0) {
        // Check for any deny (deny wins)
        const hasDeny = rolePermissions.some(rp => rp.effect === 'deny');
        if (hasDeny) {
          if (includeTrace) {
            trace.push({
              step: 'role_permissions',
              result: 'deny',
              reason: `At least one role has deny for ${resource}:${action}`
            });
          }
          return new Response(
            JSON.stringify({ allowed: false, trace }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check for any allow
        const hasAllow = rolePermissions.some(rp => rp.effect === 'allow');
        if (hasAllow) {
          if (includeTrace) {
            trace.push({
              step: 'role_permissions',
              result: 'allow',
              reason: `At least one role has allow for ${resource}:${action}`
            });
          }
          return new Response(
            JSON.stringify({ allowed: true, trace }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Step 5: Default deny
    if (includeTrace) {
      trace.push({
        step: 'default',
        result: 'deny',
        reason: 'No matching allow rules found - default deny'
      });
    }

    return new Response(
      JSON.stringify({ allowed: false, trace }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error checking permission:', error);
    return new Response(
      JSON.stringify({ error: error.message, allowed: false }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
