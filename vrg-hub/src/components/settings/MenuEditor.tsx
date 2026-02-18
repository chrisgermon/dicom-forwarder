import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, X, GripVertical, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type UserRole = 'requester' | 'manager' | 'marketing_manager' | 'tenant_admin' | 'super_admin' | 'marketing';

interface MenuItem {
  key: string;
  label: string;
  type: 'common' | 'category' | 'item' | 'admin' | 'settings' | 'help' | 'heading';
  parentKey?: string;
}

interface MenuConfig {
  id?: string;
  role: UserRole;
  item_key: string;
  item_type: string;
  parent_key?: string;
  is_visible: boolean;
  sort_order: number;
  heading_id?: string;
}

interface GlobalHeading {
  id: string;
  label: string;
  heading_key: string;
  sort_order: number;
}

interface SortableItemProps {
  id: string;
  config: MenuConfig;
  isHeading: boolean;
  isVisible: boolean;
  label: string;
  onToggle: () => void;
  onEdit?: () => void;
}

function SortableItem({ id, config, isHeading, isVisible, label, onToggle, onEdit }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border rounded-lg ${
        isHeading ? 'bg-primary/5 border-primary/20' : 'bg-card'
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <Switch
          checked={isVisible}
          onCheckedChange={onToggle}
        />
        <div className="flex flex-col">
          <span className={`${!isVisible ? 'text-muted-foreground' : ''} ${isHeading ? 'font-semibold' : ''}`}>
            {label}
          </span>
          <span className="text-xs text-muted-foreground">
            {isHeading ? 'Section Heading' : config.item_type}
          </span>
        </div>
      </div>
      {onEdit && isHeading && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { key: 'users', label: 'Users', type: 'category' },
  { key: 'users-management', label: 'User Management', type: 'item', parentKey: 'users' },
  { key: 'users-new-account', label: 'New User Account', type: 'item', parentKey: 'users' },
  { key: 'users-new-offboarding', label: 'User Offboarding', type: 'item', parentKey: 'users' },
  { key: 'equipment', label: 'Equipment', type: 'category' },
  { key: 'equipment-approvals', label: 'Pending Approvals', type: 'item', parentKey: 'equipment' },
  { key: 'equipment-requests', label: 'All Requests', type: 'item', parentKey: 'equipment' },
  { key: 'equipment-new-request', label: 'New Hardware Request', type: 'item', parentKey: 'equipment' },
  { key: 'equipment-new-toner', label: 'New Toner Request', type: 'item', parentKey: 'equipment' },
  { key: 'marketing', label: 'Marketing', type: 'category' },
  { key: 'marketing-new-request', label: 'New Marketing Request', type: 'item', parentKey: 'marketing' },
  { key: 'documentation', label: 'Documentation', type: 'category' },
  { key: 'documentation-modality', label: 'Modality Details', type: 'item', parentKey: 'documentation' },
  { key: 'admin-system', label: 'System Admin', type: 'admin' },
  { key: 'admin-audit', label: 'Audit Log', type: 'admin' },
  { key: 'settings', label: 'Settings', type: 'settings' },
  { key: 'help', label: 'Help Guide', type: 'help' },
];

export function MenuEditor() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('requester');
  const [menuConfigs, setMenuConfigs] = useState<MenuConfig[]>([]);
  const [globalHeadings, setGlobalHeadings] = useState<GlobalHeading[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newHeadingLabel, setNewHeadingLabel] = useState('');
  const [_addHeadingOpen, setAddHeadingOpen] = useState(false);
  const [manageHeadingsOpen, setManageHeadingsOpen] = useState(false);
  const [editingHeading, setEditingHeading] = useState<GlobalHeading | null>(null);
  const [editHeadingLabel, setEditHeadingLabel] = useState('');
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadGlobalHeadings();
  }, []);

  useEffect(() => {
    loadMenuConfigs();
  }, [selectedRole]);

  const loadGlobalHeadings = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_headings')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setGlobalHeadings(data || []);
    } catch (error) {
      console.error('Error loading global headings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load global headings',
        variant: 'destructive',
      });
    }
  };

  const loadMenuConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_configurations')
        .select('*')
        .eq('role', selectedRole)
        .order('sort_order');

      if (error) throw error;

      // If no configs exist for this role, create defaults
      if (!data || data.length === 0) {
        const defaults = DEFAULT_MENU_ITEMS.map((item, index) => ({
          role: selectedRole,
          item_key: item.key,
          item_type: item.type,
          is_visible: true,
          sort_order: index,
        }));
        setMenuConfigs(defaults);
      } else {
        setMenuConfigs(data);
      }
    } catch (error) {
      console.error('Error loading menu configs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load menu configurations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = (itemKey: string) => {
    setMenuConfigs(prev =>
      prev.map(config =>
        config.item_key === itemKey
          ? { ...config, is_visible: !config.is_visible }
          : config
      )
    );
  };

  const getItemLabel = (config: MenuConfig) => {
    if (config.item_type === 'heading' && config.heading_id) {
      const heading = globalHeadings.find(h => h.id === config.heading_id);
      return heading?.label || 'Unknown Heading';
    }
    return DEFAULT_MENU_ITEMS.find(item => item.key === config.item_key)?.label || config.item_key;
  };

  const createGlobalHeading = async () => {
    if (!newHeadingLabel.trim()) return;

    try {
      const { data, error } = await supabase
        .from('menu_headings')
        .insert({
          label: newHeadingLabel.trim(),
          heading_key: `heading-${Date.now()}`,
          sort_order: globalHeadings.length,
        })
        .select()
        .single();

      if (error) throw error;

      setGlobalHeadings(prev => [...prev, data]);
      setNewHeadingLabel('');
      setAddHeadingOpen(false);

      toast({
        title: 'Success',
        description: 'Global heading created successfully',
      });
    } catch (error) {
      console.error('Error creating heading:', error);
      toast({
        title: 'Error',
        description: 'Failed to create heading',
        variant: 'destructive',
      });
    }
  };

  const addHeadingToMenu = (headingId: string) => {
    const newConfig: MenuConfig = {
      role: selectedRole,
      item_key: `heading-ref-${headingId}-${Date.now()}`,
      item_type: 'heading',
      is_visible: true,
      sort_order: menuConfigs.length,
      heading_id: headingId,
    };

    setMenuConfigs(prev => [...prev, newConfig]);
    toast({
      title: 'Success',
      description: 'Heading added to menu. Click Save to persist changes.',
    });
  };

  // Function to remove heading from menu - kept for potential future use
  // const removeHeadingFromMenu = (itemKey: string) => {
  //   setMenuConfigs(prev => prev.filter(c => c.item_key !== itemKey));
  // };

  const updateGlobalHeading = async () => {
    if (!editingHeading || !editHeadingLabel.trim()) return;

    try {
      const { error } = await supabase
        .from('menu_headings')
        .update({ label: editHeadingLabel.trim() })
        .eq('id', editingHeading.id);

      if (error) throw error;

      setGlobalHeadings(prev =>
        prev.map(h => (h.id === editingHeading.id ? { ...h, label: editHeadingLabel.trim() } : h))
      );
      setEditingHeading(null);
      setEditHeadingLabel('');

      toast({
        title: 'Success',
        description: 'Heading updated successfully',
      });
    } catch (error) {
      console.error('Error updating heading:', error);
      toast({
        title: 'Error',
        description: 'Failed to update heading',
        variant: 'destructive',
      });
    }
  };

  const deleteGlobalHeading = async (headingId: string) => {
    try {
      const { error } = await supabase
        .from('menu_headings')
        .delete()
        .eq('id', headingId);

      if (error) throw error;

      setGlobalHeadings(prev => prev.filter(h => h.id !== headingId));
      // Remove this heading from all role menus
      setMenuConfigs(prev => prev.filter(c => c.heading_id !== headingId));

      toast({
        title: 'Success',
        description: 'Heading deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting heading:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete heading',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    const oldIndex = menuConfigs.findIndex(c => c.item_key === activeId);
    const newIndex = menuConfigs.findIndex(c => c.item_key === overId);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    const reordered = arrayMove(menuConfigs, oldIndex, newIndex).map((c, i) => ({
      ...c,
      sort_order: i,
    }));
    
    setMenuConfigs(reordered);
  };

  const saveAllConfigs = async () => {
    setSaving(true);
    try {
      await supabase
        .from('menu_configurations')
        .delete()
        .eq('role', selectedRole);

      await supabase
        .from('menu_configurations')
        .insert(menuConfigs);

      toast({
        title: 'Success',
        description: 'Menu configuration saved successfully',
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu Editor</CardTitle>
        <CardDescription>
          Customize menu visibility and order for each role. Add section headings to group items, then drag everything to organize your menu structure.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Select Role</Label>
          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="requester">Requester</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Dialog open={manageHeadingsOpen} onOpenChange={setManageHeadingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                Manage Global Headings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Manage Global Headings</DialogTitle>
                <DialogDescription>
                  Create and edit section headings that can be used across all roles.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="New heading label..."
                    value={newHeadingLabel}
                    onChange={(e) => setNewHeadingLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createGlobalHeading()}
                  />
                  <Button onClick={createGlobalHeading} disabled={!newHeadingLabel.trim()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {globalHeadings.map((heading) => (
                    <div key={heading.id} className="flex items-center justify-between p-3 border rounded-lg">
                      {editingHeading?.id === heading.id ? (
                        <>
                          <Input
                            value={editHeadingLabel}
                            onChange={(e) => setEditHeadingLabel(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && updateGlobalHeading()}
                            className="flex-1 mr-2"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={updateGlobalHeading}>
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingHeading(null);
                                setEditHeadingLabel('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{heading.label}</span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingHeading(heading);
                                setEditHeadingLabel(heading.label);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteGlobalHeading(heading.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {globalHeadings.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No headings created yet. Create one above to get started.
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Select
            onValueChange={(value) => addHeadingToMenu(value)}
            value=""
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Add heading to menu..." />
            </SelectTrigger>
            <SelectContent>
              {globalHeadings.map((heading) => (
                <SelectItem key={heading.id} value={heading.id}>
                  {heading.label}
                </SelectItem>
              ))}
              {globalHeadings.length === 0 && (
                <SelectItem value="none" disabled>
                  No headings available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground uppercase">
              Menu Items for {selectedRole}
            </h4>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={menuConfigs.map(c => c.item_key)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {menuConfigs.map((config) => (
                    <SortableItem
                      key={config.item_key}
                      id={config.item_key}
                      config={config}
                      isHeading={config.item_type === 'heading'}
                      isVisible={config.is_visible}
                      label={getItemLabel(config)}
                      onToggle={() => toggleVisibility(config.item_key)}
                      onEdit={
                        config.item_type === 'heading'
                          ? () => {
                              const heading = globalHeadings.find(h => h.id === config.heading_id);
                              if (heading) {
                                setEditingHeading(heading);
                                setEditHeadingLabel(heading.label);
                                setManageHeadingsOpen(true);
                              }
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={saveAllConfigs} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
