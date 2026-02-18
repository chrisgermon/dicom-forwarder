import { Eye, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserImpersonation } from "@/hooks/useUserImpersonation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export function UserImpersonationSelector() {
  const { userRole } = useAuth();
  const { 
    impersonatedUser, 
    impersonateUser, 
    clearImpersonation, 
    isImpersonating 
  } = useUserImpersonation(userRole);
  
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ['users-for-impersonation'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name');
      
      if (error) throw error;
      
      // Fetch roles for all users
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      
      return (profiles || []).map(profile => ({
        ...profile,
        role: roleMap.get(profile.id) || null
      }));
    },
    enabled: userRole === 'super_admin',
  });

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (userRole !== 'super_admin') {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {isImpersonating && impersonatedUser && (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
          Viewing as: {impersonatedUser.full_name || impersonatedUser.email}
        </Badge>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={isImpersonating ? "default" : "outline"} 
            size="sm"
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            View System As
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Impersonate User</DropdownMenuLabel>
          <div className="px-2 pb-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <DropdownMenuSeparator />
          
          <ScrollArea className="h-[300px]">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => impersonateUser(user.id)}
                className={`w-full px-2 py-2 text-left hover:bg-accent rounded-sm flex items-center justify-between ${
                  impersonatedUser?.id === user.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{user.full_name || 'No name'}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                  <Badge variant="secondary" className="text-xs w-fit">
                    {user.role}
                  </Badge>
                </div>
                {impersonatedUser?.id === user.id && (
                  <span className="text-xs text-muted-foreground">Active</span>
                )}
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                No users found
              </div>
            )}
          </ScrollArea>
          
          {isImpersonating && (
            <>
              <DropdownMenuSeparator />
              <button
                onClick={clearImpersonation}
                className="w-full px-2 py-2 text-left hover:bg-accent rounded-sm flex items-center gap-2 text-destructive"
              >
                <X className="w-4 h-4" />
                Clear Impersonation
              </button>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
