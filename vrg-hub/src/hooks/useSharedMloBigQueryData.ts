import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type {
  DateRange,
  WorksiteSummary,
  WorksiteModality,
  PractitionerLocation,
  ReferringPractitioner,
  PractitionerSummary,
  PractitionerDaily,
  OverallStats,
} from "./useMloBigQueryData";

// Re-export types for convenience
export type {
  DateRange,
  WorksiteSummary,
  WorksiteModality,
  PractitionerLocation,
  ReferringPractitioner,
  PractitionerSummary,
  PractitionerDaily,
  OverallStats,
};

// Helper to convert DateRange to params
function dateRangeToParams(dateRange: DateRange): Record<string, unknown> {
  if (dateRange.startDate && dateRange.endDate) {
    return { days: 0, startDate: dateRange.startDate, endDate: dateRange.endDate };
  }
  return { days: dateRange.days };
}

// Shared version that includes shareToken in requests
async function fetchSharedMloData<T>(
  action: string, 
  shareToken: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const { data, error } = await supabase.functions.invoke('mlo-bigquery-performance', {
    body: { action, shareToken, ...params }
  });

  if (error) {
    logger.error('Shared MLO BigQuery fetch error', error);
    throw error;
  }

  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }

  return data.data || [];
}

export function useSharedWorksiteSummary(shareToken: string | null, dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['shared-mlo-bigquery', 'worksite_summary', shareToken, dateRange],
    queryFn: () => fetchSharedMloData<WorksiteSummary>('worksite_summary', shareToken!, dateRangeToParams(dateRange)),
    enabled: !!shareToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSharedWorksiteModality(shareToken: string | null, worksiteKey: string | null, dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['shared-mlo-bigquery', 'worksite_modality', shareToken, worksiteKey, dateRange],
    queryFn: () => fetchSharedMloData<WorksiteModality>('worksite_modality', shareToken!, { worksiteKey, ...dateRangeToParams(dateRange) }),
    enabled: !!shareToken && !!worksiteKey,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSharedOverallModalityStats(shareToken: string | null, dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['shared-mlo-bigquery', 'overall_modality_stats', shareToken, dateRange],
    queryFn: () => fetchSharedMloData<WorksiteModality>('overall_modality_stats', shareToken!, dateRangeToParams(dateRange)),
    enabled: !!shareToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSharedFilteredModalityStats(shareToken: string | null, worksiteKeys: string[], dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['shared-mlo-bigquery', 'filtered_modality_stats', shareToken, worksiteKeys, dateRange],
    queryFn: () => fetchSharedMloData<WorksiteModality>('filtered_modality_stats', shareToken!, { worksiteKeys, ...dateRangeToParams(dateRange) }),
    enabled: !!shareToken && worksiteKeys.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSharedWorksiteReferrers(shareToken: string | null, worksiteKey: string | null, dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['shared-mlo-bigquery', 'worksite_referrers', shareToken, worksiteKey, dateRange],
    queryFn: () => fetchSharedMloData<ReferringPractitioner>('worksite_referrers', shareToken!, { worksiteKey, ...dateRangeToParams(dateRange) }),
    enabled: !!shareToken && !!worksiteKey,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSharedWorksiteLocations(shareToken: string | null, worksiteKey: string | null, dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['shared-mlo-bigquery', 'worksite_locations', shareToken, worksiteKey, dateRange],
    queryFn: () => fetchSharedMloData<PractitionerLocation>('worksite_locations', shareToken!, { worksiteKey, ...dateRangeToParams(dateRange) }),
    enabled: !!shareToken && !!worksiteKey,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSharedLocationReferrers(shareToken: string | null, locationKey: string | null, worksiteKey: string | null, dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['shared-mlo-bigquery', 'location_referrers', shareToken, locationKey, worksiteKey, dateRange],
    queryFn: () => fetchSharedMloData<ReferringPractitioner>('location_referrers', shareToken!, { locationKey, worksiteKey, ...dateRangeToParams(dateRange) }),
    enabled: !!shareToken && !!locationKey && !!worksiteKey,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSharedPractitionerSummary(shareToken: string | null, practitionerKey: string | null, dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['shared-mlo-bigquery', 'practitioner_details', shareToken, practitionerKey, dateRange],
    queryFn: () => fetchSharedMloData<PractitionerSummary>('practitioner_details', shareToken!, { practitionerKey, ...dateRangeToParams(dateRange) }),
    enabled: !!shareToken && !!practitionerKey,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSharedPractitionerDaily(shareToken: string | null, practitionerKey: string | null) {
  return useQuery({
    queryKey: ['shared-mlo-bigquery', 'practitioner_daily', shareToken, practitionerKey],
    queryFn: () => fetchSharedMloData<PractitionerDaily>('practitioner_daily', shareToken!, { practitionerKey }),
    enabled: !!shareToken && !!practitionerKey,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSharedOverallStats(shareToken: string | null, dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['shared-mlo-bigquery', 'overall_stats', shareToken, dateRange],
    queryFn: async () => {
      const data = await fetchSharedMloData<OverallStats>('overall_stats', shareToken!, dateRangeToParams(dateRange));
      return data[0] || { total_patients: 0, total_requests: 0, total_procedures: 0, total_worksites: 0 };
    },
    enabled: !!shareToken,
    staleTime: 5 * 60 * 1000,
  });
}

// Interface for modality targets (matching useMloModalityTargets)
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
  location?: { id: string; name: string };
  modality_type?: {
    id: string;
    key: string;
    name: string;
    icon: string | null;
    sort_order: number;
    is_active: boolean;
  };
  user?: { id: string; full_name: string; email: string };
}

// Shared hook for fetching modality targets via the edge function
export function useSharedMloModalityTargets(
  shareToken: string | null,
  mloId?: string,
  periodStart?: string,
  periodEnd?: string
) {
  return useQuery({
    queryKey: ['shared-mlo-modality-targets', shareToken, mloId, periodStart, periodEnd],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('mlo-bigquery-performance', {
        body: { 
          action: 'get_modality_targets',
          shareToken,
          mloId,
          periodStart,
          periodEnd
        }
      });

      if (error) {
        logger.error('Shared modality targets fetch error', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      return (data.data || []) as MloModalityTarget[];
    },
    // Only fetch targets when we have both a token AND a selected MLO
    enabled: !!shareToken && !!mloId,
    staleTime: 5 * 60 * 1000,
  });
}

// Shared hook for fetching MLO assigned locations via the edge function
export function useSharedMloAssignedLocations(shareToken: string | null, mloId: string | null) {
  return useQuery({
    queryKey: ['shared-mlo-assigned-locations', shareToken, mloId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('mlo-bigquery-performance', {
        body: { 
          action: 'get_mlo_assigned_locations',
          shareToken,
          mloId
        }
      });

      if (error) {
        logger.error('Shared MLO assigned locations fetch error', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      return (data.data || []) as string[];
    },
    enabled: !!shareToken && !!mloId,
    staleTime: 5 * 60 * 1000,
  });
}

// Interface for MLO assignment with location
export interface MloAssignmentWithLocation {
  location: { id: string; name: string } | null;
  user: { id: string; full_name: string | null; email: string | null } | null;
}

// Shared hook for fetching all MLO assignments via the edge function
export function useSharedAllMloAssignments(shareToken: string | null) {
  return useQuery({
    queryKey: ['shared-all-mlo-assignments', shareToken],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('mlo-bigquery-performance', {
        body: { 
          action: 'get_all_mlo_assignments',
          shareToken
        }
      });

      if (error) {
        logger.error('Shared all MLO assignments fetch error', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      return (data.data || []) as MloAssignmentWithLocation[];
    },
    enabled: !!shareToken,
    staleTime: 5 * 60 * 1000,
  });
}
