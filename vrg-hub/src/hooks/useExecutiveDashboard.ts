import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface Filters {
  worksites?: string[];
  radiologists?: string[];
  modalities?: string[];
}

export interface KPIs {
  total_revenue: number;
  study_count: number;
  unique_radiologists: number;
  unique_worksites: number;
}

export interface FilterOptions {
  worksites: string[];
  worksitesByBrand: Record<string, string[]>;
  radiologists: string[];
  modalities: string[];
}

export interface HierarchyRow {
  WorkSiteName: string;
  RadiologistName: string;
  Modality: string;
  revenue: number;
  study_count: number;
}

export interface RevenueTrend {
  day: string;
  revenue: number;
  study_count: number;
}

export interface ModalityRevenue {
  Modality: string;
  revenue: number;
  study_count: number;
}

export interface TopRadiologist {
  RadiologistName: string;
  revenue: number;
  study_count: number;
  worksite_count: number;
}

export interface TopWorksite {
  WorkSiteName: string;
  revenue: number;
  study_count: number;
  radiologist_count: number;
}

export interface DataFreshness {
  last_updated: string;
  total_records: number;
}

async function fetchExecutiveData<T>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('executive-dashboard', {
    body: { action, ...params }
  });

  if (error) {
    logger.error('Executive Dashboard fetch error', error);
    throw error;
  }

  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }

  return data.data;
}

export function useDataFreshness() {
  return useQuery({
    queryKey: ['executive-dashboard', 'data_freshness'],
    queryFn: async () => {
      const result = await fetchExecutiveData<DataFreshness[]>('data_freshness');
      return result[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFilterOptions() {
  return useQuery({
    queryKey: ['executive-dashboard', 'filter_options'],
    queryFn: () => fetchExecutiveData<FilterOptions>('filter_options'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useKPIs(dateRange: DateRange, filters: Filters = {}) {
  return useQuery({
    queryKey: ['executive-dashboard', 'kpis', dateRange, filters],
    queryFn: async () => {
      const result = await fetchExecutiveData<KPIs[]>('kpis', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...filters
      });
      return result[0] || { total_revenue: 0, study_count: 0, unique_radiologists: 0, unique_worksites: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useWorksiteHierarchy(dateRange: DateRange, filters: Filters = {}) {
  return useQuery({
    queryKey: ['executive-dashboard', 'worksite_hierarchy', dateRange, filters],
    queryFn: () => fetchExecutiveData<HierarchyRow[]>('worksite_hierarchy', {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      ...filters
    }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRadiologistHierarchy(dateRange: DateRange, filters: Filters = {}) {
  return useQuery({
    queryKey: ['executive-dashboard', 'radiologist_hierarchy', dateRange, filters],
    queryFn: () => fetchExecutiveData<HierarchyRow[]>('radiologist_hierarchy', {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      ...filters
    }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRevenueTrend(dateRange: DateRange, filters: Filters = {}) {
  return useQuery({
    queryKey: ['executive-dashboard', 'revenue_trend', dateRange, filters],
    queryFn: () => fetchExecutiveData<RevenueTrend[]>('revenue_trend', {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      ...filters
    }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRevenueByModality(dateRange: DateRange, filters: Filters = {}) {
  return useQuery({
    queryKey: ['executive-dashboard', 'revenue_by_modality', dateRange, filters],
    queryFn: () => fetchExecutiveData<ModalityRevenue[]>('revenue_by_modality', {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      ...filters
    }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopRadiologists(dateRange: DateRange, filters: Filters = {}) {
  return useQuery({
    queryKey: ['executive-dashboard', 'top_radiologists', dateRange, filters],
    queryFn: () => fetchExecutiveData<TopRadiologist[]>('top_radiologists', {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      ...filters
    }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopWorksites(dateRange: DateRange, filters: Filters = {}) {
  return useQuery({
    queryKey: ['executive-dashboard', 'top_worksites', dateRange, filters],
    queryFn: () => fetchExecutiveData<TopWorksite[]>('top_worksites', {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      ...filters
    }),
    staleTime: 5 * 60 * 1000,
  });
}
