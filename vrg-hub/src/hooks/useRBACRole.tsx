import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';

export function useRBACRole() {
  const { user } = useAuth();
  const [rbacRoles, setRbacRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user?.id) {
        setRbacRoles([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('rbac_user_roles')
          .select(`
            role:rbac_roles(name)
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        const roleNames = (data || [])
          .map(item => item.role?.name)
          .filter(Boolean) as string[];

        setRbacRoles(roleNames);
      } catch (error) {
        logger.error('Error fetching RBAC roles', error);
        setRbacRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user?.id]);

  const hasRole = (roleName: string) => {
    return rbacRoles.includes(roleName);
  };

  const hasAnyRole = (roleNames: string[]) => {
    return roleNames.some(role => rbacRoles.includes(role));
  };

  return {
    rbacRoles,
    loading,
    hasRole,
    hasAnyRole,
    isSuperAdmin: hasRole('super_admin'),
    isTenantAdmin: hasRole('tenant_admin'),
    isManager: hasRole('manager'),
  };
}
