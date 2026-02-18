import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface MloAssignment {
  id: string;
  user_id: string;
  location_id: string;
  is_primary: boolean;
  assigned_by: string | null;
  assigned_at: string;
  notes: string | null;
  location?: {
    id: string;
    name: string;
    brand_id: string;
    brand?: {
      name: string;
      display_name: string;
    };
  };
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface MloTarget {
  id: string;
  user_id: string;
  location_id: string | null;
  target_period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  target_visits: number;
  target_new_referrers: number;
  target_revenue: number | null;
  set_by: string | null;
  notes: string | null;
  created_at: string;
  location?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface MloVisit {
  id: string;
  user_id: string;
  visit_date: string;
  visit_time: string | null;
  visit_type: 'site_visit' | 'phone_call' | 'video_call' | 'email' | 'event' | 'other';
  clinic_key: number | null;
  referrer_key: number | null;
  location_id: string | null;
  contact_name: string | null;
  contact_role: string | null;
  purpose: string | null;
  outcome: 'positive' | 'neutral' | 'follow_up_required' | 'issue_raised' | 'no_contact' | null;
  notes: string | null;
  follow_up_date: string | null;
  follow_up_time: string | null;
  follow_up_location: string | null;
  follow_up_notes: string | null;
  follow_up_completed: boolean;
  brand_id: string | null;
  created_at: string;
  updated_at: string;
  location?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface MloVisitInput {
  visit_date: string;
  visit_time?: string | null;
  visit_type: MloVisit['visit_type'];
  clinic_key?: number | null;
  referrer_key?: number | null;
  location_id?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  purpose?: string | null;
  outcome?: MloVisit['outcome'] | null;
  notes?: string | null;
  follow_up_date?: string | null;
  follow_up_time?: string | null;
  follow_up_location?: string | null;
  follow_up_notes?: string | null;
  brand_id?: string | null;
}

// Hook to get current user's MLO assignments
export function useMloAssignments(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['mlo-assignments', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      
      const { data, error } = await supabase
        .from('mlo_assignments')
        .select(`
          *,
          location:locations(id, name, brand_id, brand:brands(name, display_name)),
          user:profiles!mlo_assignments_user_id_fkey(id, full_name, email)
        `)
        .eq('user_id', targetUserId)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      return data as MloAssignment[];
    },
    enabled: !!targetUserId,
  });
}

// Hook to get all MLO assignments (for managers)
export function useAllMloAssignments() {
  return useQuery({
    queryKey: ['mlo-assignments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mlo_assignments')
        .select(`
          *,
          location:locations(id, name, brand_id, brand:brands(name, display_name)),
          user:profiles!mlo_assignments_user_id_fkey(id, full_name, email)
        `)
        .order('user_id');

      if (error) throw error;
      return data as MloAssignment[];
    },
  });
}

// Hook to get MLO targets
export function useMloTargets(userId?: string, periodStart?: string, periodEnd?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['mlo-targets', targetUserId, periodStart, periodEnd],
    queryFn: async () => {
      if (!targetUserId) return [];
      
      let query = supabase
        .from('mlo_targets')
        .select(`
          *,
          location:locations(id, name),
          user:profiles!mlo_targets_user_id_fkey(id, full_name, email)
        `)
        .eq('user_id', targetUserId);

      if (periodStart) {
        query = query.gte('period_end', periodStart);
      }
      if (periodEnd) {
        query = query.lte('period_start', periodEnd);
      }

      const { data, error } = await query.order('period_start', { ascending: false });

      if (error) throw error;
      return data as MloTarget[];
    },
    enabled: !!targetUserId,
  });
}

// Hook to get all MLO targets (for managers)
export function useAllMloTargets(periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['mlo-targets-all', periodStart, periodEnd],
    queryFn: async () => {
      let query = supabase
        .from('mlo_targets')
        .select(`
          *,
          location:locations(id, name),
          user:profiles!mlo_targets_user_id_fkey(id, full_name, email)
        `);

      if (periodStart) {
        query = query.gte('period_end', periodStart);
      }
      if (periodEnd) {
        query = query.lte('period_start', periodEnd);
      }

      const { data, error } = await query.order('period_start', { ascending: false });

      if (error) throw error;
      return data as MloTarget[];
    },
  });
}

// Hook to get MLO visits
export function useMloVisits(userId?: string, dateRange?: { start: string; end: string }) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['mlo-visits', targetUserId, dateRange],
    queryFn: async () => {
      if (!targetUserId) return [];
      
      let query = supabase
        .from('mlo_visits')
        .select(`
          *,
          location:locations(id, name),
          user:profiles!mlo_visits_user_id_fkey(id, full_name, email)
        `)
        .eq('user_id', targetUserId);

      if (dateRange?.start) {
        query = query.gte('visit_date', dateRange.start);
      }
      if (dateRange?.end) {
        query = query.lte('visit_date', dateRange.end);
      }

      const { data, error } = await query.order('visit_date', { ascending: false });

      if (error) throw error;
      return data as MloVisit[];
    },
    enabled: !!targetUserId,
  });
}

