import { useCallback, useMemo } from "react";
import { useAuth } from "./useAuth";
import { usePermissions } from "./usePermissions";
import {
  DEFAULT_TENANT_ROLE,
  RoleDefinition,
  UserRoleKey,
  getAssignableRoles,
  getRoleDefinition,
} from "@/lib/access-control";

interface UseAccessControlOptions {
  /** Force the hook to resolve permissions for a specific company. */
  companyId?: string;
}

export function useAccessControl(options: UseAccessControlOptions = {}) {
  const { userRole: rawUserRole, profile } = useAuth();

  const tenantCompanyId = (profile as any)?.company_id ?? undefined;
  const actingRole = rawUserRole as UserRoleKey | null;
  const isSuperAdmin = actingRole === "super_admin";
  const isTenantAdmin = actingRole === "tenant_admin";
  const scope = isSuperAdmin ? "platform" : "tenant";

  const companyId = useMemo(() => {
    if (isSuperAdmin) {
      return options.companyId ?? tenantCompanyId;
    }
    return tenantCompanyId;
  }, [isSuperAdmin, options.companyId, tenantCompanyId]);

  const permissions = usePermissions({ companyId });

  const availableRoles: RoleDefinition[] = useMemo(
    () => getAssignableRoles(actingRole),
    [actingRole]
  );

  const canManageRole = useCallback(
    (targetRole: UserRoleKey) => {
      if (!actingRole) return false;
      const definition = getRoleDefinition(targetRole);
      if (!definition) return false;
      return definition.assignableBy.includes(actingRole);
    },
    [actingRole]
  );

  const canAccessCompany = useCallback(
    (targetCompanyId?: string | null) => {
      if (isSuperAdmin) return true;
      if (!targetCompanyId) return false;
      return targetCompanyId === tenantCompanyId;
    },
    [isSuperAdmin, tenantCompanyId]
  );

  return {
    scope,
    userRole: actingRole,
    isSuperAdmin,
    isTenantAdmin,
    tenantCompanyId,
    companyId,
    availableRoles,
    canManageRole,
    canAccessCompany,
    defaultTenantRole: DEFAULT_TENANT_ROLE,
    ...permissions,
  };
}
