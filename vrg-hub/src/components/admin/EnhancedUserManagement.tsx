import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ResizableTable, 
  ResizableTableBody, 
  ResizableTableCell, 
  ResizableTableHead, 
  ResizableTableHeader, 
  ResizableTableRow 
} from "@/components/ui/table-resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Loader2, Users, UserPlus, Shield, Mail, Briefcase, RefreshCw, 
  UserCheck, UserX, Clock, Filter, ChevronDown, CheckSquare,
  AlertCircle, Cloud, HardDrive, Download, Building, Edit, Key
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RBACUserPermissionsManager } from "@/components/rbac/RBACUserPermissionsManager";
import { RBACEffectivePermissions } from "@/components/rbac/RBACEffectivePermissions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AzureSyncStatus } from "./AzureSyncStatus";

type AppRole = 'requester' | 'manager' | 'marketing_manager' | 'tenant_admin' | 'super_admin' | 'marketing';

const ROLE_OPTIONS: { value: AppRole; label: string; description: string }[] = [
  { value: 'requester', label: 'Requester', description: 'Basic user access' },
  { value: 'marketing', label: 'Marketing', description: 'Marketing team member' },
  { value: 'manager', label: 'Manager', description: 'Department manager' },
  { value: 'marketing_manager', label: 'Marketing Manager', description: 'Marketing team lead' },
  { value: 'tenant_admin', label: 'Tenant Admin', description: 'Organization administrator' },
  { value: 'super_admin', label: 'Super Admin', description: 'Full system access' },
];

interface UnifiedUser {
  id: string;
  email: string;
  display_name: string;
  job_title?: string;
  department?: string;
  source: 'local' | 'azure';
  has_auth_account: boolean;
  role?: AppRole;
  is_active: boolean;
  last_login?: string;
  created_at?: string;
  avatar_url?: string;
  o365_department?: string; // Original department from O365
}

type FilterSource = 'all' | 'local' | 'azure';
type FilterRole = 'all' | AppRole | 'none';
type FilterStatus = 'all' | 'active' | 'inactive' | 'pending';

