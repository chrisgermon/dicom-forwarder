import { ReactNode, useContext } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { RBACContext } from "@/contexts/RBACContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Loader2 } from "lucide-react";

/**
 * Permission specification - can be a legacy string or resource:action object
 */
type PermissionSpec = string | { resource: string; action: string };

interface PermissionGuardProps {
  /**
   * Permission key(s) required to view content
   * Can be:
   * - Legacy string: "create_hardware_request"
   * - RBAC format: { resource: "hardware", action: "create" }
   * - Array of either/both
   */
  permission?: PermissionSpec | PermissionSpec[];
  /** Feature key required to view content */
  feature?: string;
  /** If true, requires ALL permissions. If false, requires ANY permission */
  requireAll?: boolean;
  /** Content to show when user has permission */
  children: ReactNode;
  /** Custom fallback to show when user doesn't have permission */
  fallback?: ReactNode;
  /** If true, shows nothing instead of fallback when permission denied */
  hideOnDenied?: boolean;
  /** Show loading state while permissions are being loaded */
  showLoading?: boolean;
}

/**
 * Component that guards content based on permissions and features.
 * Supports both legacy permission strings and new RBAC resource:action format.
 *
 * @example
 * // Check single legacy permission
 * <PermissionGuard permission="create_hardware_request">
 *   <Button>Create Request</Button>
 * </PermissionGuard>
 *
 * @example
 * // Check single RBAC permission
 * <PermissionGuard permission={{ resource: "hardware", action: "create" }}>
 *   <Button>Create Request</Button>
 * </PermissionGuard>
 *
 * @example
 * // Check multiple permissions (any)
 * <PermissionGuard permission={[
 *   { resource: "hardware", action: "approve" },
 *   { resource: "marketing", action: "approve" }
 * ]}>
 *   <ApprovalButton />
 * </PermissionGuard>
 *
 * @example
 * // Mixed legacy and RBAC permissions
 * <PermissionGuard permission={["approve_hardware_requests", { resource: "marketing", action: "approve" }]}>
 *   <ApprovalButton />
 * </PermissionGuard>
 *
 * @example
 * // Check feature flag
 * <PermissionGuard feature="hardware_requests">
 *   <HardwareRequestsSection />
 * </PermissionGuard>
 *
 * @example
 * // Hide completely when denied
 * <PermissionGuard permission="manage_users" hideOnDenied>
 *   <AdminPanel />
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  feature,
  requireAll = false,
  children,
  fallback,
  hideOnDenied = false,
  showLoading = false,
}: PermissionGuardProps) {
  const { hasPermission: hasLegacyPermission, hasFeature, isLoading: permissionsLoading } = usePermissions();

  // Safely access RBAC context using useContext directly (returns undefined if not available)
  const rbacContext = useContext(RBACContext);

  const isLoading = rbacContext?.loading ?? permissionsLoading;

  // Show loading state if requested
  if (showLoading && isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Loading permissions...</span>
      </div>
    );
  }

  // Still loading permissions - hide content
  if (isLoading) {
    return null;
  }

  // Check feature flag if specified
  if (feature && !hasFeature(feature)) {
    if (hideOnDenied) return null;
    return fallback || (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          This feature is not enabled for your company.
        </AlertDescription>
      </Alert>
    );
  }

  /**
   * Check a single permission (legacy or RBAC format)
   */
  const checkPermission = (perm: PermissionSpec): boolean => {
    if (typeof perm === 'string') {
      // Legacy permission string
      if (rbacContext && !rbacContext.loading) {
        return rbacContext.hasLegacyPermission(perm);
      }
      return hasLegacyPermission(perm);
    } else {
      // RBAC resource:action format
      if (rbacContext && !rbacContext.loading) {
        return rbacContext.hasPermission(perm.resource, perm.action);
      }
      // If no RBAC context, try to convert to legacy format
      const legacyKey = `${perm.action}_${perm.resource}`;
      return hasLegacyPermission(legacyKey);
    }
  };

  // Check permissions
  if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];
    const hasAccess = requireAll
      ? permissions.every(p => checkPermission(p))
      : permissions.some(p => checkPermission(p));

    if (!hasAccess) {
      if (hideOnDenied) return null;
      return fallback || (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this.
          </AlertDescription>
        </Alert>
      );
    }
  }

  return <>{children}</>;
}

/**
 * HOC version of PermissionGuard for wrapping entire page components
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: PermissionSpec | PermissionSpec[],
  options?: { requireAll?: boolean; feature?: string }
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGuard
        permission={permission}
        feature={options?.feature}
        requireAll={options?.requireAll}
      >
        <Component {...props} />
      </PermissionGuard>
    );
  };
}

/**
 * Hook-based permission check for conditional rendering
 * Returns a function to check permissions in render logic
 */
export function usePermissionCheck() {
  const { hasPermission: hasLegacyPermission, isLoading: permissionsLoading } = usePermissions();

  // Safely access RBAC context using useContext directly (returns undefined if not available)
  const rbacContext = useContext(RBACContext);

  const checkPermission = (perm: PermissionSpec): boolean => {
    if (typeof perm === 'string') {
      if (rbacContext && !rbacContext.loading) {
        return rbacContext.hasLegacyPermission(perm);
      }
      return hasLegacyPermission(perm);
    } else {
      if (rbacContext && !rbacContext.loading) {
        return rbacContext.hasPermission(perm.resource, perm.action);
      }
      const legacyKey = `${perm.action}_${perm.resource}`;
      return hasLegacyPermission(legacyKey);
    }
  };

  const checkAny = (perms: PermissionSpec[]): boolean => {
    return perms.some(p => checkPermission(p));
  };

  const checkAll = (perms: PermissionSpec[]): boolean => {
    return perms.every(p => checkPermission(p));
  };

  return {
    check: checkPermission,
    checkAny,
    checkAll,
    isLoading: rbacContext?.loading ?? permissionsLoading,
  };
}
