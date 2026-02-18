import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type FeatureKey = 
  | 'hardware_requests'
  | 'toner_requests'
  | 'user_accounts'
  | 'marketing_requests'
  | 'department_requests'
  | 'monthly_newsletter'
  | 'modality_management'
  | 'print_ordering'
  | 'fax_campaigns'
  | 'knowledge_base'
  | 'approvals';

export function useCompanyFeatures() {
  const { data: featureFlags, isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*');

      if (error) throw error;
      return data || [];
    },
  });

  const isFeatureEnabled = (featureKey: FeatureKey): boolean => {
    if (!featureFlags) return true; // Default to enabled while loading
    const flag = featureFlags.find(f => f.feature_key === featureKey);
    return flag ? flag.is_enabled : true;
  };

  const features = featureFlags?.reduce((acc, flag) => {
    acc[flag.feature_key as FeatureKey] = flag.is_enabled;
    return acc;
  }, {} as Record<FeatureKey, boolean>) || {} as Record<FeatureKey, boolean>;

  return {
    isFeatureEnabled,
    features,
    loading: isLoading,
    refreshFeatures: async () => {},
  };
}
