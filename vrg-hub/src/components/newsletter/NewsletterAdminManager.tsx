import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X, Loader2, Shield } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface NewsletterAdmin {
  user_id: string;
  profile: User;
}

export function NewsletterAdminManager() {
  const [admins, setAdmins] = useState<NewsletterAdmin[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [roleId, setRoleId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get the newsletter_admin role ID
      const { data: roleData, error: roleError } = await supabase
        .from("rbac_roles")
        .select("id")
        .eq("name", "newsletter_admin")
        .single();

      if (roleError) {
        console.error("Error fetching role:", roleError);
        toast.error("Newsletter admin role not found");
        setLoading(false);
        return;
      }

      setRoleId(roleData.id);

      // Get current newsletter admins
      const { data: adminData, error: adminError } = await supabase
        .from("rbac_user_roles")
        .select("user_id")
        .eq("role_id", roleData.id);

      if (adminError) throw adminError;

      // Fetch profiles for admin user IDs
      const adminUserIds = (adminData || []).map((item: any) => item.user_id);
      
      let formattedAdmins: NewsletterAdmin[] = [];
      
      if (adminUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", adminUserIds);
        
        if (profilesError) throw profilesError;
        
        formattedAdmins = adminUserIds.map((userId: string) => ({
          user_id: userId,
          profile: (profilesData || []).find((p: User) => p.id === userId) || { id: userId, full_name: null, email: null },
        }));
      }
      
      setAdmins(formattedAdmins);

      // Get all users for the dropdown
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");

      if (usersError) throw usersError;

      // Filter out users who are already admins
      const adminIds = new Set(formattedAdmins.map((a: NewsletterAdmin) => a.user_id));
      setAvailableUsers((usersData || []).filter((u: User) => !adminIds.has(u.id)));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load newsletter admins");
    } finally {
      setLoading(false);
    }
  };

  const addAdmin = async (userId: string) => {
    if (!roleId) return;

    setAdding(true);
    try {
      const { error } = await supabase.from("rbac_user_roles").insert({
        user_id: userId,
        role_id: roleId,
      });

      if (error) throw error;

      toast.success("Newsletter admin added");
      setOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error adding admin:", error);
      toast.error("Failed to add newsletter admin");
    } finally {
      setAdding(false);
    }
  };

  const removeAdmin = async (userId: string) => {
    if (!roleId) return;

    setRemoving(userId);
    try {
      const { error } = await supabase
        .from("rbac_user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role_id", roleId);

      if (error) throw error;

      toast.success("Newsletter admin removed");
      fetchData();
    } catch (error) {
      console.error("Error removing admin:", error);
      toast.error("Failed to remove newsletter admin");
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Newsletter Admins
            </CardTitle>
            <CardDescription>
              Manage who can administer newsletters and approve submissions
            </CardDescription>
          </div>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" disabled={adding}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[300px]" align="end">
              <Command>
                <CommandInput placeholder="Search users..." />
                <CommandList>
                  <CommandEmpty>No users found.</CommandEmpty>
                  <CommandGroup>
                    {availableUsers.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={`${user.full_name} ${user.email}`}
                        onSelect={() => addAdmin(user.id)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{user.full_name || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        {admins.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No newsletter admins assigned yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {admins.map((admin) => (
              <Badge
                key={admin.user_id}
                variant="secondary"
                className="pl-3 pr-1 py-1.5 flex items-center gap-2"
              >
                <span>{admin.profile?.full_name || admin.profile?.email || "Unknown"}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 hover:bg-destructive/20"
                  onClick={() => removeAdmin(admin.user_id)}
                  disabled={removing === admin.user_id}
                >
                  {removing === admin.user_id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
