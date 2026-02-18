import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ReportFilters {
  startDate: Date;
  endDate: Date;
  locationId?: string;
  status?: string;
}

export const useChecklistReports = (filters: ReportFilters) => {
  // Fetch summary statistics
  const { data: summaryStats, isLoading: summaryLoading } = useQuery({
    queryKey: ["checklist-summary", filters],
    queryFn: async () => {
      const startDate = format(filters.startDate, "yyyy-MM-dd");
      const endDate = format(filters.endDate, "yyyy-MM-dd");

      const { data: completions, error } = await supabase
        .from("checklist_completions")
        .select("*, locations(name)")
        .gte("checklist_date", startDate)
        .lte("checklist_date", endDate)
        .order("checklist_date", { ascending: false });

      if (error) throw error;

      const filtered = completions?.filter(c => {
        if (filters.locationId && c.location_id !== filters.locationId) return false;
        if (filters.status && c.status !== filters.status) return false;
        return true;
      }) || [];

      const completed = filtered.filter(c => c.status === "completed").length;
      const inProgress = filtered.filter(c => c.status === "in_progress").length;
      const pending = filtered.filter(c => c.status === "pending").length;
      const avgCompletion = filtered.length > 0
        ? filtered.reduce((sum, c) => sum + (c.completion_percentage || 0), 0) / filtered.length
        : 0;

      return {
        totalCompletions: filtered.length,
        completed,
        inProgress,
        pending,
        averageCompletionRate: Math.round(avgCompletion),
      };
    },
  });

  // Fetch detailed completion records
  const { data: completionRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ["checklist-completions", filters],
    queryFn: async () => {
      const startDate = format(filters.startDate, "yyyy-MM-dd");
      const endDate = format(filters.endDate, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("checklist_completions")
        .select(`
          *,
          locations(id, name),
          checklist_templates(id, name)
        `)
        .gte("checklist_date", startDate)
        .lte("checklist_date", endDate)
        .order("checklist_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data?.filter(record => {
        if (filters.locationId && record.location_id !== filters.locationId) return false;
        if (filters.status && record.status !== filters.status) return false;
        return true;
      });
    },
  });

  // Fetch item completions for a specific completion
  const fetchItemCompletions = async (completionId: string) => {
      const { data, error } = await supabase
        .from("checklist_item_completions")
        .select(`
          *,
          checklist_items(
            id,
            task_description,
            time_slot,
            allow_na,
            is_required
          )
        `)
        .eq("completion_id", completionId)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  };

  return {
    summaryStats,
    summaryLoading,
    completionRecords,
    recordsLoading,
    fetchItemCompletions,
  };
};
