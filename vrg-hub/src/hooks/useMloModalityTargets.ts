import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

export interface ModalityType {
  id: string;
  key: string;
  name: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface MloModalityTarget {
  id: string;
  user_id: string;
  location_id: string;
  modality_type_id: string;
  target_period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  target_referrals: number;
  target_scans: number;
  target_revenue: number | null;
  set_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  location?: { id: string; name: string };
  modality_type?: ModalityType;
  user?: { id: string; full_name: string; email: string };
}

export interface MloModalityTargetInput {
  user_id: string;
  location_id: string;
  modality_type_id: string;
  target_period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  target_referrals?: number;
  target_scans?: number;
  target_revenue?: number;
  notes?: string;
}

// Fetch all modality types
export function useModalityTypes() {
  return useQuery({
    queryKey: ['modality-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modality_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data as ModalityType[];
    },
  });
}

// Fetch modality targets for a specific user
export function useMloModalityTargets(
  userId?: string,
  locationId?: string,
  periodStart?: string,
  periodEnd?: string
) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['mlo-modality-targets', targetUserId, locationId, periodStart, periodEnd],
    queryFn: async () => {
      if (!targetUserId) return [];

      let query = supabase
        .from('mlo_modality_targets')
        .select(`
          *,
          location:locations(id, name),
          modality_type:modality_types(*),
          user:profiles!mlo_modality_targets_user_id_fkey(id, full_name, email)
        `)
        .eq('user_id', targetUserId);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }
      if (periodStart) {
        query = query.gte('period_end', periodStart);
      }
      if (periodEnd) {
        query = query.lte('period_start', periodEnd);
      }

      const { data, error } = await query.order('period_start', { ascending: false });

      if (error) throw error;
      return data as MloModalityTarget[];
    },
    enabled: !!targetUserId,
  });
}

// Fetch all modality targets (manager view)
export function useAllMloModalityTargets(
  locationId?: string,
  periodStart?: string,
  periodEnd?: string
) {
  return useQuery({
    queryKey: ['mlo-modality-targets-all', locationId, periodStart, periodEnd],
    queryFn: async () => {
      logger.debug('[MLO Targets] Fetching all targets with params', { locationId, periodStart, periodEnd });
      
      let query = supabase
        .from('mlo_modality_targets')
        .select(`
          *,
          location:locations(id, name),
          modality_type:modality_types(*),
          user:profiles!mlo_modality_targets_user_id_fkey(id, full_name, email)
        `);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }
      if (periodStart) {
        query = query.gte('period_end', periodStart);
      }
      if (periodEnd) {
        query = query.lte('period_start', periodEnd);
      }

      const { data, error } = await query.order('period_start', { ascending: false });

      logger.debug('[MLO Targets] Query result', { count: data?.length, error: error?.message });
      if (error) throw error;
      return data as MloModalityTarget[];
    },
  });
}

// Create a new modality target
export function useCreateMloModalityTarget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: MloModalityTargetInput) => {
      const { data, error } = await supabase
        .from('mlo_modality_targets')
        .insert({
          ...input,
          set_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-modality-targets'] });
      queryClient.invalidateQueries({ queryKey: ['mlo-modality-targets-all'] });
    },
  });
}

// Update an existing modality target
export function useUpdateMloModalityTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MloModalityTargetInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('mlo_modality_targets')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-modality-targets'] });
      queryClient.invalidateQueries({ queryKey: ['mlo-modality-targets-all'] });
    },
  });
}

// Delete a modality target
export function useDeleteMloModalityTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mlo_modality_targets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-modality-targets'] });
      queryClient.invalidateQueries({ queryKey: ['mlo-modality-targets-all'] });
    },
  });
}

// Bulk upsert modality targets (useful for setting targets across multiple modalities at once)
export function useBulkUpsertMloModalityTargets() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (inputs: MloModalityTargetInput[]) => {
      const targetsWithSetBy = inputs.map(input => ({
        ...input,
        set_by: user?.id,
      }));

      const { data, error } = await supabase
        .from('mlo_modality_targets')
        .upsert(targetsWithSetBy, {
          onConflict: 'user_id,location_id,modality_type_id,target_period,period_start',
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-modality-targets'] });
      queryClient.invalidateQueries({ queryKey: ['mlo-modality-targets-all'] });
    },
  });
}
