import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdvanceNoticeOption {
  id: string;
  days: number;
  label: string;
  is_active: boolean;
  sort_order: number;
}

export function useAdvanceNoticeOptions() {
  return useQuery({
    queryKey: ['advance-notice-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_advance_notice_options')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data as AdvanceNoticeOption[];
    },
  });
}
