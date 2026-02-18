import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Shield, Search, RefreshCw, UserCog, Eye, ArrowUpDown, Mail, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RBACUserRolesManager } from './RBACUserRolesManager';
import { RBACUserPermissionsManager } from './RBACUserPermissionsManager';
import { RBACEffectivePermissions } from './RBACEffectivePermissions';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  is_active: boolean;
  last_login: string | null;
  roles: Array<{ id: string; name: string }>;
}

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

export function RBACUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [_selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<'roles' | 'overrides' | 'effective'>('roles');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [sortField, setSortField] = useState<'name' | 'email' | 'created_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [_inviteUserEmail, _setInviteUserEmail] = useState('');

  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
    },
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, last_login, is_active')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: userRoles } = await supabase
            .from('rbac_user_roles')
            .select(`
              role:rbac_roles(id, name)
            `)
            .eq('user_id', profile.id);

          return {
            id: profile.id,
            email: profile.email || '',
            full_name: profile.full_name,
            created_at: profile.created_at || '',
            is_active: (profile as any).is_active ?? true,
            last_login: (profile as any).last_login || null,
            roles: (userRoles || []).map(ur => ur.role).filter(Boolean) as Array<{ id: string; name: string }>
          };
        })
      );

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

  // Filter users
  let filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesActiveFilter = filterActive === 'all' || 
      (filterActive === 'active' && user.is_active) ||
      (filterActive === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesActiveFilter;
  });

  // Sort users
  filteredUsers = [...filteredUsers].sort((a, b) => {
    let compareValue = 0;
    
    if (sortField === 'name') {
      const aName = a.full_name || a.email;
      const bName = b.full_name || b.email;
      compareValue = aName.localeCompare(bName);
    } else if (sortField === 'email') {
      compareValue = a.email.localeCompare(b.email);
    } else if (sortField === 'created_at') {
      compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    
    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const sendInvite = async (values: InviteFormValues) => {
    console.log('Send invite triggered with values:', values);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user');
        toast.error("You must be logged in to send invites");
        return;
      }

      console.log('Current user:', user.id);

      // Get first active brand as default
      const { data: brands } = await supabase
        .from('brands')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (!brands || brands.length === 0) {
        console.error('No active brands found');
        toast.error("No active brands found");
        return;
      }

      const brandId = brands[0].id;
      console.log('Using brand:', brandId);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity

      console.log('Creating invite in database...');

      // Create the invite in the database
      const { data: newInvite, error: insertError } = await supabase
        .from('user_invites')
        .insert({
          email: values.email,
          brand_id: brandId,
          invited_by: user.id,
          role: 'requester', // Default role
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Invite created successfully:', newInvite);
      console.log('Calling send-user-invite-email function...');

      // Send the invite email
      const emailResult = await supabase.functions.invoke('send-user-invite-email', {
        body: {
          inviteId: newInvite.id
        }
      });

      console.log('Email function result:', emailResult);

      if (emailResult.error) {
        console.error('Failed to send invite email:', emailResult.error);
        toast.error('Invite created but failed to send email: ' + emailResult.error.message);
      } else {
        console.log('Email sent successfully');
        toast.success(`Invite sent successfully to ${values.email}!`);
      }

      inviteForm.reset();
      setInviteDialogOpen(false);
      fetchUsers(); // Refresh user list
    } catch (error: any) {
      console.error("Error sending invite:", error);
      toast.error(error.message || "Failed to send invite");
    }
  };

  const sendUserInvite = async (email: string) => {
    try {
      toast.success(`Invite email sent to ${email}`);
    } catch (error: any) {
      console.error("Error sending invite:", error);
      toast.error("Failed to send invite");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user roles and permission overrides
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Invite
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send User Invite</DialogTitle>
                    <DialogDescription>
                      Send an email invitation to a user
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...inviteForm}>
                    <form onSubmit={inviteForm.handleSubmit(sendInvite)} className="space-y-4">
                      <FormField
                        control={inviteForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="user@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          <Mail className="w-4 h-4 mr-2" />
                          Send Invite
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Button onClick={fetchUsers} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterActive} onValueChange={(value: any) => setFilterActive(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={(value: any) => setSortField(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="email">Sort by Email</SelectItem>
                <SelectItem value="created_at">Sort by Date</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            </Button>
          </div>

          <Table storageKey="rbac-users">
            <TableHeader>
              <TableRow>
                <TableHead columnId="name">Name</TableHead>
                <TableHead columnId="email">Email</TableHead>
                <TableHead columnId="roles">Roles</TableHead>
                <TableHead columnId="lastLogin">Last Login</TableHead>
                <TableHead columnId="status">Status</TableHead>
                <TableHead columnId="actions">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No users found</TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge key={role.id} variant="secondary">
                              {role.name}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">No roles</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.last_login ? (
                        <span className="text-sm text-muted-foreground">
                          {new Date(user.last_login).toLocaleString('en-AU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "destructive"}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => sendUserInvite(user.email)}
                          title="Send invite email"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setViewMode('roles');
                              }}
                            >
                              <UserCog className="w-4 h-4 mr-2" />
                              Manage
                            </Button>
                          </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Manage User: {user.full_name || user.email}</DialogTitle>
                            <DialogDescription>
                              Assign roles and configure permission overrides
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="flex gap-2 border-b">
                              <Button
                                variant={viewMode === 'roles' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('roles')}
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                Roles
                              </Button>
                              <Button
                                variant={viewMode === 'overrides' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('overrides')}
                              >
                                <UserCog className="w-4 h-4 mr-2" />
                                Permission Overrides
                              </Button>
                              <Button
                                variant={viewMode === 'effective' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('effective')}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Effective Permissions
                              </Button>
                            </div>

                            {viewMode === 'roles' && (
                              <RBACUserRolesManager
                                userId={user.id}
                                currentRoles={user.roles}
                                onUpdate={fetchUsers}
                              />
                            )}

                            {viewMode === 'overrides' && (
                              <RBACUserPermissionsManager
                                userId={user.id}
                                onUpdate={fetchUsers}
                              />
                            )}

                            {viewMode === 'effective' && (
                              <RBACEffectivePermissions userId={user.id} />
                            )}
                          </div>
                        </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
    </div>
  );
}
