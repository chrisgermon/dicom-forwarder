import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const IMPERSONATION_STORAGE_KEY = 'user_impersonation';

interface ImpersonatedUser {
  id: string;
  email: string;
  full_name: string;
  role: string | null;
}

export function useUserImpersonation(actualUserRole: string | null) {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load impersonated user from localStorage on mount
  useEffect(() => {
    const loadImpersonation = async () => {
      const stored = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
      if (stored && actualUserRole === 'super_admin') {
        try {
          const userId = JSON.parse(stored);
          // Fetch the user's full details including role from user_roles
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('id', userId)
            .single();
          
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .single();
          
          if (profile) {
            setImpersonatedUser({
              ...profile,
              role: roleData?.role || null
            });
          } else {
            localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
          }
        } catch (error) {
          logger.error('Failed to load impersonated user', error);
          localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
        }
      }
      setIsLoading(false);
    };

    loadImpersonation();
  }, [actualUserRole]);

  const impersonateUser = async (userId: string | null) => {
    if (actualUserRole !== 'super_admin') {
      logger.warn('Only super admins can impersonate users');
      return;
    }

    if (userId) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('id', userId)
          .single();
        
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();
        
        if (profile) {
          localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(userId));
          setImpersonatedUser({
            ...profile,
            role: roleData?.role || null
          });
        }
      } catch (error) {
        logger.error('Failed to impersonate user', error);
      }
    } else {
      localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      setImpersonatedUser(null);
    }
  };

  const clearImpersonation = () => {
    localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    setImpersonatedUser(null);
  };

  return {
    impersonatedUser,
    impersonateUser,
    clearImpersonation,
    isImpersonating: impersonatedUser !== null,
    isLoading,
  };
}
