import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReminderCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
}

interface AdvanceNoticeOption {
  id: string;
  days: number;
  label: string;
  is_active: boolean;
  sort_order: number;
}

export function ReminderSettingsManager() {
  const [categories, setCategories] = useState<ReminderCategory[]>([]);
  const [advanceOptions, setAdvanceOptions] = useState<AdvanceNoticeOption[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ReminderCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', icon: '', color: 'hsl(var(--primary))', is_active: true });
  
  // Advance notice dialog state
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<AdvanceNoticeOption | null>(null);
  const [advanceForm, setAdvanceForm] = useState({ days: 0, label: '', is_active: true });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catResult, advResult] = await Promise.all([
        supabase.from('reminder_categories').select('*').order('sort_order'),
        supabase.from('reminder_advance_notice_options').select('*').order('sort_order')
      ]);
      
      if (catResult.error) throw catResult.error;
      if (advResult.error) throw advResult.error;
      
      setCategories(catResult.data || []);
      setAdvanceOptions(advResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Category handlers
  const openCategoryDialog = (category?: ReminderCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        icon: category.icon || '',
        color: category.color || 'hsl(var(--primary))',
        is_active: category.is_active
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', icon: '', color: 'hsl(var(--primary))', is_active: true });
    }
    setCategoryDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('reminder_categories')
          .update({
            name: categoryForm.name,
            description: categoryForm.description || null,
            icon: categoryForm.icon || null,
            color: categoryForm.color || null,
            is_active: categoryForm.is_active
          })
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('Category updated');
      } else {
        const maxSort = Math.max(...categories.map(c => c.sort_order), 0);
        const { error } = await supabase
          .from('reminder_categories')
          .insert({
            name: categoryForm.name,
            description: categoryForm.description || null,
            icon: categoryForm.icon || null,
            color: categoryForm.color || null,
            is_active: categoryForm.is_active,
            sort_order: maxSort + 1
          });
        if (error) throw error;
        toast.success('Category created');
      }
      setCategoryDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const { error } = await supabase.from('reminder_categories').delete().eq('id', id);
      if (error) throw error;
      toast.success('Category deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  // Advance notice handlers
  const openAdvanceDialog = (option?: AdvanceNoticeOption) => {
    if (option) {
      setEditingAdvance(option);
      setAdvanceForm({ days: option.days, label: option.label, is_active: option.is_active });
    } else {
      setEditingAdvance(null);
      setAdvanceForm({ days: 0, label: '', is_active: true });
    }
    setAdvanceDialogOpen(true);
  };

  const saveAdvanceOption = async () => {
    if (!advanceForm.label.trim() || advanceForm.days <= 0) {
      toast.error('Label and valid days are required');
      return;
    }

    try {
      if (editingAdvance) {
        const { error } = await supabase
          .from('reminder_advance_notice_options')
          .update({
            days: advanceForm.days,
            label: advanceForm.label,
            is_active: advanceForm.is_active
          })
          .eq('id', editingAdvance.id);
        if (error) throw error;
        toast.success('Option updated');
      } else {
        const maxSort = Math.max(...advanceOptions.map(a => a.sort_order), 0);
        const { error } = await supabase
          .from('reminder_advance_notice_options')
          .insert({
            days: advanceForm.days,
            label: advanceForm.label,
            is_active: advanceForm.is_active,
            sort_order: maxSort + 1
          });
        if (error) throw error;
        toast.success('Option created');
      }
      setAdvanceDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving option:', error);
      toast.error('Failed to save option');
    }
  };

  const deleteAdvanceOption = async (id: string) => {
    if (!confirm('Are you sure you want to delete this option?')) return;
    try {
      const { error } = await supabase.from('reminder_advance_notice_options').delete().eq('id', id);
      if (error) throw error;
      toast.success('Option deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting option:', error);
      toast.error('Failed to delete option');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reminder Types */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reminder Types</CardTitle>
              <CardDescription>Manage categories for organizing reminders</CardDescription>
            </div>
            <Button onClick={() => openCategoryDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.description || '-'}</TableCell>
                  <TableCell>{cat.icon || '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${cat.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openCategoryDialog(cat)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Advance Notice Options */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Advance Notice Options</CardTitle>
              <CardDescription>Configure how far in advance users can set reminder notifications</CardDescription>
            </div>
            <Button onClick={() => openAdvanceDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Option
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {advanceOptions.map((opt) => (
                <TableRow key={opt.id}>
                  <TableCell className="font-medium">{opt.label}</TableCell>
                  <TableCell>{opt.days}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${opt.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {opt.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openAdvanceDialog(opt)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteAdvanceOption(opt.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit' : 'Add'} Reminder Type</DialogTitle>
            <DialogDescription>Configure the reminder category settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Lease Renewal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Input
                id="cat-desc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-icon">Icon (Lucide icon name)</Label>
              <Input
                id="cat-icon"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                placeholder="e.g., Home, FileCheck, Calendar"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={categoryForm.is_active}
                onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCategory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance Notice Dialog */}
      <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAdvance ? 'Edit' : 'Add'} Advance Notice Option</DialogTitle>
            <DialogDescription>Configure the advance notice period</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adv-label">Label</Label>
              <Input
                id="adv-label"
                value={advanceForm.label}
                onChange={(e) => setAdvanceForm({ ...advanceForm, label: e.target.value })}
                placeholder="e.g., 6 Months"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adv-days">Days</Label>
              <Input
                id="adv-days"
                type="number"
                min="1"
                value={advanceForm.days}
                onChange={(e) => setAdvanceForm({ ...advanceForm, days: parseInt(e.target.value) || 0 })}
                placeholder="Number of days"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={advanceForm.is_active}
                onCheckedChange={(checked) => setAdvanceForm({ ...advanceForm, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveAdvanceOption}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}