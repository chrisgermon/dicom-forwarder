import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Loader2, Sparkles } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface Department {
  id: string;
  name: string;
}

interface RequestType {
  id: string;
  department_id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  icon?: string | null;
  cc_emails?: string[];
  departments?: Department;
}

interface RequestCategory {
  id: string;
  request_type_id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  icon?: string | null;
  cc_emails?: string[];
  form_template_id: string | null;
}

export function RequestTypesManager() {
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [categories, setCategories] = useState<RequestCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    type: 'request_type' | 'category' | null;
    data: Partial<RequestType | RequestCategory> | null;
  }>({ open: false, type: null, data: null });
  const [suggestingIcon, setSuggestingIcon] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load departments
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (deptError) throw deptError;
      setDepartments(deptData || []);

      // Load request types
      const { data: typesData, error: typesError } = await supabase
        .from('request_types')
        .select('*, departments(id, name)')
        .order('name');

      if (typesError) throw typesError;
      setRequestTypes((typesData || []) as any);

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('request_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories((categoriesData || []) as any);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load request types and categories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const suggestIcon = async (name: string, description: string) => {
    setSuggestingIcon(true);
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-nano',
          messages: [
            {
              role: 'system',
              content: 'You are an icon suggestion assistant. Based on the name and description provided, suggest ONE appropriate lucide-react icon name. Reply with ONLY the icon name, nothing else. Examples: Wrench, Package, Users, FileText, Settings',
            },
            {
              role: 'user',
              content: `Name: ${name}\nDescription: ${description || 'No description'}`,
            },
          ],
        }),
      });

      const data = await response.json();
      const suggestedIcon = data.choices?.[0]?.message?.content?.trim();
      
      if (suggestedIcon) {
        setEditDialog(prev => ({
          ...prev,
          data: {
            ...prev.data,
            icon: suggestedIcon,
          },
        }));
        
        toast({
          title: 'Icon Suggested',
          description: `AI suggested: ${suggestedIcon}`,
        });
      }
    } catch (error) {
      console.error('Error suggesting icon:', error);
      toast({
        title: 'Error',
        description: 'Failed to suggest icon',
        variant: 'destructive',
      });
    } finally {
      setSuggestingIcon(false);
    }
  };

  const handleSave = async () => {
    const { type, data } = editDialog;
    if (!type || !data) return;

    try {
      const table = type === 'request_type' ? 'request_types' : 'request_categories';
      
      if (data.id) {
        // Update
        const updatePayload: any = {
          name: data.name,
          slug: data.slug,
          description: data.description,
          is_active: data.is_active,
          icon: data.icon,
          cc_emails: data.cc_emails || [],
        };

        if (type === 'request_type') {
          updatePayload.department_id = (data as any).department_id;
        } else {
          updatePayload.request_type_id = (data as any).request_type_id;
        }

        const { error } = await supabase
          .from(table)
          .update(updatePayload)
          .eq('id', data.id);

        if (error) throw error;
      } else {
        // Create
        const insertPayload: any = {
          name: data.name,
          slug: data.slug,
          description: data.description,
          is_active: data.is_active ?? true,
          icon: data.icon,
          cc_emails: data.cc_emails || [],
        };

        if (type === 'request_type') {
          insertPayload.department_id = (data as any).department_id;
        } else {
          insertPayload.request_type_id = (data as any).request_type_id;
        }

        const { error } = await supabase
          .from(table)
          .insert(insertPayload);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `${type === 'request_type' ? 'Request Type' : 'Category'} saved successfully`,
      });

      setEditDialog({ open: false, type: null, data: null });
      loadData();
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'Failed to save',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (type: 'request_type' | 'category', id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type === 'request_type' ? 'request type' : 'category'}?`)) {
      return;
    }

    try {
      const table = type === 'request_type' ? 'request_types' : 'request_categories';
      const { error } = await supabase.from(table).delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Deleted successfully',
      });

      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Request Types Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Request Types</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Parent categories for organizing requests
              </p>
            </div>
            <Button
              onClick={() =>
                setEditDialog({
                  open: true,
                  type: 'request_type',
                  data: { is_active: true },
                })
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Request Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestTypes.map((rt) => (
                  <TableRow key={rt.id}>
                    <TableCell className="font-medium">{rt.name}</TableCell>
                    <TableCell>{rt.departments?.name || '-'}</TableCell>
                    <TableCell>
                      <code className="text-xs">{rt.slug}</code>
                    </TableCell>
                    <TableCell>{rt.icon || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={rt.is_active ? 'success' : 'secondary'}>
                        {rt.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setEditDialog({
                              open: true,
                              type: 'request_type',
                              data: rt,
                            })
                          }
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete('request_type', rt.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Categories Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Request Categories</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Sub-categories under request types
              </p>
            </div>
            <Button
              onClick={() =>
                setEditDialog({
                  open: true,
                  type: 'category',
                  data: { is_active: true },
                })
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Form Linked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>
                      <code className="text-xs">{cat.slug}</code>
                    </TableCell>
                    <TableCell>{cat.icon || '-'}</TableCell>
                    <TableCell>
                      {cat.form_template_id ? (
                        <Badge variant="outline">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.is_active ? 'success' : 'secondary'}>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setEditDialog({
                              open: true,
                              type: 'category',
                              data: cat,
                            })
                          }
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete('category', cat.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, type: null, data: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editDialog.data?.id ? 'Edit' : 'Create'}{' '}
              {editDialog.type === 'request_type' ? 'Request Type' : 'Category'}
            </DialogTitle>
            <DialogDescription>
              Fill in the details below. AI can suggest an appropriate icon.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editDialog.type === 'request_type' && (
              <div className="space-y-2">
                <Label>Department</Label>
                <select
                  className="w-full border rounded-md p-2"
                  value={(editDialog.data as any)?.department_id || ''}
                  onChange={(e) =>
                    setEditDialog((prev) => ({
                      ...prev,
                      data: { ...prev.data, department_id: e.target.value },
                    }))
                  }
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editDialog.data?.name || ''}
                onChange={(e) =>
                  setEditDialog((prev) => ({
                    ...prev,
                    data: { ...prev.data, name: e.target.value },
                  }))
                }
                placeholder="e.g., IT Service Desk"
              />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={editDialog.data?.slug || ''}
                onChange={(e) =>
                  setEditDialog((prev) => ({
                    ...prev,
                    data: { ...prev.data, slug: e.target.value },
                  }))
                }
                placeholder="e.g., it-service-desk"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editDialog.data?.description || ''}
                onChange={(e) =>
                  setEditDialog((prev) => ({
                    ...prev,
                    data: { ...prev.data, description: e.target.value },
                  }))
                }
                placeholder="Brief description"
              />
            </div>

            <div className="space-y-2">
              <Label>Icon (Lucide React)</Label>
              <div className="flex gap-2">
                <Input
                  value={editDialog.data?.icon || ''}
                  onChange={(e) =>
                    setEditDialog((prev) => ({
                      ...prev,
                      data: { ...prev.data, icon: e.target.value },
                    }))
                  }
                  placeholder="e.g., Wrench"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    suggestIcon(
                      editDialog.data?.name || '',
                      editDialog.data?.description || ''
                    )
                  }
                  disabled={!editDialog.data?.name || suggestingIcon}
                >
                  {suggestingIcon ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>CC Emails (comma-separated)</Label>
              <Textarea
                value={Array.isArray(editDialog.data?.cc_emails) ? (editDialog.data?.cc_emails as string[]).join(', ') : ''}
                onChange={(e) => {
                  const emails = e.target.value
                    .split(',')
                    .map(email => email.trim())
                    .filter(email => email);
                  setEditDialog((prev) => ({
                    ...prev,
                    data: { ...prev.data, cc_emails: emails },
                  }));
                }}
                placeholder="email1@example.com, email2@example.com"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                These emails will automatically receive notifications for all requests of this {editDialog.type === 'request_type' ? 'type' : 'category'}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={editDialog.data?.is_active ?? true}
                onCheckedChange={(checked) =>
                  setEditDialog((prev) => ({
                    ...prev,
                    data: { ...prev.data, is_active: checked },
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, type: null, data: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
