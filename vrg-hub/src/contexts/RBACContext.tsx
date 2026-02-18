import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

/**
 * Permission effect type - allow or deny
 */
type PermissionEffect = 'allow' | 'deny';

/**
 * Structure for a permission entry
 */
interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

// UserPermissionOverride interface - kept for type documentation
// interface UserPermissionOverride {
//   permissionId: string;
//   effect: PermissionEffect;
// }

/**
 * Role permission entry
 */
interface RolePermission {
  permissionId: string;
  roleId: string;
  roleName: string;
  effect: PermissionEffect;
}

/**
 * RBAC Context state
 */
interface RBACContextState {
  // User's assigned roles
  userRoles: string[];
  // All available permissions
  allPermissions: Permission[];
  // User-specific permission overrides (highest priority)
  userOverrides: Map<string, PermissionEffect>;
  // Role-based permissions
  rolePermissions: Map<string, RolePermission[]>;
  // Loading state
  loading: boolean;
  // Error state
  error: string | null;
  // Refresh permissions data
  refresh: () => Promise<void>;
  /**
   * Check if user has a specific permission
   * Evaluation order: User Override > Role Permission > Default Deny
   * @param resource - The resource to check (e.g., 'hardware', 'tickets')
   * @param action - The action to check (e.g., 'create', 'read', 'update', 'delete')
   */
  hasPermission: (resource: string, action: string) => boolean;
  /**
   * Check if user has a legacy permission string
   * Supports backwards compatibility with old permission format
   * @param permission - Legacy permission string (e.g., 'create_hardware_request')
   */
  hasLegacyPermission: (permission: string) => boolean;
  /**
   * Check if user has ANY of the specified permissions
   */
  hasAnyPermission: (permissions: Array<{ resource: string; action: string } | string>) => boolean;
  /**
   * Check if user has ALL of the specified permissions
   */
  hasAllPermissions: (permissions: Array<{ resource: string; action: string } | string>) => boolean;
  /**
   * Check if user has a specific role
   */
  hasRole: (roleName: string) => boolean;
  /**
   * Check if user has ANY of the specified roles
   */
  hasAnyRole: (roleNames: string[]) => boolean;
  /**
   * Get the effective permission result with trace for debugging
   */
  getPermissionTrace: (resource: string, action: string) => {
    allowed: boolean;
    reason: string;
    source: 'user_override' | 'role_permission' | 'default_deny';
  };
  /**
   * Check if user is a super admin
   */
  isSuperAdmin: boolean;
  /**
   * Check if user is a tenant admin
   */
  isTenantAdmin: boolean;
}

export const RBACContext = createContext<RBACContextState | undefined>(undefined);

/**
 * Map of legacy permission strings to new resource:action format
 * This allows backwards compatibility while migrating to the new RBAC system
 */
