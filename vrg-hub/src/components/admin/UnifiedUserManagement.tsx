import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Users, UserPlus, Shield, Mail, Building, RefreshCw } from "lucide-react";

type AppRole = 'requester' | 'manager' | 'marketing_manager' | 'tenant_admin' | 'super_admin' | 'marketing';

interface UnifiedUser {
  id: string;
  email: string;
  display_name: string;
  job_title?: string;
  department?: string;
  source: 'auth' | 'o365';
  is_synced: boolean;
  role?: AppRole;
  is_active: boolean;
}

export function UnifiedUserManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [_selectedUser, setSelectedUser] = useState<UnifiedUser | null>(null); void _selectedUser;
  const [selectedRole, setSelectedRole] = useState<AppRole>('requester');

  // Fetch all users (both auth and O365 synced)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['unified-users'],
    queryFn: async () => {
      // Fetch auth users
      const { data: authResponse, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;
      const authUsers = authResponse?.users || [];

      // Fetch O365 synced users
      const { data: o365Users, error: o365Error } = await supabase
        .from('synced_office365_users')
        .select('*')
        .eq('is_active', true);
      if (o365Error) throw o365Error;

      // Fetch user roles from RBAC system
      const { data: rbacRoles, error: rbacError } = await supabase
        .from('rbac_roles')
        .select('id, name');
      if (rbacError) throw rbacError;

      const roleNameMap = new Map(rbacRoles?.map(r => [r.id, r.name]) || []);

      const { data: userRoles, error: rolesError } = await supabase
        .from('rbac_user_roles')
        .select('user_id, role_id');
      if (rolesError) throw rolesError;

      const roleMap = new Map(
        userRoles?.map(r => [r.user_id, roleNameMap.get(r.role_id)]) || []
      );

      // Create unified list
      const unifiedUsers: UnifiedUser[] = [];

      // Add auth users
      authUsers.forEach(authUser => {
        unifiedUsers.push({
          id: authUser.id,
          email: authUser.email || '',
          display_name: authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || authUser.email || '',
          source: 'auth',
          is_synced: authUser.user_metadata?.imported_from_o365 === true,
          role: roleMap.get(authUser.id) as AppRole,
          is_active: true,
        });
      });

      // Add O365 users that don't have auth accounts yet
      o365Users?.forEach(o365User => {
        const existsInAuth = unifiedUsers.some(u => u.email === o365User.mail);
        if (!existsInAuth && o365User.mail) {
          unifiedUsers.push({
            id: o365User.id,
            email: o365User.mail,
            display_name: o365User.display_name || o365User.mail,
            job_title: o365User.job_title,
            department: o365User.department,
            source: 'o365',
            is_synced: false,
            is_active: true,
          });
        }
      });

      return unifiedUsers.sort((a, b) => a.display_name.localeCompare(b.display_name));
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Get role ID from rbac_roles
      const { data: roleData, error: roleError } = await supabase
        .from('rbac_roles')
        .select('id')
        .eq('name', role)
        .single();

      if (roleError) throw roleError;
      if (!roleData) throw new Error('Role not found');

      // Check if user already has this role
      const { data: existing } = await supabase
        .from('rbac_user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', roleData.id)
        .maybeSingle();

      if (existing) {
        // Already exists, no action needed
        return;
      }

      // Delete existing roles for user (only one role per user)
      await supabase
        .from('rbac_user_roles')
        .delete()
        .eq('user_id', userId);

      // Insert new role
      const { error } = await supabase
        .from('rbac_user_roles')
        .insert([{ user_id: userId, role_id: roleData.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-users'] });
      toast.success('Role assigned successfully');
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign role');
    },
  });

  const createAuthUserMutation = useMutation({
    mutationFn: async (o365User: UnifiedUser) => {
      // Create auth user from O365 data
      const { data, error } = await supabase.auth.admin.createUser({
        email: o365User.email,
        email_confirm: true,
        user_metadata: {
          display_name: o365User.display_name,
          full_name: o365User.display_name,
          imported_from_o365: true,
          job_title: o365User.job_title,
          department: o365User.department,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-users'] });
      toast.success('User created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create user');
    },
  });

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Unified User Management
              </CardTitle>
              <CardDescription>
                Manage all users including Office 365 synced users and system permissions
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['unified-users'] })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{users.filter(u => u.source === 'auth').length} Auth Users</Badge>
              <Badge variant="outline">{users.filter(u => u.source === 'o365' && !u.is_synced).length} O365 Only</Badge>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.display_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.department && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          {user.department}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.source === 'auth' ? 'default' : 'secondary'}>
                        {user.source === 'auth' ? (user.is_synced ? 'Auth (O365)' : 'Auth') : 'O365 Only'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role ? (
                        <Badge variant="outline" className="capitalize">
                          {user.role.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No role</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.source === 'auth' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setSelectedRole(user.role || 'requester');
                                }}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Manage Role
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Manage User Role</DialogTitle>
                                <DialogDescription>
                                  Assign system permissions for {user.display_name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                  <Label>System Role</Label>
                                  <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="requester">Requester</SelectItem>
                                      <SelectItem value="manager">Manager</SelectItem>
                                      <SelectItem value="marketing">Marketing</SelectItem>
                                      <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                                      <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                                      <SelectItem value="super_admin">Super Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  onClick={() => assignRoleMutation.mutate({ userId: user.id, role: selectedRole })}
                                  disabled={assignRoleMutation.isPending}
                                  className="w-full"
                                >
                                  {assignRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                  Assign Role
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {user.source === 'o365' && !user.is_synced && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => createAuthUserMutation.mutate(user)}
                            disabled={createAuthUserMutation.isPending}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create Auth User
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No users found matching your search
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
