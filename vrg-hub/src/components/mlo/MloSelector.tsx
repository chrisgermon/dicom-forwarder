import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";

interface MloUser {
  id: string;
  full_name: string;
  email: string;
}

interface MloSelectorProps {
  value: string | null;
  onChange: (mloId: string | null) => void;
  className?: string;
}

// Fetch MLO users (those with marketing role assignments)
function useMloUsers() {
  return useQuery({
    queryKey: ['mlo-users-for-selector'],
    queryFn: async () => {
      // Get users who have MLO assignments
      const { data, error } = await supabase
        .from('mlo_assignments')
        .select(`
          user_id,
          user:profiles!mlo_assignments_user_id_fkey(id, full_name, email)
        `)
        .order('user_id');

      if (error) throw error;

      // Deduplicate by user_id and extract user data
      const uniqueUsers = new Map<string, MloUser>();
      data.forEach(assignment => {
        if (assignment.user && !uniqueUsers.has(assignment.user_id)) {
          uniqueUsers.set(assignment.user_id, assignment.user as MloUser);
        }
      });

      return Array.from(uniqueUsers.values()).sort((a, b) => 
        (a.full_name || '').localeCompare(b.full_name || '')
      );
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function MloSelector({ value, onChange, className }: MloSelectorProps) {
  const { data: mloUsers, isLoading } = useMloUsers();

  const selectedMlo = useMemo(() => {
    if (!value || !mloUsers) return null;
    return mloUsers.find(u => u.id === value);
  }, [value, mloUsers]);

  return (
    <Select
      value={value || "all"}
      onValueChange={(val) => onChange(val === "all" ? null : val)}
    >
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <SelectValue>
            {isLoading ? "Loading..." : (selectedMlo?.full_name || "All MLOs")}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All MLOs</SelectItem>
        {mloUsers?.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.full_name || user.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
