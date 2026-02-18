import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { CLINIC_SETUP_FORM_TEMPLATE, getDefaultItemsForSection } from "@/components/clinic-setup/clinicSetupFormTemplate";

export interface ClinicSetupChecklist {
  id: string;
  clinic_name: string;
  go_live_date: string | null;
  lease_handover_date: string | null;
  brand_id: string | null;
  location_id: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  brand?: { display_name: string } | null;
  location?: { name: string } | null;
}

export interface ClinicSetupSection {
  id: string;
  checklist_id: string;
  section_name: string;
  section_owner: string | null;
  section_owner_id: string | null;
  owner_profile?: { id: string; full_name: string; email: string } | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  items?: ClinicSetupItem[];
}

export interface ClinicSetupItem {
  id: string;
  section_id: string;
  field_name: string;
  field_type: string;
  field_value: string | null;
  field_options: Record<string, unknown> | null;
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_locked?: boolean;
  locked_at?: string | null;
  locked_by?: string | null;
  unlock_reason?: string | null;
  assigned_to?: string | null;
  assigned_profile?: { id: string; full_name: string; email: string } | null;
}

export interface ClinicSetupPermission {
  id: string;
  checklist_id: string;
  user_id: string;
  permission_level: "view" | "edit" | "admin";
  granted_by: string;
  created_at: string;
  profile?: { full_name: string; email: string } | null;
}

