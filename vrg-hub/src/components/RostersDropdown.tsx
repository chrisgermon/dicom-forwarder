import { useState, useEffect } from "react";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RosterData {
  staffRoster: { name: string; webUrl: string } | null;
  radiologistRoster: { name: string; webUrl: string } | null;
  loading: boolean;
  error: string | null;
}

// Custom hook for fetching roster data from cache
function useRosterData() {
  const [rosterData, setRosterData] = useState<RosterData>({
    staffRoster: null,
    radiologistRoster: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchRosters = async () => {
      try {
        // Fetch from cache table using rpc or direct fetch to avoid type issues
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/roster_cache?select=roster_type,file_name,web_url,cached_at`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch roster cache");
        }

        const data = await response.json();

        let staffRoster: { name: string; webUrl: string } | null = null;
        let radiologistRoster: { name: string; webUrl: string } | null = null;

        if (data && Array.isArray(data)) {
          const staffData = data.find((r: any) => r.roster_type === "staff");
          const radiologistData = data.find((r: any) => r.roster_type === "radiologist");

          if (staffData?.web_url && staffData?.file_name) {
            staffRoster = { name: staffData.file_name, webUrl: staffData.web_url };
          }

          if (radiologistData?.web_url && radiologistData?.file_name) {
            radiologistRoster = { name: radiologistData.file_name, webUrl: radiologistData.web_url };
          }
        }

        setRosterData({
          staffRoster,
          radiologistRoster,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching rosters from cache:", error);
        setRosterData((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to load rosters",
        }));
      }
    };

    fetchRosters();
  }, []);

  return rosterData;
}

const handleOpenRoster = (roster: { name: string; webUrl: string } | null, type: string) => {
  if (!roster) {
    toast.error(`No ${type} roster available`);
    return;
  }
  window.open(roster.webUrl, "_blank");
};

// Desktop dropdown content (just the menu items, without sub-menu wrapper)
export function RostersDropdownContent() {
  const rosterData = useRosterData();

  if (rosterData.loading) {
    return (
      <DropdownMenuItem disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </DropdownMenuItem>
    );
  }

  if (!rosterData.staffRoster && !rosterData.radiologistRoster) {
    return (
      <DropdownMenuItem disabled className="text-muted-foreground">
        No rosters available
      </DropdownMenuItem>
    );
  }

  return (
    <>
      <DropdownMenuItem
        onClick={() => handleOpenRoster(rosterData.staffRoster, "Staff")}
        className="cursor-pointer"
        disabled={!rosterData.staffRoster}
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        Staff Roster
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => handleOpenRoster(rosterData.radiologistRoster, "Radiologist")}
        className="cursor-pointer"
        disabled={!rosterData.radiologistRoster}
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        Radiologist Roster
      </DropdownMenuItem>
    </>
  );
}

// Mobile sub-menu version (with sub-menu wrapper for nested dropdown)
export function RostersDropdown() {
  const rosterData = useRosterData();

  if (rosterData.loading) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="cursor-pointer">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Rosters
        </DropdownMenuSubTrigger>
      </DropdownMenuSub>
    );
  }

  // Don't show dropdown if no rosters are available
  if (!rosterData.staffRoster && !rosterData.radiologistRoster) {
    return null;
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer">
        <FileText className="mr-2 h-4 w-4" />
        Rosters
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-48 bg-popover">
        <DropdownMenuItem
          onClick={() => handleOpenRoster(rosterData.staffRoster, "Staff")}
          className="cursor-pointer"
          disabled={!rosterData.staffRoster}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Staff Roster
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleOpenRoster(rosterData.radiologistRoster, "Radiologist")}
          className="cursor-pointer"
          disabled={!rosterData.radiologistRoster}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Radiologist Roster
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
