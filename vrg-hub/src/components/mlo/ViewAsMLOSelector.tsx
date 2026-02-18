import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMloRole } from "@/hooks/useMloRole";
import { useAccessControl } from "@/hooks/useAccessControl";

interface MloUser {
  id: string;
  full_name: string | null;
  email: string;
}

interface ViewAsMLOSelectorProps {
  value: string | null;
  onChange: (userId: string | null, userName: string | null) => void;
}

// Fetch all MLO users (those with marketing role)
function useMloUsers() {
  return useQuery({
    queryKey: ['mlo-users-view-as'],
    queryFn: async () => {
      // Get users who have the marketing role
      const { data, error } = await supabase
        .from('rbac_user_roles')
        .select(`
          user_id,
          role:rbac_roles!inner(name)
        `)
        .eq('role.name', 'marketing');

      if (error) throw error;

      // Get the user profiles
      const userIds = [...new Set(data.map(r => r.user_id))];
      
      if (userIds.length === 0) return [];

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
        .order('full_name');

      if (profileError) throw profileError;

      return profiles as MloUser[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function ViewAsMLOSelector({ value, onChange }: ViewAsMLOSelectorProps) {
  const { isSuperAdmin, isTenantAdmin } = useAccessControl();
  const { isMloManager } = useMloRole();
  const { data: mloUsers, isLoading } = useMloUsers();

  // Only show for admins
  const canViewAs = isSuperAdmin || isTenantAdmin || isMloManager;

  if (!canViewAs) return null;

  const selectedUser = mloUsers?.find(u => u.id === value);

  if (value && selectedUser) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <Eye className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
          Viewing as: {selectedUser.full_name || selectedUser.email}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-amber-500/20"
          onClick={() => onChange(null, null)}
        >
          <X className="h-4 w-4 text-amber-600" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Eye className="h-3 w-3" />
        Admin
      </Badge>
      <Select
        value={value || ""}
        onValueChange={(val) => {
          if (val) {
            const user = mloUsers?.find(u => u.id === val);
            onChange(val, user?.full_name || user?.email || null);
          }
        }}
      >
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue placeholder={isLoading ? "Loading..." : "View as MLO..."} />
        </SelectTrigger>
        <SelectContent>
          {mloUsers?.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.full_name || user.email}
            </SelectItem>
          ))}
          {mloUsers?.length === 0 && (
            <div className="px-2 py-1 text-sm text-muted-foreground">
              No MLO users found
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
