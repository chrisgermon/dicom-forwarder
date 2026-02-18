import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface MloOutlookEvent {
  id: string;
  user_id: string;
  outlook_event_id: string;
  subject: string | null;
  start_datetime: string;
  end_datetime: string;
  location: string | null;
  body_preview: string | null;
  web_link: string | null;
  last_modified: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export function useMloOutlookEvents() {
  return useQuery({
    queryKey: ['mlo-outlook-events'],
    queryFn: async (): Promise<MloOutlookEvent[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('mlo_outlook_events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_datetime', { ascending: true });

      if (error) {
        logger.error('Error fetching Outlook events', error);
        return [];
      }

      return data || [];
    },
  });
}

export function useUpcomingOutlookEvents(limit = 5) {
  return useQuery({
    queryKey: ['mlo-outlook-events-upcoming', limit],
    queryFn: async (): Promise<MloOutlookEvent[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('mlo_outlook_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_datetime', now)
        .order('start_datetime', { ascending: true })
        .limit(limit);

      if (error) {
        logger.error('Error fetching upcoming Outlook events', error);
        return [];
      }

      return data || [];
    },
  });
}
