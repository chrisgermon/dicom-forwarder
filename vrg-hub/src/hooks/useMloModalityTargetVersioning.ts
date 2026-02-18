import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';
import type { MloModalityTargetInput } from './useMloModalityTargets';

interface VersionedUpdateInput {
  id: string;
  target_scans?: number;
  target_referrals?: number;
  target_revenue?: number;
  notes?: string;
  effective_date?: string; // Date from which the new target applies (defaults to today)
}

/**
 * Hook for updating MLO modality targets with versioning.
 * Instead of overwriting the existing target, this creates a new version
 * so historical data remains accurate.
 * 
 * When a target is updated:
 * 1. The existing target's period_end is set to the day before the effective date
 * 2. A new target is created starting from the effective date
 * 3. An audit record is logged
 */
export function useVersionedMloModalityTargetUpdate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, effective_date, ...updates }: VersionedUpdateInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get the current target
      const { data: currentTarget, error: fetchError } = await supabase
        .from('mlo_modality_targets')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!currentTarget) throw new Error('Target not found');

      const effectiveDate = effective_date || format(new Date(), 'yyyy-MM-dd');
      const previousDay = format(subDays(new Date(effectiveDate), 1), 'yyyy-MM-dd');

      // Don't create a version if the effective date is before or on the target's start date
      // In that case, just update the existing target
      if (new Date(effectiveDate) <= new Date(currentTarget.period_start)) {
        const { data: updatedTarget, error: updateError } = await supabase
          .from('mlo_modality_targets')
          .update({
            target_scans: updates.target_scans ?? currentTarget.target_scans,
            target_referrals: updates.target_referrals ?? currentTarget.target_referrals,
            target_revenue: updates.target_revenue ?? currentTarget.target_revenue,
            notes: updates.notes ?? currentTarget.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Log to audit
        await supabase.from('mlo_modality_target_audit').insert({
          target_id: id,
          user_id: currentTarget.user_id,
          location_id: currentTarget.location_id,
          modality_type_id: currentTarget.modality_type_id,
          target_period: currentTarget.target_period,
          period_start: currentTarget.period_start,
          period_end: currentTarget.period_end,
          target_referrals: updates.target_referrals ?? currentTarget.target_referrals,
          target_scans: updates.target_scans ?? currentTarget.target_scans,
          target_revenue: updates.target_revenue ?? currentTarget.target_revenue,
          action: 'updated',
          changed_by: user.id,
          old_values: {
            target_scans: currentTarget.target_scans,
            target_referrals: currentTarget.target_referrals,
            target_revenue: currentTarget.target_revenue,
          },
          new_values: {
            target_scans: updates.target_scans ?? currentTarget.target_scans,
            target_referrals: updates.target_referrals ?? currentTarget.target_referrals,
            target_revenue: updates.target_revenue ?? currentTarget.target_revenue,
          },
          notes: `Direct update - effective date before target start`,
        });

        return updatedTarget;
      }

      // Step 1: Update the old target to end on the day before effective date
      const { error: endDateError } = await supabase
        .from('mlo_modality_targets')
        .update({
          period_end: previousDay,
          is_current: false,
          superseded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (endDateError) throw endDateError;

      // Step 2: Create a new target starting from effective date
      const targetPeriod = currentTarget.target_period as 'weekly' | 'monthly' | 'quarterly' | 'yearly';
      const newTargetData: MloModalityTargetInput = {
        user_id: currentTarget.user_id,
        location_id: currentTarget.location_id,
        modality_type_id: currentTarget.modality_type_id,
        target_period: targetPeriod,
        period_start: effectiveDate,
        period_end: currentTarget.period_end, // Keep the original end date
        target_referrals: updates.target_referrals ?? currentTarget.target_referrals,
        target_scans: updates.target_scans ?? currentTarget.target_scans,
        target_revenue: updates.target_revenue ?? currentTarget.target_revenue,
        notes: updates.notes ?? currentTarget.notes,
      };

      const { data: newTarget, error: createError } = await supabase
        .from('mlo_modality_targets')
        .insert({
          ...newTargetData,
          set_by: user.id,
          version: (currentTarget.version || 1) + 1,
          is_current: true,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Step 3: Link the old target to the new one
      await supabase
        .from('mlo_modality_targets')
        .update({ superseded_by: newTarget.id })
        .eq('id', id);

      // Step 4: Log to audit table
      await supabase.from('mlo_modality_target_audit').insert({
        target_id: newTarget.id,
        user_id: currentTarget.user_id,
        location_id: currentTarget.location_id,
        modality_type_id: currentTarget.modality_type_id,
        target_period: currentTarget.target_period,
        period_start: effectiveDate,
        period_end: currentTarget.period_end,
        target_referrals: newTargetData.target_referrals || 0,
        target_scans: newTargetData.target_scans || 0,
        target_revenue: newTargetData.target_revenue,
        action: 'superseded',
        changed_by: user.id,
        old_values: {
          target_scans: currentTarget.target_scans,
          target_referrals: currentTarget.target_referrals,
          target_revenue: currentTarget.target_revenue,
          period_start: currentTarget.period_start,
          period_end: currentTarget.period_end,
        },
        new_values: {
          target_scans: newTargetData.target_scans,
          target_referrals: newTargetData.target_referrals,
          target_revenue: newTargetData.target_revenue,
          period_start: effectiveDate,
          period_end: currentTarget.period_end,
        },
        notes: `Target updated effective ${effectiveDate}. Previous target (${id}) now ends ${previousDay}.`,
      });

      return newTarget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-modality-targets'] });
      queryClient.invalidateQueries({ queryKey: ['mlo-modality-targets-all'] });
    },
  });
}

/**
 * Hook to fetch audit history for a specific target or MLO
 */
export function useMloTargetAuditHistory(targetId?: string, userId?: string) {
  return {
    queryKey: ['mlo-target-audit', targetId, userId],
    queryFn: async () => {
      let query = supabase
        .from('mlo_modality_target_audit')
        .select('*')
        .order('changed_at', { ascending: false });

      if (targetId) {
        query = query.eq('target_id', targetId);
      }
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  };
}
