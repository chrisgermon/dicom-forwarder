import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useAuditLog } from "./useAuditLog";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";
import { AU_TIMEZONE } from "@/lib/dateUtils";
import { logger } from "@/lib/logger";

export function useChecklists() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { logComplete, logSubmit } = useAuditLog();

  // Fetch template for user's location
  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ["checklist-template", profile?.location_id],
    queryFn: async () => {
      if (!profile?.location_id) return null;

      const { data, error } = await supabase
        .from("checklist_templates")
        .select("*")
        .eq("location_id", profile.location_id)
        .eq("checklist_type", "daily")
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.location_id,
  });

  // Fetch checklist items
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["checklist-items", template?.id],
    queryFn: async () => {
      if (!template?.id) return [];

      const { data, error } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("template_id", template.id)
        .order("sort_order");

      if (error) throw error;
      return data;
    },
    enabled: !!template?.id,
  });

  // Fetch or create today's completion
  const { data: completion, isLoading: completionLoading } = useQuery({
    queryKey: ["checklist-completion", template?.id, profile?.location_id],
    queryFn: async () => {
      if (!template?.id || !profile?.location_id) return null;

      const today = formatInTimeZone(new Date(), AU_TIMEZONE, "yyyy-MM-dd");

      // Try to fetch existing
      let { data, error } = await supabase
        .from("checklist_completions")
        .select("*")
        .eq("template_id", template.id)
        .eq("location_id", profile.location_id)
        .eq("checklist_date", today)
        .single();

      // If doesn't exist, create it
      if (error && error.code === "PGRST116") {
        const { data: newCompletion, error: createError } = await supabase
          .from("checklist_completions")
          .insert({
            template_id: template.id,
            location_id: profile.location_id,
            checklist_date: today,
            status: "pending",
          })
          .select()
          .single();

        if (createError) throw createError;
        return newCompletion;
      }

      if (error) throw error;
      return data;
    },
    enabled: !!template?.id && !!profile?.location_id,
  });

  // Fetch item completions
  const { data: itemCompletions, isLoading: itemCompletionsLoading } = useQuery({
    queryKey: ["checklist-item-completions", completion?.id],
    queryFn: async () => {
      if (!completion?.id) return [];

      const { data, error } = await supabase
        .from("checklist_item_completions")
        .select("*")
        .eq("completion_id", completion.id);

      if (error) throw error;
      return data;
    },
    enabled: !!completion?.id,
  });

  // Complete an item
  const completeItem = useMutation({
    mutationFn: async ({
      itemId,
      status,
      notes,
    }: {
      itemId: string;
      status: "completed" | "na" | "skipped";
      notes?: string;
    }) => {
      if (!completion?.id || !profile?.id) throw new Error("Missing completion or profile");

      const initials = profile.full_name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "??";

      const { data, error } = await supabase
        .from("checklist_item_completions")
        .upsert(
          {
            completion_id: completion.id,
            item_id: itemId,
            status,
            initials,
            completed_by: profile.id,
            completed_at: new Date().toISOString(),
            notes,
          },
          { onConflict: "completion_id,item_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      logComplete('checklist_item_completions', data?.id || variables.itemId, { 
        status: variables.status,
        itemId: variables.itemId 
      });
      queryClient.invalidateQueries({ queryKey: ["checklist-item-completions"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-completion"] });
      toast.success("Task updated");
    },
    onError: (error) => {
      toast.error("Failed to update task");
      logger.error("Failed to update task", error);
    },
  });

  // Complete all items in a time slot
  const completeAllInSlot = useMutation({
    mutationFn: async (itemIds: string[]) => {
      if (!completion?.id || !profile?.id) throw new Error("Missing completion or profile");

      const initials = profile.full_name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "??";

      const completions = itemIds.map((itemId) => ({
        completion_id: completion.id,
        item_id: itemId,
        status: "completed" as const,
        initials,
        completed_by: profile.id,
        completed_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("checklist_item_completions")
        .upsert(completions, { onConflict: "completion_id,item_id" })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-item-completions"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-completion"] });
      toast.success("All tasks marked as complete");
    },
    onError: (error) => {
      toast.error("Failed to complete all tasks");
      logger.error("Failed to complete all tasks", error);
    },
  });

  // Submit/finish checklist
  const submitChecklist = useMutation({
    mutationFn: async () => {
      if (!completion?.id || !profile?.id) throw new Error("Missing completion or profile");

      const { data, error } = await supabase
        .from("checklist_completions")
        .update({
          status: "completed",
          completed_by: profile.id,
          completed_at: new Date().toISOString(),
        })
        .eq("id", completion.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      logSubmit('checklist_completions', data?.id || '', { status: 'completed' });
      queryClient.invalidateQueries({ queryKey: ["checklist-completion"] });
      toast.success("Checklist submitted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to submit checklist");
      logger.error("Failed to submit checklist", error);
    },
  });

  return {
    template,
    items,
    completion,
    itemCompletions,
    isLoading: templateLoading || itemsLoading || completionLoading || itemCompletionsLoading,
    completeItem,
    completeAllInSlot,
    submitChecklist,
  };
}
