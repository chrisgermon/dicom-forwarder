import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClinicSetupChecklists } from "@/hooks/useClinicSetupChecklists";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Trash2, UserPlus, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function ClinicSetupPermissionsPanel({ checklistId }: { checklistId: string }) {
  const { fetchPermissions, grantPermission, revokePermission } = useClinicSetupChecklists();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<"view" | "edit" | "admin">("view");

  const { data: permissions, isLoading: permissionsLoading, refetch } = useQuery({
    queryKey: ["clinic-setup-permissions", checklistId],
    queryFn: () => fetchPermissions(checklistId),
    enabled: !!checklistId,
  });

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  const handleGrantPermission = async () => {
    if (!selectedUserId) return;
    
    await grantPermission.mutateAsync({
      checklist_id: checklistId,
      user_id: selectedUserId,
      permission_level: selectedLevel,
    });
    
    setSelectedUserId(null);
    setIsAddOpen(false);
    refetch();
  };

  const handleRevokePermission = async (permissionId: string) => {
    await revokePermission.mutateAsync(permissionId);
    refetch();
  };

  const existingUserIds = permissions?.map(p => p.user_id) || [];
  const availableProfiles = profiles?.filter(p => !existingUserIds.includes(p.id)) || [];

  const getPermissionBadgeVariant = (level: string) => {
    switch (level) {
      case "admin":
        return "default";
      case "edit":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (permissionsLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>User Permissions</span>
          <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
            <PopoverTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Select User</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedUserId
                          ? availableProfiles.find(p => p.id === selectedUserId)?.full_name || "Unknown"
                          : "Select user..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search users..." />
                        <CommandList>
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            {availableProfiles.map((profile) => (
                              <CommandItem
                                key={profile.id}
                                value={profile.full_name || profile.email || ""}
                                onSelect={() => setSelectedUserId(profile.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedUserId === profile.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div>
                                  <p>{profile.full_name || "Unknown"}</p>
                                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Permission Level</p>
                  <Select value={selectedLevel} onValueChange={(v: "view" | "edit" | "admin") => setSelectedLevel(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View Only</SelectItem>
                      <SelectItem value="edit">Can Edit</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={handleGrantPermission}
                  disabled={!selectedUserId || grantPermission.isPending}
                >
                  {grantPermission.isPending ? "Adding..." : "Add Permission"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </CardTitle>
        <CardDescription>
          Manage who can view and edit this checklist. Users with permissions will receive email notifications when items are updated.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!permissions || permissions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No users have been granted access yet.
          </p>
        ) : (
          <div className="space-y-2">
            {permissions.map((permission) => (
              <div
                key={permission.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {(permission.profile as { full_name?: string })?.full_name || "Unknown User"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(permission.profile as { email?: string })?.email || "No email"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getPermissionBadgeVariant(permission.permission_level)}>
                    {permission.permission_level}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevokePermission(permission.id)}
                    disabled={revokePermission.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
