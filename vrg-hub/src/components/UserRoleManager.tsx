import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Shield, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAccessControl } from '@/hooks/useAccessControl';
import { toast } from 'sonner';
import { UserPermissionsManager } from '@/components/UserPermissionsManager';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface UserWithRole {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string | null;
}

interface UserForPermissions {
  user_id: string;
  company_id: string;
  name: string;
  email: string;
}

export function UserRoleManager() {
  const { user: _user } = useAuth(); void _user;
  const { isSuperAdmin } = useAccessControl();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<UserForPermissions | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch RBAC roles
      const { data: rbacRoles, error: rbacError } = await supabase
        .from('rbac_roles')
        .select('id, name');
      
      if (rbacError) throw rbacError;

      const roleMap = new Map(rbacRoles?.map(r => [r.id, r.name]) || []);

      // Fetch user roles from RBAC system
      const { data: userRoles, error: rolesError } = await supabase
        .from('rbac_user_roles')
        .select('user_id, role_id');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRoleEntry = userRoles?.find(r => r.user_id === profile.id);
        const roleName = userRoleEntry ? roleMap.get(userRoleEntry.role_id) : null;
        return {
          id: profile.id,
          name: profile.full_name || profile.email || 'Unknown',
          email: profile.email || '',
          role: (roleName as any) || 'requester',
          created_at: profile.created_at
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUserRole = async (userId: string, newRole: 'requester' | 'manager' | 'marketing' | 'marketing_manager' | 'tenant_admin' | 'super_admin') => {
    try {
      // Get role ID from rbac_roles
      const { data: roleData, error: roleError } = await supabase
        .from('rbac_roles')
        .select('id')
        .eq('name', newRole)
        .single();

      if (roleError) throw roleError;
      if (!roleData) throw new Error('Role not found');

      // Delete existing roles for user
      await supabase
        .from('rbac_user_roles')
        .delete()
        .eq('user_id', userId);

      // Insert new role
      const { error } = await supabase
        .from('rbac_user_roles')
        .insert({
          user_id: userId,
          role_id: roleData.id
        });

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, role: newRole as string }
          : u
      ));
      toast.success('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleUserPermissions = (user: UserWithRole) => {
    setSelectedUserForPermissions({
      user_id: user.id,
      company_id: '',
      name: user.name,
      email: user.email
    });
    setIsPermissionsDialogOpen(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'tenant_admin':
        return 'default';
      case 'manager':
        return 'secondary';
      case 'marketing_manager':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'super_admin' || role === 'tenant_admin') {
      return <Shield className="w-3 h-3" />;
    }
    return <Users className="w-3 h-3" />;
  };

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = users.slice(startIndex, endIndex);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Role Management
              </CardTitle>
              <CardDescription>
                Manage user roles and permissions
              </CardDescription>
            </div>
            <Button onClick={fetchUsers} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table storageKey="user-roles">
            <TableHeader>
              <TableRow>
                <TableHead columnId="name">Name</TableHead>
                <TableHead columnId="email">Email</TableHead>
                <TableHead columnId="role">Role</TableHead>
                <TableHead columnId="joined">Joined</TableHead>
                <TableHead columnId="actions">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleIcon(user.role)}
                      <span className="ml-1">{user.role}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.created_at 
                      ? new Date(user.created_at).toLocaleDateString()
                      : 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.role}
                        onValueChange={(value) => updateUserRole(user.id, value as 'requester' | 'manager' | 'marketing' | 'marketing_manager' | 'tenant_admin' | 'super_admin')}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="requester">Requester</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                          <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                          {isSuperAdmin && (
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUserPermissions(user)}
                      >
                        Permissions
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Permissions</DialogTitle>
            <DialogDescription>
              Manage specific permissions for {selectedUserForPermissions?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedUserForPermissions && (
            <UserPermissionsManager
              userId={selectedUserForPermissions.user_id}
              companyId={selectedUserForPermissions.company_id}
              userName={selectedUserForPermissions.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
