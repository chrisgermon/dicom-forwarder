import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Key, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
  created_at: string;
}

export function RBACPermissionsCatalog() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [formData, setFormData] = useState({ resource: '', action: '', description: '' });

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rbac_permissions')
        .select('*')
        .order('resource')
        .order('action');

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePermission = async () => {
    try {
      const { error } = await supabase
        .from('rbac_permissions')
        .insert({
          resource: formData.resource,
          action: formData.action,
          description: formData.description || null
        });

      if (error) throw error;

      toast.success('Permission created successfully');
      setIsCreateDialogOpen(false);
      setFormData({ resource: '', action: '', description: '' });
      fetchPermissions();
    } catch (error) {
      console.error('Error creating permission:', error);
      toast.error('Failed to create permission');
    }
  };

  const handleUpdatePermission = async () => {
    if (!selectedPermission) return;

    try {
      const { error } = await supabase
        .from('rbac_permissions')
        .update({
          resource: formData.resource,
          action: formData.action,
          description: formData.description || null
        })
        .eq('id', selectedPermission.id);

      if (error) throw error;

      toast.success('Permission updated successfully');
      setIsEditDialogOpen(false);
      setFormData({ resource: '', action: '', description: '' });
      setSelectedPermission(null);
      fetchPermissions();
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Failed to update permission');
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to delete this permission? This will affect all roles and users.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('rbac_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;

      toast.success('Permission deleted successfully');
      fetchPermissions();
    } catch (error) {
      console.error('Error deleting permission:', error);
      toast.error('Failed to delete permission');
    }
  };

  const openEditDialog = (permission: Permission) => {
    setSelectedPermission(permission);
    setFormData({
      resource: permission.resource,
      action: permission.action,
      description: permission.description || ''
    });
    setIsEditDialogOpen(true);
  };

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Permissions Catalog
              </CardTitle>
              <CardDescription>
                Master list of all available permissions
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Permission
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Permission</DialogTitle>
                  <DialogDescription>
                    Define a new permission with resource and action
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Resource</Label>
                    <Input
                      placeholder="e.g., users, requests, reports"
                      value={formData.resource}
                      onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Input
                      placeholder="e.g., read, create, update, delete"
                      value={formData.action}
                      onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe what this permission allows..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <Button
                    onClick={handleCreatePermission}
                    className="w-full"
                    disabled={!formData.resource || !formData.action}
                  >
                    Create Permission
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : Object.keys(groupedPermissions).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No permissions found</TableCell>
                  </TableRow>
                ) : (
                  Object.entries(groupedPermissions).map(([resource, perms]) => (
                    <React.Fragment key={resource}>
                      {perms.map((permission, idx) => (
                        <TableRow key={permission.id}>
                          {idx === 0 && (
                            <TableCell
                              rowSpan={perms.length}
                              className="font-mono text-sm font-medium bg-muted/50"
                            >
                              {resource}
                            </TableCell>
                          )}
                          <TableCell className="font-mono text-sm">{permission.action}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {permission.description || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(permission)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeletePermission(permission.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Permission Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permission</DialogTitle>
            <DialogDescription>
              Update the permission details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Resource</Label>
              <Input
                value={formData.resource}
                onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Input
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <Button
              onClick={handleUpdatePermission}
              className="w-full"
              disabled={!formData.resource || !formData.action}
            >
              Update Permission
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
