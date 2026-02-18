import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface PermissionCheckResult {
  allowed: boolean;
  trace?: Array<{
    step: string;
    result: 'allow' | 'deny' | 'skip';
    reason: string;
  }>;
}

export function useRBACPermissions() {
  const checkPermission = useCallback(async (
    resource: string,
    action: string,
    options?: {
      userId?: string;
      includeTrace?: boolean;
    }
  ): Promise<PermissionCheckResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('rbac-check-permission', {
        body: {
          resource,
          action,
          userId: options?.userId,
          includeTrace: options?.includeTrace || false,
        },
      });

      if (error) throw error;

      return data as PermissionCheckResult;
    } catch (error) {
      logger.error('Permission check error', error);
      return { allowed: false };
    }
  }, []);

  const checkPermissions = useCallback(async (
    checks: Array<{ resource: string; action: string }>
  ): Promise<Record<string, boolean>> => {
    const results = await Promise.all(
      checks.map(async ({ resource, action }) => {
        const result = await checkPermission(resource, action);
        return [`${resource}:${action}`, result.allowed];
      })
    );

    return Object.fromEntries(results);
  }, [checkPermission]);

  return {
    checkPermission,
    checkPermissions,
  };
}