const LEGACY_PERMISSION_MAP: Record<string, { resource: string; action: string }> = {
  // Basic access
  'view_dashboard': { resource: 'home', action: 'read' },  // Legacy - dashboard is now Home
  'view_home': { resource: 'home', action: 'read' },
  'view_own_requests': { resource: 'requests', action: 'read_own' },
  'edit_own_drafts': { resource: 'requests', action: 'edit_own' },
  'view_file_directory': { resource: 'file_directory', action: 'read' },

  // Create requests
  'create_hardware_request': { resource: 'hardware', action: 'create' },
  'create_toner_request': { resource: 'toner', action: 'create' },
  'create_marketing_request': { resource: 'marketing', action: 'create' },
  'create_user_account_request': { resource: 'user_accounts', action: 'create' },
  'create_user_offboarding_request': { resource: 'user_offboarding', action: 'create' },
  'create_ticket_request': { resource: 'tickets', action: 'create' },
  'create_facility_services_request': { resource: 'facility_services', action: 'create' },
  'create_office_services_request': { resource: 'office_services', action: 'create' },
  'create_accounts_payable_request': { resource: 'accounts_payable', action: 'create' },
  'create_finance_request': { resource: 'finance', action: 'create' },
  'create_technology_training_request': { resource: 'technology_training', action: 'create' },
  'create_it_service_desk_request': { resource: 'it_service_desk', action: 'create' },
  'create_hr_request': { resource: 'hr', action: 'create' },
  'create_department_request': { resource: 'department', action: 'create' },

  // Approvals
  'approve_hardware_requests': { resource: 'hardware', action: 'approve' },
  'approve_user_account_requests': { resource: 'user_accounts', action: 'approve' },
  'approve_marketing_requests': { resource: 'marketing', action: 'approve' },
  'approve_newsletter_submissions': { resource: 'newsletters', action: 'approve' },

  // Marketing
  'view_fax_campaigns': { resource: 'fax_campaigns', action: 'read' },

  // Management
  'manage_company_users': { resource: 'users', action: 'manage' },
  'manage_newsletter_cycle': { resource: 'newsletters', action: 'manage' },
  'view_all_company_requests': { resource: 'requests', action: 'read_all' },
  'view_request_metrics': { resource: 'metrics', action: 'read' },

  // Configuration
  'configure_company_settings': { resource: 'settings', action: 'configure' },
  'manage_company_features': { resource: 'features', action: 'manage' },
  'manage_office365_integration': { resource: 'integrations', action: 'manage_o365' },
  'configure_sharepoint': { resource: 'sharepoint', action: 'configure' },

  // Documentation
  'view_modality_details': { resource: 'modalities', action: 'read' },
  'view_sharepoint_documents': { resource: 'sharepoint', action: 'read' },
  'submit_newsletter': { resource: 'newsletters', action: 'submit' },
  'view_news': { resource: 'news', action: 'read' },
  'create_news': { resource: 'news', action: 'create' },
  'edit_news': { resource: 'news', action: 'update' },
  'delete_news': { resource: 'news', action: 'delete' },
  'manage_knowledge_base': { resource: 'knowledge_base', action: 'manage' },
  'edit_knowledge_base': { resource: 'knowledge_base', action: 'update' },
  'delete_knowledge_base': { resource: 'knowledge_base', action: 'delete' },
  'view_hr_documents': { resource: 'hr_documents', action: 'read' },
  'access_eap_program': { resource: 'eap_program', action: 'read' },
  'view_employee_assistance': { resource: 'employee_assistance', action: 'read' },

  // Ticket management
  'view_ticket_queue': { resource: 'tickets', action: 'read_queue' },
  'view_ticket_audit_log': { resource: 'tickets', action: 'read_audit' },
  'assign_ticket_requests': { resource: 'tickets', action: 'assign' },
  'start_ticket_requests': { resource: 'tickets', action: 'start' },
  'resolve_ticket_requests': { resource: 'tickets', action: 'resolve' },
  'manage_ticket_watchers': { resource: 'tickets', action: 'manage_watchers' },

  // System admin
  'manage_all_companies': { resource: 'companies', action: 'manage_all' },
  'manage_system_users': { resource: 'users', action: 'manage_system' },
  'view_audit_logs': { resource: 'audit_logs', action: 'read' },
  'manage_file_storage': { resource: 'file_storage', action: 'manage' },
  'manage_user_invites': { resource: 'invites', action: 'manage' },
  'manage_role_permissions': { resource: 'rbac', action: 'manage' },
  'view_system_metrics': { resource: 'metrics', action: 'read_system' },

  // Reminders
  'manage_reminder_settings': { resource: 'reminders', action: 'manage' },
};

interface RBACProviderProps {
  children: ReactNode;
}

