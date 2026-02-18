import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface MloVisitInfo {
  visit_date: string;
  visitor_name: string | null;
  visitor_id: string;
  visit_type: string;
}

export interface MloVisitFull {
  id: string;
  visit_date: string;
  visit_time: string | null;
  visit_type: string;
  contact_name: string | null;
  contact_role: string | null;
  purpose: string | null;
  notes: string | null;
  outcome: string | null;
  follow_up_date: string | null;
  follow_up_time: string | null;
  follow_up_notes: string | null;
  follow_up_completed: boolean | null;
  visitor_name: string | null;
  visitor_id: string;
  clinic_key: number | null;
  referrer_key: number | null;
  clinic_name?: string | null;
  referrer_name?: string | null;
  location_name?: string | null;
}

export function useMloVisitInfo() {
  const [loading, setLoading] = useState(false);

  const getLastVisitForClinic = useCallback(async (clinicKey: number): Promise<MloVisitInfo | null> => {
    try {
      const { data, error } = await supabase
        .from("mlo_visits")
        .select(`
          visit_date,
          visit_type,
          user_id,
          profiles:user_id (full_name)
        `)
        .eq("clinic_key", clinicKey)
        .order("visit_date", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      return {
        visit_date: data.visit_date,
        visitor_name: (data.profiles as any)?.full_name || null,
        visitor_id: data.user_id,
        visit_type: data.visit_type,
      };
    } catch {
      return null;
    }
  }, []);

  const getLastVisitForReferrer = useCallback(async (referrerKey: number): Promise<MloVisitInfo | null> => {
    try {
      const { data, error } = await supabase
        .from("mlo_visits")
        .select(`
          visit_date,
          visit_type,
          user_id,
          profiles:user_id (full_name)
        `)
        .eq("referrer_key", referrerKey)
        .order("visit_date", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      return {
        visit_date: data.visit_date,
        visitor_name: (data.profiles as any)?.full_name || null,
        visitor_id: data.user_id,
        visit_type: data.visit_type,
      };
    } catch {
      return null;
    }
  }, []);

  // Get ALL visits for a clinic
  const getAllVisitsForClinic = useCallback(async (clinicKey: number): Promise<MloVisitFull[]> => {
    try {
      const { data, error } = await supabase
        .from("mlo_visits")
        .select(`
          id,
          visit_date,
          visit_time,
          visit_type,
          contact_name,
          contact_role,
          purpose,
          notes,
          outcome,
          follow_up_date,
          follow_up_time,
          follow_up_notes,
          follow_up_completed,
          user_id,
          clinic_key,
          referrer_key,
          profiles:user_id (full_name),
          locations:location_id (name)
        `)
        .eq("clinic_key", clinicKey)
        .order("visit_date", { ascending: false });

      if (error || !data) return [];

      // Get clinic name
      const { data: clinicData } = await supabase
        .from("clinic_directory")
        .select("clinic_name")
        .eq("clinic_key", clinicKey)
        .limit(1)
        .maybeSingle();

      // Get referrer names if needed
      const referrerKeys = [...new Set(data.filter(v => v.referrer_key).map(v => v.referrer_key!))] as number[];
      const referrerMap = new Map<number, string>();
      
      if (referrerKeys.length > 0) {
        const { data: referrerData } = await supabase
          .from("referrer_directory")
          .select("referrer_key, referrer_name")
          .in("referrer_key", referrerKeys);
        
        (referrerData || []).forEach((r: any) => {
          if (r.referrer_key && r.referrer_name) referrerMap.set(r.referrer_key, r.referrer_name);
        });
      }

      return data.map((visit: any) => ({
        id: visit.id,
        visit_date: visit.visit_date,
        visit_time: visit.visit_time,
        visit_type: visit.visit_type,
        contact_name: visit.contact_name,
        contact_role: visit.contact_role,
        purpose: visit.purpose,
        notes: visit.notes,
        outcome: visit.outcome,
        follow_up_date: visit.follow_up_date,
        follow_up_time: visit.follow_up_time,
        follow_up_notes: visit.follow_up_notes,
        follow_up_completed: visit.follow_up_completed,
        visitor_name: visit.profiles?.full_name || null,
        visitor_id: visit.user_id,
        clinic_key: visit.clinic_key,
        referrer_key: visit.referrer_key,
        clinic_name: clinicData?.clinic_name || null,
        referrer_name: visit.referrer_key ? referrerMap.get(visit.referrer_key) || null : null,
        location_name: visit.locations?.name || null,
      }));
    } catch {
      return [];
    }
  }, []);

  // Get ALL visits for a referrer
  const getAllVisitsForReferrer = useCallback(async (referrerKey: number): Promise<MloVisitFull[]> => {
    try {
      const { data, error } = await supabase
        .from("mlo_visits")
        .select(`
          id,
          visit_date,
          visit_time,
          visit_type,
          contact_name,
          contact_role,
          purpose,
          notes,
          outcome,
          follow_up_date,
          follow_up_time,
          follow_up_notes,
          follow_up_completed,
          user_id,
          clinic_key,
          referrer_key,
          profiles:user_id (full_name),
          locations:location_id (name)
        `)
        .eq("referrer_key", referrerKey)
        .order("visit_date", { ascending: false });

      if (error || !data) return [];

      // Get referrer name
      const { data: referrerData } = await supabase
        .from("referrer_directory")
        .select("referrer_name")
        .eq("referrer_key", referrerKey)
        .limit(1)
        .maybeSingle();

      // Get clinic names if needed
      const clinicKeys = [...new Set(data.filter(v => v.clinic_key).map(v => v.clinic_key!))] as number[];
      const clinicMap = new Map<number, string>();
      
      if (clinicKeys.length > 0) {
        const { data: clinicData } = await supabase
          .from("clinic_directory")
          .select("clinic_key, clinic_name")
          .in("clinic_key", clinicKeys);
        
        (clinicData || []).forEach((c: any) => {
          if (c.clinic_key && c.clinic_name) clinicMap.set(c.clinic_key, c.clinic_name);
        });
      }

      return data.map((visit: any) => ({
        id: visit.id,
        visit_date: visit.visit_date,
        visit_time: visit.visit_time,
        visit_type: visit.visit_type,
        contact_name: visit.contact_name,
        contact_role: visit.contact_role,
        purpose: visit.purpose,
        notes: visit.notes,
        outcome: visit.outcome,
        follow_up_date: visit.follow_up_date,
        follow_up_time: visit.follow_up_time,
        follow_up_notes: visit.follow_up_notes,
        follow_up_completed: visit.follow_up_completed,
        visitor_name: visit.profiles?.full_name || null,
        visitor_id: visit.user_id,
        clinic_key: visit.clinic_key,
        referrer_key: visit.referrer_key,
        clinic_name: visit.clinic_key ? clinicMap.get(visit.clinic_key) || null : null,
        referrer_name: referrerData?.referrer_name || null,
        location_name: visit.locations?.name || null,
      }));
    } catch {
      return [];
    }
  }, []);

  // Get ALL visits (for the All Visits tab)
  const getAllVisits = useCallback(async (): Promise<MloVisitFull[]> => {
    setLoading(true);
    try {
      // Fetch visits with only the relationships that have proper foreign keys
      const { data: visitsData, error: visitsError } = await supabase
        .from("mlo_visits")
        .select(`
          id,
          visit_date,
          visit_time,
          visit_type,
          contact_name,
          contact_role,
          purpose,
          notes,
          outcome,
          follow_up_date,
          follow_up_time,
          follow_up_notes,
          follow_up_completed,
          user_id,
          clinic_key,
          referrer_key,
          profiles:user_id (full_name),
          locations:location_id (name)
        `)
        .order("visit_date", { ascending: false })
        .limit(500);

      if (visitsError || !visitsData) {
        logger.error("Error fetching visits", visitsError);
        return [];
      }

      // Collect unique clinic and referrer keys
      const clinicKeys = [...new Set(visitsData.filter(v => v.clinic_key).map(v => v.clinic_key!))] as number[];
      const referrerKeys = [...new Set(visitsData.filter(v => v.referrer_key).map(v => v.referrer_key!))] as number[];

      // Fetch clinic and referrer names in parallel
      const [clinicData, referrerData] = await Promise.all([
        clinicKeys.length > 0
          ? supabase.from("clinic_directory").select("clinic_key, clinic_name").in("clinic_key", clinicKeys)
          : { data: [] },
        referrerKeys.length > 0
          ? supabase.from("referrer_directory").select("referrer_key, referrer_name").in("referrer_key", referrerKeys)
          : { data: [] },
      ]);

      // Create lookup maps
      const clinicMap = new Map<number, string>();
      (clinicData.data || []).forEach((c: any) => {
        if (c.clinic_key && c.clinic_name) clinicMap.set(c.clinic_key, c.clinic_name);
      });

      const referrerMap = new Map<number, string>();
      (referrerData.data || []).forEach((r: any) => {
        if (r.referrer_key && r.referrer_name) referrerMap.set(r.referrer_key, r.referrer_name);
      });

      return visitsData.map((visit: any) => ({
        id: visit.id,
        visit_date: visit.visit_date,
        visit_time: visit.visit_time,
        visit_type: visit.visit_type,
        contact_name: visit.contact_name,
        contact_role: visit.contact_role,
        purpose: visit.purpose,
        notes: visit.notes,
        outcome: visit.outcome,
        follow_up_date: visit.follow_up_date,
        follow_up_time: visit.follow_up_time,
        follow_up_notes: visit.follow_up_notes,
        follow_up_completed: visit.follow_up_completed,
        visitor_name: visit.profiles?.full_name || null,
        visitor_id: visit.user_id,
        clinic_key: visit.clinic_key,
        referrer_key: visit.referrer_key,
        clinic_name: visit.clinic_key ? clinicMap.get(visit.clinic_key) || null : null,
        referrer_name: visit.referrer_key ? referrerMap.get(visit.referrer_key) || null : null,
        location_name: visit.locations?.name || null,
      }));
    } catch (err) {
      logger.error("Error in getAllVisits", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getVisitInfoBatch = useCallback(async (
    clinicKeys: number[],
    referrerKeys: number[]
  ): Promise<Map<string, MloVisitInfo>> => {
    setLoading(true);
    const visitMap = new Map<string, MloVisitInfo>();

    try {
      // Fetch clinic visits
      if (clinicKeys.length > 0) {
        const { data: clinicVisits } = await supabase
          .from("mlo_visits")
          .select(`
            clinic_key,
            visit_date,
            visit_type,
            user_id,
            profiles:user_id (full_name)
          `)
          .in("clinic_key", clinicKeys)
          .not("clinic_key", "is", null)
          .order("visit_date", { ascending: false });

        if (clinicVisits) {
          // Group by clinic_key and take the most recent
          const clinicVisitMap = new Map<number, typeof clinicVisits[0]>();
          for (const visit of clinicVisits) {
            if (visit.clinic_key && !clinicVisitMap.has(visit.clinic_key)) {
              clinicVisitMap.set(visit.clinic_key, visit);
            }
          }
          clinicVisitMap.forEach((visit, key) => {
            visitMap.set(`clinic_${key}`, {
              visit_date: visit.visit_date,
              visitor_name: (visit.profiles as any)?.full_name || null,
              visitor_id: visit.user_id,
              visit_type: visit.visit_type,
            });
          });
        }
      }

      // Fetch referrer visits
      if (referrerKeys.length > 0) {
        const { data: referrerVisits } = await supabase
          .from("mlo_visits")
          .select(`
            referrer_key,
            visit_date,
            visit_type,
            user_id,
            profiles:user_id (full_name)
          `)
          .in("referrer_key", referrerKeys)
          .not("referrer_key", "is", null)
          .order("visit_date", { ascending: false });

        if (referrerVisits) {
          // Group by referrer_key and take the most recent
          const referrerVisitMap = new Map<number, typeof referrerVisits[0]>();
          for (const visit of referrerVisits) {
            if (visit.referrer_key && !referrerVisitMap.has(visit.referrer_key)) {
              referrerVisitMap.set(visit.referrer_key, visit);
            }
          }
          referrerVisitMap.forEach((visit, key) => {
            visitMap.set(`referrer_${key}`, {
              visit_date: visit.visit_date,
              visitor_name: (visit.profiles as any)?.full_name || null,
              visitor_id: visit.user_id,
              visit_type: visit.visit_type,
            });
          });
        }
      }
    } catch (error) {
      logger.error("Error fetching MLO visit info", error);
    } finally {
      setLoading(false);
    }

    return visitMap;
  }, []);

  return {
    loading,
    getLastVisitForClinic,
    getLastVisitForReferrer,
    getAllVisitsForClinic,
    getAllVisitsForReferrer,
    getAllVisits,
    getVisitInfoBatch,
  };
}
