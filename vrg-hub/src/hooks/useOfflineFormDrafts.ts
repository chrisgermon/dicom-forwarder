import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface FormDraft {
  id: string;
  form_type: string;
  form_data: Record<string, any>;
  device_id: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

const DEVICE_ID_KEY = "device_id";

function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function useOfflineFormDrafts(formType: string) {
  const { user } = useAuth();
  const { isOnline, queueOperation } = useOfflineCache();
  const [draft, setDraft] = useState<FormDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const deviceId = getDeviceId();
  const localStorageKey = `form_draft_${formType}_${user?.id || "anonymous"}`;

  // Load draft from local storage or database
  const loadDraft = useCallback(async () => {
    setLoading(true);

    try {
      // First check local storage
      const localDraft = localStorage.getItem(localStorageKey);
      if (localDraft) {
        const parsed = JSON.parse(localDraft);
        setDraft(parsed);
      }

      // If online, check database for more recent draft
      if (isOnline && user?.id) {
        const { data, error } = await supabase
          .from("offline_form_drafts")
          .select("*")
          .eq("user_id", user.id)
          .eq("form_type", formType)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          const serverDraft: FormDraft = {
            id: data.id,
            form_type: data.form_type,
            form_data: data.form_data as Record<string, any>,
            device_id: data.device_id,
            created_at: data.created_at,
            updated_at: data.updated_at,
            synced_at: data.synced_at,
          };

          // If server draft is newer, use it
          const localUpdated = localDraft ? JSON.parse(localDraft).updated_at : null;
          if (!localUpdated || new Date(serverDraft.updated_at) > new Date(localUpdated)) {
            setDraft(serverDraft);
            localStorage.setItem(localStorageKey, JSON.stringify(serverDraft));
          }
        }
      }
    } catch (error) {
      logger.error("Error loading draft", error);
    } finally {
      setLoading(false);
    }
  }, [formType, user?.id, isOnline, localStorageKey]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  // Save draft locally and queue for sync
  const saveDraft = useCallback(
    async (formData: Record<string, any>) => {
      setSaving(true);

      try {
        const now = new Date().toISOString();
        const draftData: FormDraft = {
          id: draft?.id || crypto.randomUUID(),
          form_type: formType,
          form_data: formData,
          device_id: deviceId,
          created_at: draft?.created_at || now,
          updated_at: now,
          synced_at: null,
        };

        // Always save to local storage first
        localStorage.setItem(localStorageKey, JSON.stringify(draftData));
        setDraft(draftData);

        // If online, save to database
        if (isOnline && user?.id) {
          const { error } = await supabase.from("offline_form_drafts").upsert({
            id: draftData.id,
            user_id: user.id,
            form_type: formType,
            form_data: formData,
            device_id: deviceId,
            synced_at: now,
            updated_at: now,
          });

          if (!error) {
            draftData.synced_at = now;
            localStorage.setItem(localStorageKey, JSON.stringify(draftData));
            setDraft(draftData);
          }
        } else if (user?.id) {
          // Queue for offline sync
          queueOperation("update", "offline_form_drafts", {
            id: draftData.id,
            user_id: user.id,
            form_type: formType,
            form_data: formData,
            device_id: deviceId,
            updated_at: now,
          });
          toast.info("Draft saved offline. Will sync when connected.");
        }

        return draftData;
      } catch (error) {
        logger.error("Error saving draft", error);
        toast.error("Failed to save draft");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [draft, formType, deviceId, isOnline, user?.id, localStorageKey, queueOperation]
  );

  // Clear draft from local storage and database
  const clearDraft = useCallback(async () => {
    localStorage.removeItem(localStorageKey);
    setDraft(null);

    if (isOnline && user?.id && draft?.id) {
      await supabase.from("offline_form_drafts").delete().eq("id", draft.id);
    }
  }, [localStorageKey, isOnline, user?.id, draft?.id]);

  // Auto-save debounce
  const autoSave = useCallback(
    (formData: Record<string, any>, debounceMs = 2000) => {
      const timeoutId = setTimeout(() => {
        saveDraft(formData);
      }, debounceMs);

      return () => clearTimeout(timeoutId);
    },
    [saveDraft]
  );

  return {
    draft,
    loading,
    saving,
    saveDraft,
    clearDraft,
    autoSave,
    isOffline: !isOnline,
    hasPendingSync: draft ? !draft.synced_at : false,
  };
}