export function EnhancedUserManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<AppRole>('requester');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [selectedUserForRole, setSelectedUserForRole] = useState<UnifiedUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('requester');
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UnifiedUser | null>(null);
  const [editDepartment, setEditDepartment] = useState('');
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<UnifiedUser | null>(null);

  // Fetch all users (both auth and O365 synced)
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['enhanced-unified-users'],
    queryFn: async () => {
      // Fetch profiles (which includes last_login)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      if (profilesError) throw profilesError;

      // Fetch O365 synced users
      const { data: o365Users, error: o365Error } = await supabase
        .from('synced_office365_users')
        .select('*');
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

      // Create a map of O365 users by email for quick lookup
      const o365Map = new Map(
        o365Users?.map(u => [u.mail?.toLowerCase(), u]) || []
      );

      // Create unified list
      const unifiedUsers: UnifiedUser[] = [];
      const processedEmails = new Set<string>();

      // Add profile users (these are authenticated users)
      profiles?.forEach(profile => {
        const email = profile.email?.toLowerCase() || '';
        const o365Data = o365Map.get(email);
        processedEmails.add(email);
        
        unifiedUsers.push({
          id: profile.id,
          email: profile.email || '',
          display_name: profile.full_name || profile.email || '',
          department: profile.department || o365Data?.department,
          job_title: o365Data?.job_title,
          source: profile.imported_from_o365 ? 'azure' : 'local',
          has_auth_account: true,
          role: roleMap.get(profile.id) as AppRole,
          is_active: profile.is_active !== false,
          last_login: profile.last_login,
          created_at: profile.created_at,
          avatar_url: profile.avatar_url,
          o365_department: o365Data?.department, // Store original O365 department
        });
      });

      // Add O365 users that don't have auth accounts yet
      o365Users?.forEach(o365User => {
        const email = o365User.mail?.toLowerCase() || '';
        if (!processedEmails.has(email) && o365User.mail) {
          unifiedUsers.push({
            id: o365User.id,
            email: o365User.mail,
            display_name: o365User.display_name || o365User.mail,
            job_title: o365User.job_title,
            department: o365User.department,
            source: 'azure',
            has_auth_account: false,
            is_active: o365User.is_active !== false,
            created_at: o365User.created_at,
          });
        }
      });

      return unifiedUsers.sort((a, b) => a.display_name.localeCompare(b.display_name));
    },
  });

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Text search
      const matchesSearch = 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Source filter
      const matchesSource = filterSource === 'all' || user.source === filterSource;
      
      // Role filter
      const matchesRole = 
        filterRole === 'all' || 
        (filterRole === 'none' && !user.role) ||
        user.role === filterRole;
      
      // Status filter
      let matchesStatus = true;
      if (filterStatus === 'active') matchesStatus = user.is_active && user.has_auth_account;
      if (filterStatus === 'inactive') matchesStatus = !user.is_active;
      if (filterStatus === 'pending') matchesStatus = !user.has_auth_account || !user.role;
      
      return matchesSearch && matchesSource && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filterSource, filterRole, filterStatus]);

  // Toggle selection
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  // Select all visible
  const selectAllVisible = () => {
    const authUsers = filteredUsers.filter(u => u.has_auth_account);
    setSelectedUsers(new Set(authUsers.map(u => u.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedUsers(new Set());
  };

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data: roleData, error: roleError } = await supabase
        .from('rbac_roles')
        .select('id')
        .eq('name', role)
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
        .insert([{ user_id: userId, role_id: roleData.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-unified-users'] });
      toast.success('Role assigned successfully');
      setSelectedUserForRole(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign role');
    },
  });

  // Bulk assign role mutation
  const bulkAssignRoleMutation = useMutation({
    mutationFn: async ({ userIds, role }: { userIds: string[]; role: AppRole }) => {
      const { data: roleData, error: roleError } = await supabase
        .from('rbac_roles')
        .select('id')
        .eq('name', role)
        .single();

      if (roleError) throw roleError;
      if (!roleData) throw new Error('Role not found');

      // Process each user
      for (const userId of userIds) {
        await supabase
          .from('rbac_user_roles')
          .delete()
          .eq('user_id', userId);

        await supabase
          .from('rbac_user_roles')
          .insert([{ user_id: userId, role_id: roleData.id }]);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-unified-users'] });
      toast.success(`Role assigned to ${variables.userIds.length} users`);
      setSelectedUsers(new Set());
      setShowBulkDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign roles');
    },
  });

  // Toggle user active status
  const toggleActiveStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-unified-users'] });
      toast.success('User status updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user status');
    },
  });

  // Update department mutation
  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ userId, department }: { userId: string; department: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ department })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-unified-users'] });
      toast.success('Department updated');
      setSelectedUserForDetails(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update department');
    },
  });

  // Get stats
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.is_active && u.has_auth_account).length,
    azure: users.filter(u => u.source === 'azure').length,
    local: users.filter(u => u.source === 'local').length,
    pendingRole: users.filter(u => u.has_auth_account && !u.role).length,
    pendingAuth: users.filter(u => !u.has_auth_account).length,
  }), [users]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeVariant = (role?: AppRole) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'tenant_admin': return 'default';
      case 'manager':
      case 'marketing_manager': return 'secondary';
      default: return 'outline';
    }
  };

  // Export users with permissions to CSV
  const exportUsersToCSV = async () => {
    try {
      toast.info('Generating export...');
      
      // Fetch active users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, department, is_active')
        .eq('is_active', true);
      
      const { data: userRoles } = await supabase
        .from('rbac_user_roles')
        .select('user_id, role:rbac_roles(name)');
      
      const { data: rolePerms } = await supabase
        .from('rbac_role_permissions')
        .select('role_id, permission:rbac_permissions(resource, action)');
      
      const { data: roles } = await supabase
        .from('rbac_roles')
        .select('id, name');
      
      // Build role -> permissions map
      const rolePermMap = new Map<string, string[]>();
      rolePerms?.forEach(rp => {
        const perm = rp.permission as { resource: string; action: string } | null;
        if (perm) {
          const existing = rolePermMap.get(rp.role_id) || [];
          existing.push(`${perm.resource}:${perm.action}`);
          rolePermMap.set(rp.role_id, existing);
        }
      });
      
      // Build user -> role map
      const userRoleMap = new Map<string, string>();
      userRoles?.forEach(ur => {
        const role = ur.role as { name: string } | null;
        if (role) {
          userRoleMap.set(ur.user_id, role.name);
        }
      });
      
      // Build role name -> id map
      const roleIdMap = new Map<string, string>();
      roles?.forEach(r => roleIdMap.set(r.name, r.id));
      
      // Build CSV data
      const csvRows = [
        ['Email', 'Full Name', 'Department', 'Role', 'Permissions'].join(',')
      ];
      
      profiles?.forEach(profile => {
        const roleName = userRoleMap.get(profile.id) || 'None';
        const roleId = roleIdMap.get(roleName);
        const permissions = roleId ? (rolePermMap.get(roleId) || []).join('; ') : '';
        
        csvRows.push([
          `"${profile.email || ''}"`,
          `"${profile.full_name || ''}"`,
          `"${profile.department || ''}"`,
          `"${roleName}"`,
          `"${permissions}"`
        ].join(','));
      });
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users-permissions-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${profiles?.length || 0} users to CSV`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export users');
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h3 className="font-semibold">Failed to load users</h3>
              <p className="text-muted-foreground text-sm">{(error as Error).message}</p>
            </div>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['enhanced-unified-users'] })}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Azure Sync Status + Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <AzureSyncStatus />
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Cloud className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.azure}</p>
                <p className="text-xs text-muted-foreground">Azure Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <HardDrive className="h-8 w-8 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{stats.local}</p>
                <p className="text-xs text-muted-foreground">Local Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingRole}</p>
                <p className="text-xs text-muted-foreground">Need Role</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingAuth}</p>
                <p className="text-xs text-muted-foreground">O365 Only</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Unified view of all users - Local and Azure/Office 365
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportUsersToCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['enhanced-unified-users'] })}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Row */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by name, email, or job title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterSource} onValueChange={(v) => setFilterSource(v as FilterSource)}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="azure">Azure/O365</SelectItem>
                <SelectItem value="local">Local</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={(v) => setFilterRole(v as FilterRole)}>
              <SelectTrigger className="w-[160px]">
                <Shield className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="none">No Role</SelectItem>
                {ROLE_OPTIONS.map(role => (
                  <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="w-[140px]">
                <UserCheck className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Needs Attention</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions Bar */}
          {selectedUsers.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <CheckSquare className="h-5 w-5 text-primary" />
              <span className="font-medium">{selectedUsers.size} selected</span>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear Selection
              </Button>
              <Button size="sm" onClick={() => setShowBulkDialog(true)}>
                <Shield className="h-4 w-4 mr-2" />
                Assign Role
              </Button>
            </div>
          )}

          {/* Table */}
          <div className="border rounded-lg">
            <ScrollArea className="h-[500px]">
              <ResizableTable storageKey="enhanced-user-management" defaultColumnWidths={{ select: 50, user: 280, department: 180, source: 100, role: 140, status: 120, lastLogin: 140, actions: 100 }}>
                <ResizableTableHeader>
                  <ResizableTableRow>
                    <ResizableTableHead columnId="select" minWidth={40} maxWidth={60}>
                      <Checkbox
                        checked={selectedUsers.size > 0 && selectedUsers.size === filteredUsers.filter(u => u.has_auth_account).length}
                        onCheckedChange={(checked) => checked ? selectAllVisible() : clearSelection()}
                      />
                    </ResizableTableHead>
                    <ResizableTableHead columnId="user" minWidth={200} maxWidth={400}>User</ResizableTableHead>
                    <ResizableTableHead columnId="department" minWidth={120} maxWidth={300}>Department / Title</ResizableTableHead>
                    <ResizableTableHead columnId="source" minWidth={80} maxWidth={150}>Source</ResizableTableHead>
                    <ResizableTableHead columnId="role" minWidth={100} maxWidth={200}>Role</ResizableTableHead>
                    <ResizableTableHead columnId="status" minWidth={100} maxWidth={180}>Status</ResizableTableHead>
                    <ResizableTableHead columnId="lastLogin" minWidth={100} maxWidth={200}>Last Login</ResizableTableHead>
                    <ResizableTableHead columnId="actions" minWidth={80} maxWidth={150}>Actions</ResizableTableHead>
                  </ResizableTableRow>
                </ResizableTableHeader>
                <ResizableTableBody>
                  {isLoading ? (
                    <ResizableTableRow>
                      <ResizableTableCell colSpan={8} className="h-32">
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      </ResizableTableCell>
                    </ResizableTableRow>
                  ) : filteredUsers.length === 0 ? (
                    <ResizableTableRow>
                      <ResizableTableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        No users found matching your filters
                      </ResizableTableCell>
                    </ResizableTableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <ResizableTableRow key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
                        <ResizableTableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                            disabled={!user.has_auth_account}
                          />
                        </ResizableTableCell>
                        <ResizableTableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs">
                                {getInitials(user.display_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{user.display_name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </p>
                            </div>
                          </div>
                        </ResizableTableCell>
                        <ResizableTableCell>
                          <div className="space-y-0.5">
                            {user.department && (
                              <div className="flex items-center gap-1 text-sm">
                                <Building className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate font-medium">{user.department}</span>
                              </div>
                            )}
                            {user.job_title && (
                              <p className="text-xs text-muted-foreground truncate pl-4">{user.job_title}</p>
                            )}
                            {!user.department && !user.job_title && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </ResizableTableCell>
                        <ResizableTableCell>
                          <Badge variant={user.source === 'azure' ? 'default' : 'secondary'} className="gap-1">
                            {user.source === 'azure' ? (
                              <><Cloud className="h-3 w-3" /> Azure</>
                            ) : (
                              <><HardDrive className="h-3 w-3" /> Local</>
                            )}
                          </Badge>
                        </ResizableTableCell>
                        <ResizableTableCell>
                          {user.role ? (
                            <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                              {user.role.replace(/_/g, ' ')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                              No role
                            </Badge>
                          )}
                        </ResizableTableCell>
                        <ResizableTableCell>
                          {!user.has_auth_account ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1">
                              <UserPlus className="h-3 w-3" /> O365 Only
                            </Badge>
                          ) : user.is_active ? (
                            <Badge variant="outline" className="text-green-600 border-green-300 gap-1">
                              <UserCheck className="h-3 w-3" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-300 gap-1">
                              <UserX className="h-3 w-3" /> Inactive
                            </Badge>
                          )}
                        </ResizableTableCell>
                        <ResizableTableCell>
                          {user.last_login ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span className="truncate">{formatDistanceToNow(new Date(user.last_login), { addSuffix: true })}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Never</span>
                          )}
                        </ResizableTableCell>
                        <ResizableTableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Actions
                                <ChevronDown className="h-4 w-4 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.has_auth_account ? (
                                <>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedUserForDetails(user);
                                    setEditDepartment(user.department || '');
                                  }}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedUserForRole(user);
                                    setSelectedRole(user.role || 'requester');
                                  }}>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Manage Role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setSelectedUserForPermissions(user)}>
                                    <Key className="h-4 w-4 mr-2" />
                                    Manage Permissions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => toggleActiveStatusMutation.mutate({ 
                                      userId: user.id, 
                                      isActive: !user.is_active 
                                    })}
                                  >
                                    {user.is_active ? (
                                      <><UserX className="h-4 w-4 mr-2" /> Deactivate</>
                                    ) : (
                                      <><UserCheck className="h-4 w-4 mr-2" /> Activate</>
                                    )}
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem className="text-muted-foreground" disabled>
                                  User must log in via Azure first
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </ResizableTableCell>
                      </ResizableTableRow>
                    ))
                  )}
                </ResizableTableBody>
              </ResizableTable>
            </ScrollArea>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardContent>
      </Card>

      {/* Single User Role Dialog */}
      <Dialog open={!!selectedUserForRole} onOpenChange={() => setSelectedUserForRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Role</DialogTitle>
            <DialogDescription>
              Assign a role for {selectedUserForRole?.display_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-3">
              <Label>Select Role</Label>
              {ROLE_OPTIONS.map(role => (
                <div 
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedRole === role.value 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{role.label}</p>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    {selectedRole === role.value && (
                      <CheckSquare className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => selectedUserForRole && assignRoleMutation.mutate({ 
                userId: selectedUserForRole.id, 
                role: selectedRole 
              })}
              disabled={assignRoleMutation.isPending}
            >
              {assignRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Role Assignment Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Role Assignment</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedUsers.size} selected users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Role to assign</Label>
              <Select value={bulkRole} onValueChange={(v) => setBulkRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <span className="font-medium">{role.label}</span>
                        <span className="text-muted-foreground ml-2">- {role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                This will assign the <strong>{bulkRole.replace(/_/g, ' ')}</strong> role to {selectedUsers.size} users,
                replacing any existing roles.
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => bulkAssignRoleMutation.mutate({ 
                userIds: Array.from(selectedUsers), 
                role: bulkRole 
              })}
              disabled={bulkAssignRoleMutation.isPending}
            >
              {bulkAssignRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign to {selectedUsers.size} Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUserForDetails} onOpenChange={() => setSelectedUserForDetails(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit User Details
            </DialogTitle>
            <DialogDescription>
              Update local details for {selectedUserForDetails?.display_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* User Info Summary */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{selectedUserForDetails?.email}</span>
              </div>
              {selectedUserForDetails?.job_title && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedUserForDetails.job_title}</span>
                  <Badge variant="outline" className="text-xs">From Azure</Badge>
                </div>
              )}
              {selectedUserForDetails?.source === 'azure' && selectedUserForDetails?.o365_department && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Cloud className="h-4 w-4" />
                  <span>Azure dept: {selectedUserForDetails.o365_department}</span>
                </div>
              )}
            </div>

            {/* Department Edit */}
            <div className="space-y-2">
              <Label htmlFor="edit-department" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Department
              </Label>
              <Input
                id="edit-department"
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                placeholder="Enter department"
              />
              <p className="text-xs text-muted-foreground">
                This is stored locally and won't sync back to Azure AD
              </p>
            </div>

            {/* Role Info (Read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Current Role
              </Label>
              <div className="flex items-center gap-2">
                {selectedUserForDetails?.role ? (
                  <Badge variant={getRoleBadgeVariant(selectedUserForDetails.role)} className="capitalize">
                    {selectedUserForDetails.role.replace(/_/g, ' ')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-yellow-600">No role assigned</Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    if (selectedUserForDetails) {
                      setSelectedUserForRole(selectedUserForDetails);
                      setSelectedRole(selectedUserForDetails.role || 'requester');
                      setSelectedUserForDetails(null);
                    }
                  }}
                >
                  Change
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => selectedUserForDetails && updateDepartmentMutation.mutate({ 
                userId: selectedUserForDetails.id, 
                department: editDepartment 
              })}
              disabled={updateDepartmentMutation.isPending}
            >
              {updateDepartmentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Permissions Dialog */}
      <Dialog open={!!selectedUserForPermissions} onOpenChange={() => setSelectedUserForPermissions(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Manage Permissions: {selectedUserForPermissions?.display_name}
            </DialogTitle>
            <DialogDescription>
              View effective permissions and set user-specific overrides. Overrides take precedence over role-based permissions.
            </DialogDescription>
          </DialogHeader>
          {selectedUserForPermissions && (
            <Tabs defaultValue="overrides" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overrides">Permission Overrides</TabsTrigger>
                <TabsTrigger value="effective">Effective Permissions</TabsTrigger>
              </TabsList>
              <TabsContent value="overrides" className="flex-1 overflow-auto mt-4">
                <RBACUserPermissionsManager 
                  userId={selectedUserForPermissions.id} 
                  onUpdate={() => {}} 
                />
              </TabsContent>
              <TabsContent value="effective" className="flex-1 overflow-auto mt-4">
                <RBACEffectivePermissions userId={selectedUserForPermissions.id} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