export function useClinicSetupChecklists() {
  const { user, profile, userRole } = useAuth();
  const queryClient = useQueryClient();

  // Check if user is admin or special user
  const isAdmin = profile?.email === "mays@visionradiology.com.au" || 
    userRole === "super_admin" ||
    userRole === "tenant_admin";

  // Fetch all checklists
  const { data: checklists, isLoading: checklistsLoading } = useQuery({
    queryKey: ["clinic-setup-checklists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_setup_checklists")
        .select(`
          *,
          brand:brands(display_name),
          location:locations(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ClinicSetupChecklist[];
    },
    enabled: !!user,
  });

  // Fetch single checklist with sections and items
  const fetchChecklist = async (checklistId: string) => {
    const { data: checklist, error: checklistError } = await supabase
      .from("clinic_setup_checklists")
      .select(`
        *,
        brand:brands(display_name),
        location:locations(name)
      `)
      .eq("id", checklistId)
      .single();

    if (checklistError) throw checklistError;

    const { data: sections, error: sectionsError } = await supabase
      .from("clinic_setup_sections")
      .select(`
        *,
        owner_profile:profiles!clinic_setup_sections_section_owner_id_fkey(id, full_name, email)
      `)
      .eq("checklist_id", checklistId)
      .order("sort_order");

    if (sectionsError) throw sectionsError;

    // Only fetch items if there are sections
    let items: ClinicSetupItem[] = [];
    if (sections && sections.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from("clinic_setup_items")
        .select("*")
        .in("section_id", sections.map(s => s.id))
        .order("sort_order");

      if (itemsError) throw itemsError;
      
      // Fetch assigned profiles
      const assignedUserIds = (itemsData || [])
        .map(item => item.assigned_to)
        .filter((id): id is string => !!id);
      
      let profileMap = new Map<string, { id: string; full_name: string; email: string }>();
      if (assignedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", assignedUserIds);
        profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      }
      
      items = (itemsData || []).map(item => ({
        ...item,
        assigned_profile: item.assigned_to ? profileMap.get(item.assigned_to) || null : null,
      })) as ClinicSetupItem[];
    }

    // Map items to sections
    const sectionsWithItems = (sections || []).map(section => ({
      ...section,
      items: items.filter(item => item.section_id === section.id)
    }));

    return {
      checklist: checklist as ClinicSetupChecklist,
      sections: sectionsWithItems as ClinicSetupSection[]
    };
  };

  // Fetch permissions for a checklist
  const fetchPermissions = async (checklistId: string) => {
    const { data, error } = await supabase
      .from("clinic_setup_permissions")
      .select("*")
      .eq("checklist_id", checklistId);

    if (error) throw error;
    
    // Fetch profiles separately
    const userIds = data.map(p => p.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    return data.map(p => ({
      ...p,
      permission_level: p.permission_level as "view" | "edit" | "admin",
      profile: profileMap.get(p.user_id) || null,
    })) as ClinicSetupPermission[];
  };

  // Create checklist with automatic template initialization
  const createChecklist = useMutation({
    mutationFn: async (data: {
      clinic_name: string;
      go_live_date?: string | null;
      lease_handover_date?: string | null;
      brand_id?: string | null;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Create the checklist
      const { data: checklist, error } = await supabase
        .from("clinic_setup_checklists")
        .insert({
          clinic_name: data.clinic_name,
          go_live_date: data.go_live_date,
          lease_handover_date: data.lease_handover_date,
          brand_id: data.brand_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Automatically initialize all sections from template
      // Insert sections one at a time to avoid bulk insert issues
      const insertedSections: Array<{ id: string; section_name: string }> = [];
      
      for (let index = 0; index < CLINIC_SETUP_FORM_TEMPLATE.length; index++) {
        const section = CLINIC_SETUP_FORM_TEMPLATE[index];
        const { data: insertedSection, error: sectionError } = await supabase
          .from("clinic_setup_sections")
          .insert({
            checklist_id: checklist.id,
            section_name: section.name,
            section_owner: section.owner || null,
            sort_order: index,
          })
          .select()
          .single();

        if (sectionError) {
          logger.error(`Error creating section ${section.name}`, sectionError);
          throw sectionError;
        }
        
        if (insertedSection) {
          insertedSections.push(insertedSection);
        }
      }

      logger.debug(`Created ${insertedSections.length} sections for checklist ${checklist.id}`);

      // Create all items for each section
      for (const insertedSection of insertedSections) {
        const templateSection = CLINIC_SETUP_FORM_TEMPLATE.find(
          (t) => t.name === insertedSection.section_name
        );
        
        if (templateSection) {
          const items = getDefaultItemsForSection(templateSection);
          const itemsToInsert = items.map((item, itemIndex) => ({
            section_id: insertedSection.id,
            field_name: item.field_name,
            field_type: item.field_type,
            field_options: item.field_options ? JSON.parse(JSON.stringify(item.field_options)) : null,
            sort_order: itemIndex,
          }));

          if (itemsToInsert.length > 0) {
            const { error: itemsError } = await supabase
              .from("clinic_setup_items")
              .insert(itemsToInsert);

            if (itemsError) {
              logger.error(`Error creating items for section ${insertedSection.section_name}`, itemsError);
              throw itemsError;
            }
          }
        }
      }

      logger.debug(`Finished initializing template for checklist ${checklist.id}`);

      return checklist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-setup-checklists"] });
      toast.success("Checklist created with all sections initialized");
    },
    onError: (error) => {
      toast.error("Failed to create checklist");
      logger.error("Failed to create checklist", error);
    },
  });

  // Add section
  const addSection = useMutation({
    mutationFn: async (data: {
      checklist_id: string;
      section_name: string;
      section_owner?: string;
      section_owner_id?: string | null;
      sort_order?: number;
    }) => {
      const { data: section, error } = await supabase
        .from("clinic_setup_sections")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return section;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-setup-checklist"] });
    },
  });

  // Update section owner
  const updateSectionOwner = useMutation({
    mutationFn: async (data: { sectionId: string; ownerId: string | null }) => {
      const { error } = await supabase
        .from("clinic_setup_sections")
        .update({ section_owner_id: data.ownerId })
        .eq("id", data.sectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-setup-checklist"] });
    },
  });

  // Add item
  const addItem = useMutation({
    mutationFn: async (data: {
      section_id: string;
      field_name: string;
      field_type?: string;
      field_options?: Record<string, unknown>;
      sort_order?: number;
    }) => {
      const { data: item, error } = await supabase
        .from("clinic_setup_items")
        .insert({
          section_id: data.section_id,
          field_name: data.field_name,
          field_type: data.field_type || "text",
          field_options: data.field_options ? JSON.parse(JSON.stringify(data.field_options)) : null,
          sort_order: data.sort_order || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-setup-checklist"] });
    },
  });

  // Update item
  const updateItem = useMutation({
    mutationFn: async (data: {
      id: string;
      field_value?: string | null;
      is_completed?: boolean;
      notes?: string | null;
      checklistId?: string;
      is_locked?: boolean;
      locked_at?: string | null;
      unlock_reason?: string | null;
      assigned_to?: string | null;
    }) => {
      const updateData: Record<string, unknown> = {};
      
      if (data.field_value !== undefined) updateData.field_value = data.field_value;
      if (data.is_completed !== undefined) {
        updateData.is_completed = data.is_completed;
        if (data.is_completed) {
          updateData.completed_by = user?.id;
          updateData.completed_at = new Date().toISOString();
        } else {
          updateData.completed_by = null;
          updateData.completed_at = null;
        }
      }
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.assigned_to !== undefined) updateData.assigned_to = data.assigned_to;
      
      // Handle lock/unlock
      if (data.is_locked !== undefined) {
        updateData.is_locked = data.is_locked;
        if (data.is_locked) {
          updateData.locked_by = user?.id;
          updateData.locked_at = data.locked_at || new Date().toISOString();
        } else {
          updateData.locked_by = null;
          updateData.locked_at = null;
          if (data.unlock_reason) {
            updateData.unlock_reason = data.unlock_reason;
          }
        }
      }

      const { data: item, error } = await supabase
        .from("clinic_setup_items")
        .update(updateData)
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw error;

      // Log activity with detailed audit trail
      if (data.checklistId) {
        // Determine the action type for better audit tracking
        let action = "update";
        let oldValue: string | null = null;
        let newValue: string | null = null;

        if (data.is_locked !== undefined) {
          action = data.is_locked ? "locked" : "unlocked";
          newValue = data.is_locked ? "locked" : `unlocked: ${data.unlock_reason || "no reason"}`;
        } else if (data.is_completed !== undefined) {
          action = data.is_completed ? "completed" : "uncompleted";
          newValue = data.is_completed ? "completed" : "uncompleted";
        } else if (data.field_value !== undefined) {
          action = "value_changed";
          newValue = data.field_value || "";
        } else if (data.notes !== undefined) {
          action = "notes_updated";
          newValue = data.notes || "";
        }

        await supabase.from("clinic_setup_activity").insert({
          checklist_id: data.checklistId,
          item_id: data.id,
          user_id: user?.id,
          action,
          old_value: oldValue,
          new_value: newValue,
        });

        // Trigger email notification
        try {
          await supabase.functions.invoke("clinic-setup-notification", {
            body: {
              checklistId: data.checklistId,
              itemId: data.id,
              action: "update",
              userId: user?.id,
            },
          });
        } catch (e) {
          logger.error("Failed to send notification", e);
        }
      }

      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-setup-checklist"] });
    },
  });

  // Grant permission
  const grantPermission = useMutation({
    mutationFn: async (data: {
      checklist_id: string;
      user_id: string;
      permission_level: "view" | "edit" | "admin";
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: permission, error } = await supabase
        .from("clinic_setup_permissions")
        .upsert({
          checklist_id: data.checklist_id,
          user_id: data.user_id,
          permission_level: data.permission_level,
          granted_by: user.id,
        }, { onConflict: "checklist_id,user_id" })
        .select()
        .single();

      if (error) throw error;
      return permission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-setup-permissions"] });
      toast.success("Permission granted");
    },
    onError: (error) => {
      toast.error("Failed to grant permission");
      logger.error("Failed to grant permission", error);
    },
  });

  // Revoke permission
  const revokePermission = useMutation({
    mutationFn: async (permissionId: string) => {
      const { error } = await supabase
        .from("clinic_setup_permissions")
        .delete()
        .eq("id", permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-setup-permissions"] });
      toast.success("Permission revoked");
    },
    onError: (error) => {
      toast.error("Failed to revoke permission");
      logger.error("Failed to revoke permission", error);
    },
  });

  // Delete checklist
  const deleteChecklist = useMutation({
    mutationFn: async (checklistId: string) => {
      const { error } = await supabase
        .from("clinic_setup_checklists")
        .delete()
        .eq("id", checklistId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-setup-checklists"] });
      toast.success("Checklist deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete checklist");
      logger.error("Failed to delete checklist", error);
    },
  });

  return {
    checklists,
    checklistsLoading,
    isAdmin,
    fetchChecklist,
    fetchPermissions,
    createChecklist,
    addSection,
    addItem,
    updateItem,
    updateSectionOwner,
    grantPermission,
    revokePermission,
    deleteChecklist,
  };
}
