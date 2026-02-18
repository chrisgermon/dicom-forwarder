import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useChecklistAdmin() {
  const queryClient = useQueryClient();

  // Fetch all templates (admin view)
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["checklist-templates-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_templates")
        .select(`
          *,
          locations(name),
          brands(display_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch single template with items
  const fetchTemplate = async (templateId: string) => {
    const { data, error } = await supabase
      .from("checklist_templates")
      .select(`
        *,
        locations(name),
        brands(display_name)
      `)
      .eq("id", templateId)
      .single();

    if (error) throw error;
    return data;
  };

  // Fetch items for a template
  const fetchTemplateItems = async (templateId: string) => {
    const { data, error } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("template_id", templateId)
      .order("sort_order");

    if (error) throw error;
    return data;
  };

  // Create template
  const createTemplate = useMutation({
    mutationFn: async (template: {
      name: string;
      description?: string;
      location_id?: string;
      brand_id?: string;
      checklist_type: string;
    }) => {
      const { data, error } = await supabase
        .from("checklist_templates")
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates-admin"] });
      toast.success("Template created");
    },
    onError: () => {
      toast.error("Failed to create template");
    },
  });

  // Update template
  const updateTemplate = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      description?: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("checklist_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates-admin"] });
      toast.success("Template updated");
    },
    onError: () => {
      toast.error("Failed to update template");
    },
  });

  // Delete template
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("checklist_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates-admin"] });
      toast.success("Template deleted");
    },
    onError: () => {
      toast.error("Failed to delete template");
    },
  });

  // Create item
  const createItem = useMutation({
    mutationFn: async (item: {
      template_id: string;
      task_description: string;
      time_slot?: string;
      day_restriction?: string[];
      sort_order: number;
      allow_na?: boolean;
      is_required?: boolean;
      instructions?: string;
    }) => {
      const { data, error } = await supabase
        .from("checklist_items")
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-items"] });
      toast.success("Item added");
    },
    onError: () => {
      toast.error("Failed to add item");
    },
  });

  // Update item
  const updateItem = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      task_description?: string;
      time_slot?: string;
      day_restriction?: string[];
      sort_order?: number;
      allow_na?: boolean;
      is_required?: boolean;
      instructions?: string;
    }) => {
      const { data, error } = await supabase
        .from("checklist_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-items"] });
      toast.success("Item updated");
    },
    onError: () => {
      toast.error("Failed to update item");
    },
  });

  // Delete item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("checklist_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-items"] });
      toast.success("Item deleted");
    },
    onError: () => {
      toast.error("Failed to delete item");
    },
  });

  return {
    templates,
    templatesLoading,
    fetchTemplate,
    fetchTemplateItems,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createItem,
    updateItem,
    deleteItem,
  };
}
