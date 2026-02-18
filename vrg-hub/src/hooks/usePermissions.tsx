import { useMemo, useContext } from "react";
import { useAuth } from "./useAuth";
import { RBACContext } from "@/contexts/RBACContext";
import { PERMISSION_GROUPS } from "@/lib/access-control/constants";
import type { UserRoleKey } from "@/lib/access-control/types";
import { useCompanyFeatures } from "./useCompanyFeatures";

interface UsePermissionsOptions {
  companyId?: string;
  userId?: string;
}

// Legacy fallback: Map roles to permission groups (used when RBAC context is not available)
const ROLE_GROUPS_MAP: Record<UserRoleKey, string[]> = {
  requester: ["basic-access", "create-requests", "documentation"],
  marketing: ["basic-access", "create-requests", "marketing", "documentation"],
  manager: [
    "basic-access",
    "create-requests",
    "approvals",
    "management",
    "documentation",
    "ticket-management",
  ],
  marketing_manager: [
    "basic-access",
    "create-requests",
    "marketing",
    "approvals",
    "documentation",
    "ticket-management",
  ],
  tenant_admin: [
    "basic-access",
    "create-requests",
    "approvals",
    "marketing",
    "management",
    "configuration",
    "documentation",
    "ticket-management",
  ],
  super_admin: [
    "basic-access",
    "create-requests",
    "approvals",
    "marketing",
    "management",
    "configuration",
    "documentation",
    "system-admin",
    "ticket-management",
    "executive",
  ],
  executive: [
    "basic-access",
    "executive",
  ],
};

export function usePermissions(_options: UsePermissionsOptions = {}) {
  const { userRole } = useAuth();
  const { isFeatureEnabled } = useCompanyFeatures();

  // Safely access RBAC context using useContext directly (returns undefined if not available)
  // This avoids the hook safety issue of using try/catch around a hook call
  const rbacContext = useContext(RBACContext);

  // Build the effective permission set for the current role (legacy fallback)
  const legacyPermissionSet = useMemo(() => {
    const roleKey = (userRole ?? "requester") as UserRoleKey;
    const groups = ROLE_GROUPS_MAP[roleKey] || [];
    const allowed = new Set<string>();
    for (const groupKey of groups) {
      const group = PERMISSION_GROUPS.find((g) => g.key === groupKey);
      if (group) {
        group.permissions.forEach((p) => allowed.add(p));
      }
    }
    return allowed;
  }, [userRole]);

  /**
   * Check if user has a specific permission
   * Uses RBAC context if available, falls back to legacy role-based permissions
   */
  const hasPermission = (permission: string): boolean => {
    // Use RBAC context if available and loaded
    if (rbacContext && !rbacContext.loading) {
      return rbacContext.hasLegacyPermission(permission);
    }

    // Legacy fallback: check against hardcoded role-permission mapping
    return legacyPermissionSet.has(permission) || (userRole === "super_admin");
  };

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    // Use RBAC context if available and loaded
    if (rbacContext && !rbacContext.loading) {
      return rbacContext.hasAnyPermission(permissions);
    }

    // Legacy fallback
    return permissions.some((p) => hasPermission(p));
  };

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    // Use RBAC context if available and loaded
    if (rbacContext && !rbacContext.loading) {
      return rbacContext.hasAllPermissions(permissions);
    }

    // Legacy fallback
    return permissions.every((p) => hasPermission(p));
  };

  /**
   * Check if user can view a specific menu item
   */
  const canViewMenuItem = (menuKey: string): boolean => {
    // Keep public menus visible to all users
    const publicMenus = ["home", "requests", "help", "settings", "hr-assistance"];
    if (publicMenus.includes(menuKey)) return true;

    // Simple rule: admins can see everything
    if (["tenant_admin", "super_admin"].includes(userRole || "")) return true;

    // Otherwise rely on permissions if provided as menu key
    return hasPermission(menuKey);
  };

  /**
   * Check if a feature is enabled
   */
  const hasFeature = (featureKey: string): boolean => {
    return isFeatureEnabled(featureKey as any);
  };

  const getUserFeatures = () => {
    // Not enumerating features here; rely on feature flags hook per check
    return [] as string[];
  };

  /**
   * Get all permissions the user has
   * Returns RBAC permissions when available, falls back to legacy permissions
   */
  const getUserPermissions = (): string[] => {
    // If RBAC context is available and loaded, derive permissions from it
    if (rbacContext && !rbacContext.loading) {
      const permissions: string[] = [];

      // Add permissions from role permissions
      rbacContext.rolePermissions.forEach((rolePerms, key) => {
        const hasAllow = rolePerms.some(rp => rp.effect === 'allow');
        const hasDeny = rolePerms.some(rp => rp.effect === 'deny');
        // Only add if allowed and not denied
        if (hasAllow && !hasDeny) {
          permissions.push(key);
        }
      });

      // Apply user overrides
      rbacContext.userOverrides.forEach((effect, key) => {
        if (effect === 'allow' && !permissions.includes(key)) {
          permissions.push(key);
        } else if (effect === 'deny') {
          const index = permissions.indexOf(key);
          if (index > -1) {
            permissions.splice(index, 1);
          }
        }
      });

      // Super admin has all permissions
      if (rbacContext.isSuperAdmin) {
        rbacContext.allPermissions.forEach(p => {
          const key = `${p.resource}:${p.action}`;
          if (!permissions.includes(key)) {
            permissions.push(key);
          }
        });
      }

      return permissions;
    }

    // Fall back to legacy permission set
    return Array.from(legacyPermissionSet);
  };

  // Determine loading state
  const isLoading = rbacContext?.loading ?? false;

  // Compute user and role permissions for the return value
  const computedPermissions = useMemo(() => {
    if (rbacContext && !rbacContext.loading) {
      const perms = getUserPermissions();
      return {
        userPermissions: perms,
        rolePermissions: perms,
      };
    }
    return {
      userPermissions: Array.from(legacyPermissionSet),
      rolePermissions: Array.from(legacyPermissionSet),
    };
  }, [rbacContext, rbacContext?.loading, rbacContext?.rolePermissions, rbacContext?.userOverrides, legacyPermissionSet]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canViewMenuItem,
    isFeatureEnabled: hasFeature,
    hasFeature,
    getUserFeatures,
    getUserPermissions,
    isLoading,
    userPermissions: computedPermissions.userPermissions,
    rolePermissions: computedPermissions.rolePermissions,
    platformPermissions: [],
  };
}
