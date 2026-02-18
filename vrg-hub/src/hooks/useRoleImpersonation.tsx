import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';

const IMPERSONATION_STORAGE_KEY = 'role_impersonation';

type UserRole = 'requester' | 'manager' | 'marketing_manager' | 'tenant_admin' | 'super_admin' | 'marketing';

export function useRoleImpersonation() {
  const { userRole: actualRole } = useAuth();
  const [impersonatedRole, setImpersonatedRole] = useState<UserRole | null>(null);

  // Load impersonated role from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (stored && actualRole === 'super_admin') {
      setImpersonatedRole(stored as UserRole);
    }
  }, [actualRole]);

  const impersonateRole = (role: UserRole | null) => {
    if (actualRole !== 'super_admin') {
      logger.warn('Only super admins can impersonate roles');
      return;
    }

    if (role) {
      localStorage.setItem(IMPERSONATION_STORAGE_KEY, role);
      setImpersonatedRole(role);
    } else {
      localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      setImpersonatedRole(null);
    }
  };

  const clearImpersonation = () => {
    localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    setImpersonatedRole(null);
  };

  // Return the effective role (impersonated if set, otherwise actual)
  const effectiveRole = actualRole === 'super_admin' && impersonatedRole 
    ? impersonatedRole 
    : actualRole;

  return {
    actualRole,
    impersonatedRole,
    effectiveRole,
    impersonateRole,
    clearImpersonation,
    isImpersonating: impersonatedRole !== null,
  };
}
