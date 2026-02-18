import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer } from '@/components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Users, UserMinus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';

interface HandlerGroup {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
  departments?: { name: string } | null;
  member_count?: number;
}

interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  created_at: string;
  profiles?: { full_name: string; email: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

export default function HandlerGroupsAdmin() {
  const [groups, setGroups] = useState<HandlerGroup[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<HandlerGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    department_id: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [groupsRes, deptRes, profilesRes] = await Promise.all([
        supabase
          .from('request_handler_groups')
          .select('*, departments:department_id(name)')
          .order('name'),
        supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
        supabase.from('profiles').select('id, full_name, email').order('full_name'),
      ]);

      if (groupsRes.error) throw groupsRes.error;
      if (deptRes.error) throw deptRes.error;
      if (profilesRes.error) throw profilesRes.error;

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        (groupsRes.data || []).map(async (group) => {
          const { count } = await supabase
            .from('request_handler_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);
          return { ...group, member_count: count || 0 };
        })
      );

      setGroups(groupsWithCounts);
      setDepartments(deptRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load handler groups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (groupId: string) => {
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('request_handler_group_members')
        .select('*, profiles:user_id(full_name, email)')
        .eq('group_id', groupId)
        .order('created_at');

      if (error) throw error;
      setGroupMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load group members',
        variant: 'destructive',
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOpenDialog = (group?: HandlerGroup) => {
    if (group) {
      setSelectedGroup(group);
      setFormData({
        name: group.name,
        description: group.description || '',
        department_id: group.department_id || '',
        is_active: group.is_active,
      });
    } else {
      setSelectedGroup(null);
      setFormData({
        name: '',
        description: '',
        department_id: '',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleOpenMembers = async (group: HandlerGroup) => {
    setSelectedGroup(group);
    setMembersDialogOpen(true);
    await loadGroupMembers(group.id);
  };

  const handleSaveGroup = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Group name is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        department_id: formData.department_id || null,
        is_active: formData.is_active,
      };

      if (selectedGroup) {
        const { error } = await supabase
          .from('request_handler_groups')
          .update(payload)
          .eq('id', selectedGroup.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Group updated successfully' });
      } else {
        const { error } = await supabase
          .from('request_handler_groups')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Success', description: 'Group created successfully' });
      }

      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving group:', error);
      toast({
        title: 'Error',
        description: 'Failed to save group',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (group: HandlerGroup) => {
    if (!confirm(`Are you sure you want to delete "${group.name}"? This will remove all members from the group.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('request_handler_groups')
        .delete()
        .eq('id', group.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Group deleted successfully' });
      loadData();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete group',
        variant: 'destructive',
      });
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedGroup) return;

    try {
      const { error } = await supabase
        .from('request_handler_group_members')
        .insert({
          group_id: selectedGroup.id,
          user_id: userId,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already a Member',
            description: 'This user is already in the group',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      toast({ title: 'Success', description: 'Member added to group' });
      await loadGroupMembers(selectedGroup.id);
      loadData(); // Refresh counts
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add member',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('request_handler_group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Member removed from group' });
      if (selectedGroup) {
        await loadGroupMembers(selectedGroup.id);
        loadData(); // Refresh counts
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  const availableProfiles = profiles.filter(
    (p) => !groupMembers.some((m) => m.user_id === p.id)
  );

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Request Handler Groups</h1>
            <p className="text-muted-foreground">
              Manage groups that handle incoming requests by department
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Group
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Handler Groups</CardTitle>
            <CardDescription>
              Groups receive requests and members can claim them using "Assign to Me"
            </CardDescription>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No handler groups created yet. Create your first group to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{group.name}</p>
                          {group.description && (
                            <p className="text-sm text-muted-foreground">{group.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {group.departments?.name || (
                          <span className="text-muted-foreground">All Departments</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="cursor-pointer" onClick={() => handleOpenMembers(group)}>
                          <Users className="w-3 h-3 mr-1" />
                          {group.member_count} members
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={group.is_active ? 'success' : 'secondary'}>
                          {group.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenMembers(group)}>
                            <Users className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(group)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteGroup(group)} className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Group Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedGroup ? 'Edit Group' : 'Create Handler Group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., IT Support Team"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the group's responsibilities"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department_id || "__all__"}
                onValueChange={(value) => setFormData({ ...formData, department_id: value === "__all__" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link to a department to auto-assign requests from that department
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveGroup} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedGroup ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Members - {selectedGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Add Member */}
            <div className="space-y-2">
              <Label>Add Member</Label>
              <Select onValueChange={handleAddMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableProfiles.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">
                      All users are already members
                    </div>
                  ) : (
                    availableProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Current Members */}
            <div className="space-y-2">
              <Label>Current Members ({groupMembers.length})</Label>
              {loadingMembers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : groupMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No members in this group yet
                </p>
              ) : (
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {groupMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {member.profiles?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {member.profiles?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.profiles?.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMembersDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
