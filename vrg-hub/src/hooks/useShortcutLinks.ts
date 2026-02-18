import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface ShortcutLink {
  id: string;
  shortcut_type: string;
  shortcut_key: string;
  link_type: string;
  link_url: string | null;
  sharepoint_path: string | null;
  internal_route: string | null;
}

export function useShortcutLinks() {
  const { data: links = [], refetch } = useQuery({
    queryKey: ["home-shortcut-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_shortcut_links")
        .select("*");

      if (error) {
        logger.error("Error fetching shortcut links", error);
        return [];
      }

      return data as ShortcutLink[];
    },
  });

  const getLink = (type: "modality" | "department", key: string): ShortcutLink | undefined => {
    return links.find((l) => l.shortcut_type === type && l.shortcut_key === key);
  };

  const getLinkUrl = (type: "modality" | "department", key: string): string | null => {
    const link = getLink(type, key);
    if (!link) return null;

    if (link.link_type === "url") return link.link_url;
    if (link.link_type === "internal") return link.internal_route;
    if (link.link_type === "sharepoint" && link.sharepoint_path) {
      return `/sharepoint-documents?path=${encodeURIComponent(link.sharepoint_path)}`;
    }
    return null;
  };

  return { links, getLink, getLinkUrl, refetch };
}