import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

/**
 * Hook to check if the current user has MLO/Marketing Manager role
 * Marketing Managers can view all MLO data across all users
 */
export function useMloRole() {
  const { user } = useAuth();

  const { data: isMloManager = false, isLoading } = useQuery({
    queryKey: ['mlo-manager-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      // Check if user has marketing_manager role in rbac_user_roles
      const { data, error } = await supabase
        .from('rbac_user_roles')
        .select(`
          role:rbac_roles(name)
        `)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Error checking MLO role', error);
        return false;
      }

      const roleNames = data?.map(item => item.role?.name).filter(Boolean) || [];
      
      // Marketing manager or any admin role can view all MLO data
      return roleNames.some(role => 
        role === 'marketing_manager' || 
        role === 'super_admin' || 
        role === 'tenant_admin' ||
        role === 'manager'
      );
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: isMlo = false, isLoading: isMloLoading } = useQuery({
    queryKey: ['mlo-role-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from('rbac_user_roles')
        .select(`
          role:rbac_roles(name)
        `)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Error checking MLO role', error);
        return false;
      }

      const roleNames = data?.map(item => item.role?.name).filter(Boolean) || [];
      // marketing role = MLO, marketing_manager = MLO Manager
      return roleNames.includes('marketing') || roleNames.includes('marketing_manager');
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isMloManager,
    isMlo,
    isLoading: isLoading || isMloLoading,
  };
}