export function RBACProvider({ children }: RBACProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [userOverrides, setUserOverrides] = useState<Map<string, PermissionEffect>>(new Map());
  const [rolePermissions, setRolePermissions] = useState<Map<string, RolePermission[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  /**
   * Fetch all RBAC data for the current user
   */
  const fetchRBACData = useCallback(async () => {
    // Wait for auth to finish loading before fetching RBAC data
    if (authLoading) {
      return;
    }

    if (!user?.id) {
      // No user - reset state and mark as not loading
      setUserRoles([]);
      setUserOverrides(new Map());
      setRolePermissions(new Map());
      setLoading(false);
      setHasFetched(true);
      return;
    }

    // Avoid redundant fetches if we already have data for this user
    if (hasFetched && userRoles.length > 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel for performance
      const [
        rolesResult,
        permissionsResult,
        userOverridesResult,
        rolePermissionsResult,
      ] = await Promise.all([
        // 1. Fetch user's roles
        supabase
          .from('rbac_user_roles')
          .select(`
            role_id,
            role:rbac_roles(id, name)
          `)
          .eq('user_id', user.id),

        // 2. Fetch all available permissions
        supabase
          .from('rbac_permissions')
          .select('id, resource, action, description')
          .order('resource')
          .order('action'),

        // 3. Fetch user's permission overrides
        supabase
          .from('rbac_user_permissions')
          .select(`
            permission_id,
            effect,
            permission:rbac_permissions(id, resource, action)
          `)
          .eq('user_id', user.id),

        // 4. Fetch role permissions for user's roles
        supabase
          .from('rbac_user_roles')
          .select(`
            role:rbac_roles(
              id,
              name,
              role_permissions:rbac_role_permissions(
                permission_id,
                effect,
                permission:rbac_permissions(id, resource, action)
              )
            )
          `)
          .eq('user_id', user.id),
      ]);

      // Process roles
      if (rolesResult.error) throw rolesResult.error;
      const roles = rolesResult.data
        ?.map((r: any) => r.role?.name)
        .filter(Boolean) || [];
      setUserRoles(roles);

      // Process all permissions
      if (permissionsResult.error) throw permissionsResult.error;
      setAllPermissions(permissionsResult.data || []);

      // Process user overrides - keyed by "resource:action"
      if (userOverridesResult.error) throw userOverridesResult.error;
      const overridesMap = new Map<string, PermissionEffect>();
      (userOverridesResult.data || []).forEach((override: any) => {
        if (override.permission && override.effect) {
          const key = `${override.permission.resource}:${override.permission.action}`;
          overridesMap.set(key, override.effect as PermissionEffect);
        }
      });
      setUserOverrides(overridesMap);

      // Process role permissions - keyed by "resource:action"
      if (rolePermissionsResult.error) throw rolePermissionsResult.error;
      const rolePermsMap = new Map<string, RolePermission[]>();
      (rolePermissionsResult.data || []).forEach((userRole: any) => {
        const role = userRole.role;
        if (!role) return;

        (role.role_permissions || []).forEach((rp: any) => {
          if (rp.permission && rp.effect) {
            const key = `${rp.permission.resource}:${rp.permission.action}`;
            const existing = rolePermsMap.get(key) || [];
            existing.push({
              permissionId: rp.permission_id,
              roleId: role.id,
              roleName: role.name,
              effect: rp.effect as PermissionEffect,
            });
            rolePermsMap.set(key, existing);
          }
        });
      });
      setRolePermissions(rolePermsMap);

    } catch (err) {
      logger.error('Error fetching RBAC data', err);
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  }, [user?.id, authLoading, hasFetched, userRoles.length]);

  // Reset hasFetched when user changes
  useEffect(() => {
    setHasFetched(false);
  }, [user?.id]);

  // Fetch RBAC data when auth is ready and user changes
  useEffect(() => {
    if (!authLoading) {
      fetchRBACData();
    }
  }, [fetchRBACData, authLoading]);

  /**
   * Get permission trace for debugging
   */
  const getPermissionTrace = useCallback((resource: string, action: string) => {
    const permKey = `${resource}:${action}`;

    // Super admin always has access
    if (userRoles.includes('super_admin')) {
      return {
        allowed: true,
        reason: 'User is super_admin - has all permissions',
        source: 'role_permission' as const,
      };
    }

    // Step 1: Check user overrides (highest priority)
    const userOverride = userOverrides.get(permKey);
    if (userOverride) {
      return {
        allowed: userOverride === 'allow',
        reason: `User has explicit ${userOverride} override for ${permKey}`,
        source: 'user_override' as const,
      };
    }

    // Step 2: Check role permissions
    const rolePerms = rolePermissions.get(permKey);
    if (rolePerms && rolePerms.length > 0) {
      // Deny takes precedence over allow
      const hasDeny = rolePerms.some(rp => rp.effect === 'deny');
      if (hasDeny) {
        const denyRole = rolePerms.find(rp => rp.effect === 'deny');
        return {
          allowed: false,
          reason: `Role '${denyRole?.roleName}' has deny for ${permKey}`,
          source: 'role_permission' as const,
        };
      }

      const hasAllow = rolePerms.some(rp => rp.effect === 'allow');
      if (hasAllow) {
        const allowRole = rolePerms.find(rp => rp.effect === 'allow');
        return {
          allowed: true,
          reason: `Role '${allowRole?.roleName}' has allow for ${permKey}`,
          source: 'role_permission' as const,
        };
      }
    }

    // Step 3: Default deny
    return {
      allowed: false,
      reason: `No matching permission rules for ${permKey} - default deny`,
      source: 'default_deny' as const,
    };
  }, [userRoles, userOverrides, rolePermissions]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback((resource: string, action: string): boolean => {
    return getPermissionTrace(resource, action).allowed;
  }, [getPermissionTrace]);

  /**
   * Check legacy permission string
   */
  const hasLegacyPermission = useCallback((permission: string): boolean => {
    // Check if it's a legacy permission that needs mapping
    const mapped = LEGACY_PERMISSION_MAP[permission];
    if (mapped) {
      return hasPermission(mapped.resource, mapped.action);
    }

    // Try to parse as resource:action format
    if (permission.includes(':')) {
      const [resource, action] = permission.split(':');
      return hasPermission(resource, action);
    }

    // Fallback: super_admin has all permissions
    if (userRoles.includes('super_admin')) {
      return true;
    }

    // Unknown permission format - deny by default
    logger.warn(`Unknown permission format: ${permission}`);
    return false;
  }, [hasPermission, userRoles]);

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback((
    permissions: Array<{ resource: string; action: string } | string>
  ): boolean => {
    return permissions.some(perm => {
      if (typeof perm === 'string') {
        return hasLegacyPermission(perm);
      }
      return hasPermission(perm.resource, perm.action);
    });
  }, [hasPermission, hasLegacyPermission]);

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback((
    permissions: Array<{ resource: string; action: string } | string>
  ): boolean => {
    return permissions.every(perm => {
      if (typeof perm === 'string') {
        return hasLegacyPermission(perm);
      }
      return hasPermission(perm.resource, perm.action);
    });
  }, [hasPermission, hasLegacyPermission]);

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback((roleName: string): boolean => {
    return userRoles.includes(roleName);
  }, [userRoles]);

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback((roleNames: string[]): boolean => {
    return roleNames.some(role => userRoles.includes(role));
  }, [userRoles]);

  const isSuperAdmin = userRoles.includes('super_admin');
  const isTenantAdmin = userRoles.includes('tenant_admin');

  // Combined loading state: true if auth is loading OR rbac data is loading
  const isLoading = authLoading || loading;

  const contextValue: RBACContextState = useMemo(
    () => ({
      userRoles,
      allPermissions,
      userOverrides,
      rolePermissions,
      loading: isLoading,
      error,
      refresh: fetchRBACData,
      hasPermission,
      hasLegacyPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
      getPermissionTrace,
      isSuperAdmin,
      isTenantAdmin,
    }),
    [
      userRoles,
      allPermissions,
      userOverrides,
      rolePermissions,
      isLoading,
      error,
      fetchRBACData,
      hasPermission,
      hasLegacyPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
      getPermissionTrace,
      isSuperAdmin,
      isTenantAdmin,
    ]
  );

  return (
    <RBACContext.Provider value={contextValue}>
      {children}
    </RBACContext.Provider>
  );
}

/**
 * Hook to access the RBAC context
 */
export function useRBAC() {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
}

/**
 * Convenience hook for checking a single permission
 */
export function useHasPermission(resource: string, action: string): boolean {
  const { hasPermission, loading } = useRBAC();
  if (loading) return false;
  return hasPermission(resource, action);
}

/**
 * Convenience hook for checking a legacy permission
 */
export function useHasLegacyPermission(permission: string): boolean {
  const { hasLegacyPermission, loading } = useRBAC();
  if (loading) return false;
  return hasLegacyPermission(permission);
}
