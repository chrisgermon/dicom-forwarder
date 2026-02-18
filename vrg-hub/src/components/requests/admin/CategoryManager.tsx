import { useState } from 'react';
import { Plus, Edit2, Trash2, FileText } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  useCategories, 
  useRequestTypes, 
  useActiveUsers,
  useCreateCategory, 
  useUpdateCategory,
  useDeleteCategory 
} from '@/hooks/useTicketingSystem';

const AVAILABLE_ICONS = [
  'Wrench', 'AirVent', 'Lightbulb', 'Sparkles', 'Package', 'HelpCircle',
  'Settings', 'Hammer', 'PaintBucket', 'Trash', 'Wifi', 'Phone',
  'Mail', 'Calendar', 'FileText', 'Clipboard', 'ShoppingCart', 'Truck'
];

export function CategoryManager() {
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: requestTypes, isLoading: loadingTypes } = useRequestTypes();
  const { data: users } = useActiveUsers();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  if (loadingCategories || loadingTypes) return <div>Loading...</div>;

  // Compute filtered categories for potential future use
  void (selectedType
    ? categories?.filter(cat => cat.request_type_id === selectedType)
    : categories);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Request Categories</h3>
          <p className="text-sm text-muted-foreground">Manage categories for request types with assigned users</p>
        </div>
        <CategoryDialog requestTypes={requestTypes || []} users={users || []} />
      </div>

      <div className="flex gap-4">
        <Select value={selectedType || 'all'} onValueChange={(v) => setSelectedType(v === 'all' ? null : v)}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Request Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Request Types</SelectItem>
            {requestTypes?.map((type) => (
              <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {requestTypes?.map((type) => {
          const typeCategories = categories?.filter(cat => cat.request_type_id === type.id) || [];
          if (selectedType && selectedType !== type.id) return null;
          
          return (
            <Card key={type.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{type.name}</CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      {typeCategories.length} {typeCategories.length === 1 ? 'category' : 'categories'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {typeCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No categories yet</p>
                  ) : (
                    typeCategories.map(cat => (
                      <CategoryRow 
                        key={cat.id} 
                        category={cat} 
                        requestTypes={requestTypes || []}
                        users={users || []}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CategoryRow({ 
  category, 
  requestTypes, 
  users 
}: { 
  category: any; 
  requestTypes: any[];
  users: any[];
}) {
  const navigate = useNavigate();
  const deleteCategory = useDeleteCategory();
  
  // Convert kebab-case to PascalCase for icon lookup
  const iconName = category.icon
    ?.split('-')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') || 'HelpCircle';
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this category?')) {
      await deleteCategory.mutateAsync(category.id);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="flex items-center gap-3 flex-1">
        <IconComponent className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <div className="text-sm font-medium">{category.name}</div>
          <div className="flex items-center gap-2 mt-1">
            {category.form_template && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {category.form_template.name}
              </div>
            )}
            {category.assigned_user_ids && category.assigned_user_ids.length > 0 && (
              <div className="text-xs text-muted-foreground">
                • {category.assigned_user_ids.length} {category.assigned_user_ids.length === 1 ? 'user' : 'users'} assigned
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={category.is_active ? 'outline' : 'secondary'} className="text-xs">
          {category.is_active ? 'Active' : 'Inactive'}
        </Badge>
        {category.form_template_id && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => navigate(`/form-templates?edit=${category.form_template_id}`)}
            title="Edit Form"
          >
            <FileText className="h-3 w-3" />
          </Button>
        )}
        <CategoryDialog 
          category={category} 
          requestTypes={requestTypes}
          users={users}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function CategoryDialog({ 
  category, 
  requestTypes, 
  users 
}: { 
  category?: any; 
  requestTypes: any[];
  users: any[];
}) {
  const [open, setOpen] = useState(false);
  
  // Convert kebab-case icon from DB to PascalCase for UI
  const initialIcon = category?.icon
    ? category.icon.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join('')
    : 'HelpCircle';
  
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [requestTypeId, setRequestTypeId] = useState(category?.request_type_id || '');
  const [icon, setIcon] = useState(initialIcon);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>(category?.assigned_user_ids || []);
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(category?.sort_order || 0);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const isEdit = !!category;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Convert PascalCase icon to kebab-case for storage
    const iconKebab = icon.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    
    const data = {
      name,
      description,
      request_type_id: requestTypeId,
      icon: iconKebab,
      slug,
      assigned_user_ids: assignedUserIds,
      is_active: isActive,
      sort_order: sortOrder,
    };

    if (isEdit) {
      await updateCategory.mutateAsync({ id: category.id, data });
    } else {
      await createCategory.mutateAsync(data);
    }
    
    setOpen(false);
    if (!isEdit) {
      setName('');
      setDescription('');
      setIcon('HelpCircle');
      setAssignedUserIds([]);
      setSortOrder(0);
    }
  };

  const IconPreview = (LucideIcons as any)[icon] || LucideIcons.HelpCircle;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button size="icon" variant="ghost" className="h-6 w-6">
            <Edit2 className="h-3 w-3" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'Create'} Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="request_type">Request Type</Label>
            <Select value={requestTypeId} onValueChange={setRequestTypeId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                {requestTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="name">Category Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="icon">Icon</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <IconPreview className="h-4 w-4" />
                    <span>{icon}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ICONS.map((iconName) => {
                  const Icon = (LucideIcons as any)[iconName];
                  return (
                    <SelectItem key={iconName} value={iconName}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{iconName}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Assigned Users (optional)</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-[200px] overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users available</p>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={assignedUserIds.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAssignedUserIds([...assignedUserIds, user.id]);
                        } else {
                          setAssignedUserIds(assignedUserIds.filter(id => id !== user.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`user-${user.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {user.full_name || user.email}
                    </label>
                  </div>
                ))
              )}
            </div>
            {assignedUserIds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {assignedUserIds.length} {assignedUserIds.length === 1 ? 'user' : 'users'} will receive email notifications for this category
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="sort_order">Sort Order</Label>
            <Input 
              id="sort_order" 
              type="number" 
              value={sortOrder} 
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} 
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active</Label>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <Button type="submit" className="w-full">
            {isEdit ? 'Update' : 'Create'} Category
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