// Hook to get all MLO visits (for managers)
export function useAllMloVisits(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: ['mlo-visits-all', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('mlo_visits')
        .select(`
          *,
          location:locations(id, name),
          user:profiles!mlo_visits_user_id_fkey(id, full_name, email)
        `);

      if (dateRange?.start) {
        query = query.gte('visit_date', dateRange.start);
      }
      if (dateRange?.end) {
        query = query.lte('visit_date', dateRange.end);
      }

      const { data, error } = await query.order('visit_date', { ascending: false });

      if (error) throw error;
      return data as MloVisit[];
    },
  });
}

// Hook to get upcoming follow-ups
export function useMloFollowUps(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['mlo-follow-ups', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      
      const { data, error } = await supabase
        .from('mlo_visits')
        .select(`
          *,
          location:locations(id, name)
        `)
        .eq('user_id', targetUserId)
        .eq('follow_up_completed', false)
        .not('follow_up_date', 'is', null)
        .gte('follow_up_date', new Date().toISOString().split('T')[0])
        .order('follow_up_date', { ascending: true });

      if (error) throw error;
      return data as MloVisit[];
    },
    enabled: !!targetUserId,
  });
}

// Mutation to create a visit
export function useCreateMloVisit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: MloVisitInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('mlo_visits')
        .insert({
          ...input,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Auto-sync to calendar if visit has a follow-up date
      if (data && input.follow_up_date) {
        try {
          const { data: syncResult, error: syncError } = await supabase.functions.invoke('mlo-calendar-sync', {
            body: { action: 'sync_visit', visitId: data.id, eventType: 'follow_up' },
          });
          
          if (syncError) {
            logger.error('Calendar sync error', syncError);
          } else if (syncResult?.error) {
            // Don't show error toast for NOT_CONNECTED - user just hasn't connected Office 365 yet
            if (syncResult.code !== 'NOT_CONNECTED') {
              logger.error('Calendar sync failed', syncResult.error);
            }
          } else if (syncResult?.success) {
            toast.success('Follow-up added to your Outlook calendar');
          }
        } catch (err) {
          logger.error('Calendar sync exception', err);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-visits'] });
      queryClient.invalidateQueries({ queryKey: ['mlo-follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['mlo-calendar-sync'] });
      toast.success('Visit logged successfully');
    },
    onError: (error) => {
      logger.error('Error creating visit', error);
      toast.error('Failed to log visit');
    },
  });
}

// Mutation to update a visit
export function useUpdateMloVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<MloVisit> & { id: string }) => {
      const { data, error } = await supabase
        .from('mlo_visits')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-visits'] });
      queryClient.invalidateQueries({ queryKey: ['mlo-follow-ups'] });
      toast.success('Visit updated successfully');
    },
    onError: (error) => {
      logger.error('Error updating visit', error);
      toast.error('Failed to update visit');
    },
  });
}

// Mutation to mark follow-up as completed
export function useCompleteFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visitId: string) => {
      const { data, error } = await supabase
        .from('mlo_visits')
        .update({ follow_up_completed: true })
        .eq('id', visitId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-visits'] });
      queryClient.invalidateQueries({ queryKey: ['mlo-follow-ups'] });
      toast.success('Follow-up marked as complete');
    },
    onError: (error) => {
      logger.error('Error completing follow-up', error);
      toast.error('Failed to complete follow-up');
    },
  });
}

// Hook to get MLO performance stats
export function useMloPerformanceStats(userId?: string, periodStart?: string, periodEnd?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  const visitsQuery = useMloVisits(targetUserId, periodStart && periodEnd ? { start: periodStart, end: periodEnd } : undefined);
  const targetsQuery = useMloTargets(targetUserId, periodStart, periodEnd);

  const stats = {
    totalVisits: visitsQuery.data?.length || 0,
    visitsByType: {} as Record<string, number>,
    visitsByOutcome: {} as Record<string, number>,
    targetVisits: 0,
    targetProgress: 0,
    pendingFollowUps: 0,
  };

  if (visitsQuery.data) {
    visitsQuery.data.forEach((visit) => {
      stats.visitsByType[visit.visit_type] = (stats.visitsByType[visit.visit_type] || 0) + 1;
      if (visit.outcome) {
        stats.visitsByOutcome[visit.outcome] = (stats.visitsByOutcome[visit.outcome] || 0) + 1;
      }
      if (!visit.follow_up_completed && visit.follow_up_date) {
        stats.pendingFollowUps++;
      }
    });
  }

  if (targetsQuery.data?.length) {
    stats.targetVisits = targetsQuery.data.reduce((sum, t) => sum + (t.target_visits || 0), 0);
    stats.targetProgress = stats.targetVisits > 0 
      ? Math.round((stats.totalVisits / stats.targetVisits) * 100) 
      : 0;
  }

  return {
    stats,
    isLoading: visitsQuery.isLoading || targetsQuery.isLoading,
    error: visitsQuery.error || targetsQuery.error,
  };
}
