import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface SyncResult {
  success: boolean;
  action: string;
  eventId?: string;
  webLink?: string;
  error?: string;
}

interface SyncRecord {
  id: string;
  mlo_visit_id: string;
  outlook_event_id: string;
  event_type: string;
  sync_status: string;
  synced_at: string;
}

export function useMloCalendarSync() {
  const queryClient = useQueryClient();

  const syncVisitToCalendar = useMutation({
    mutationFn: async (visitId: string): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke('mlo-calendar-sync', {
        body: { action: 'sync_visit', visitId, eventType: 'follow_up' },
      });

      if (error) {
        throw new Error(error.message || 'Failed to sync calendar');
      }

      if (data.error) {
        if (data.code === 'NOT_CONNECTED') {
          throw new Error('Please connect your Office 365 account first. Go to Integrations to connect.');
        }
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.action === 'created' 
          ? 'Follow-up added to your Outlook calendar' 
          : 'Calendar event updated'
      );
      queryClient.invalidateQueries({ queryKey: ['mlo-calendar-sync'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeSyncFromCalendar = useMutation({
    mutationFn: async (visitId: string): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke('mlo-calendar-sync', {
        body: { action: 'delete_sync', visitId, eventType: 'follow_up' },
      });

      if (error) {
        throw new Error(error.message || 'Failed to remove calendar sync');
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Removed from Outlook calendar');
      queryClient.invalidateQueries({ queryKey: ['mlo-calendar-sync'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const syncFromOutlook = useMutation({
    mutationFn: async (): Promise<{ success: boolean; updates: any[] }> => {
      const { data, error } = await supabase.functions.invoke('mlo-calendar-sync', {
        body: { action: 'sync_from_outlook' },
      });

      if (error) {
        throw new Error(error.message || 'Failed to sync from Outlook');
      }

      return data;
    },
    onSuccess: (data) => {
      const completedCount = data.updates?.filter((u: any) => u.action === 'completed_from_deletion').length || 0;
      if (completedCount > 0) {
        toast.success(`${completedCount} follow-up(s) marked as completed from Outlook changes`);
      } else {
        toast.success('Calendar sync completed');
      }
      queryClient.invalidateQueries({ queryKey: ['mlo-visits'] });
      queryClient.invalidateQueries({ queryKey: ['mlo-follow-ups'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    syncVisitToCalendar,
    removeSyncFromCalendar,
    syncFromOutlook,
    isSyncing: syncVisitToCalendar.isPending || removeSyncFromCalendar.isPending || syncFromOutlook.isPending,
  };
}

export function useVisitSyncStatus(visitId: string | undefined) {
  return useQuery({
    queryKey: ['mlo-calendar-sync', visitId],
    queryFn: async (): Promise<{ synced: boolean; records: SyncRecord[] }> => {
      if (!visitId) return { synced: false, records: [] };

      const { data, error } = await supabase.functions.invoke('mlo-calendar-sync', {
        body: { action: 'check_status', visitId },
      });

      if (error) {
        logger.error('Failed to check sync status', error);
        return { synced: false, records: [] };
      }

      return data;
    },
    enabled: !!visitId,
    staleTime: 30000, // 30 seconds
  });
}

export function useHasOffice365Connection() {
  return useQuery({
    queryKey: ['office365-connection-status'],
    queryFn: async (): Promise<boolean> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('office365_connections')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      return !error && !!data;
    },
    staleTime: 60000, // 1 minute
  });
}
