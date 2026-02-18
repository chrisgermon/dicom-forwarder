import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface DateRange {
  days: number;
  startDate?: string;
  endDate?: string;
}

export interface WorksiteSummary {
  WorkSiteKey: string;
  WorkSiteName: string;
  total_patients: number;
  total_requests: number;
  total_procedures: number;
  first_request: string;
  last_request: string;
}

export interface WorksiteModality {
  Modality: string;
  procedure_count: number;
  patient_count: number;
}

export interface PractitionerLocation {
  LocationKey: string;
  LocationCode: string | null;
  LocationName: string;
  LocationDescription: string | null;
  practitioner_count: number;
  total_patients: number;
  total_requests: number;
  total_procedures: number;
  last_referral: string;
}

export interface ReferringPractitioner {
  PractitionerKey: string;
  PractitionerCode: string | null;
  PractitionerName: string;
  total_patients: number;
  total_requests: number;
  total_procedures: number;
  last_referral: string;
}

export interface PractitionerSummary {
  PractitionerKey: string;
  PractitionerName: string;
  total_patients: number;
  total_requests: number;
  total_procedures: number;
}

export interface PractitionerDaily {
  date: string;
  procedure_count: number;
}

export interface OverallStats {
  total_patients: number;
  total_requests: number;
  total_procedures: number;
  total_worksites: number;
}

// Legacy interfaces for backwards compatibility
export interface ReferrerDetail {
  ReferrerKey: string;
  ReferrerName: string;
  ProviderNumber: string | null;
  total_procedures: number;
  last_referral: string;
}

export interface ReferrerDaily {
  date: string;
  Modality: string;
  procedure_count: number;
}

export interface ReferrerModality {
  Modality: string;
  procedure_count: number;
}

// Helper to convert DateRange to params
function dateRangeToParams(dateRange: DateRange): Record<string, unknown> {
  if (dateRange.startDate && dateRange.endDate) {
    return { days: 0, startDate: dateRange.startDate, endDate: dateRange.endDate };
  }
  return { days: dateRange.days };
}

async function fetchMloData<T>(action: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const { data, error } = await supabase.functions.invoke('mlo-bigquery-performance', {
    body: { action, ...params }
  });

  if (error) {
    logger.error('MLO BigQuery fetch error', error);
    throw error;
  }

  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }

  return data.data || [];
}

export function useWorksiteSummary(dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['mlo-bigquery', 'worksite_summary', dateRange],
    queryFn: () => fetchMloData<WorksiteSummary>('worksite_summary', dateRangeToParams(dateRange)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWorksiteModality(worksiteKey: string | null, dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['mlo-bigquery', 'worksite_modality', worksiteKey, dateRange],
    queryFn: () => fetchMloData<WorksiteModality>('worksite_modality', { worksiteKey, ...dateRangeToParams(dateRange) }),
    enabled: !!worksiteKey,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOverallModalityStats(dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['mlo-bigquery', 'overall_modality_stats', dateRange],
    queryFn: () => fetchMloData<WorksiteModality>('overall_modality_stats', dateRangeToParams(dateRange)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFilteredModalityStats(worksiteKeys: string[], dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['mlo-bigquery', 'filtered_modality_stats', worksiteKeys, dateRange],
    queryFn: () => fetchMloData<WorksiteModality>('filtered_modality_stats', { worksiteKeys, ...dateRangeToParams(dateRange) }),
    enabled: worksiteKeys.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWorksiteReferrers(worksiteKey: string | null, dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['mlo-bigquery', 'worksite_referrers', worksiteKey, dateRange],
    queryFn: () => fetchMloData<ReferringPractitioner>('worksite_referrers', { worksiteKey, ...dateRangeToParams(dateRange) }),
    enabled: !!worksiteKey,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWorksiteLocations(worksiteKey: string | null, dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['mlo-bigquery', 'worksite_locations', worksiteKey, dateRange],
    queryFn: () => fetchMloData<PractitionerLocation>('worksite_locations', { worksiteKey, ...dateRangeToParams(dateRange) }),
    enabled: !!worksiteKey,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLocationReferrers(locationKey: string | null, worksiteKey: string | null, dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['mlo-bigquery', 'location_referrers', locationKey, worksiteKey, dateRange],
    queryFn: () => fetchMloData<ReferringPractitioner>('location_referrers', { locationKey, worksiteKey, ...dateRangeToParams(dateRange) }),
    enabled: !!locationKey && !!worksiteKey,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePractitionerSummary(practitionerKey: string | null, dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['mlo-bigquery', 'practitioner_details', practitionerKey, dateRange],
    queryFn: () => fetchMloData<PractitionerSummary>('practitioner_details', { practitionerKey, ...dateRangeToParams(dateRange) }),
    enabled: !!practitionerKey,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePractitionerDaily(practitionerKey: string | null) {
  return useQuery({
    queryKey: ['mlo-bigquery', 'practitioner_daily', practitionerKey],
    queryFn: () => fetchMloData<PractitionerDaily>('practitioner_daily', { practitionerKey }),
    enabled: !!practitionerKey,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOverallStats(dateRange: DateRange = { days: 90 }) {
  return useQuery({
    queryKey: ['mlo-bigquery', 'overall_stats', dateRange],
    queryFn: async () => {
      const data = await fetchMloData<OverallStats>('overall_stats', dateRangeToParams(dateRange));
      return data[0] || { total_patients: 0, total_requests: 0, total_procedures: 0, total_worksites: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
}
