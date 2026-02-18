import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Building2, Users } from 'lucide-react';
import { DirectoryCategory } from '@/types/directory';

interface CategoryFormProps {
  category: DirectoryCategory;
  onSave: (category: DirectoryCategory) => void;
  onCancel: () => void;
}

export function CategoryForm({ category, onSave, onCancel }: CategoryFormProps) {
  const [formData, setFormData] = useState(category);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Category Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Melbourne Clinics, Support Team"
        />
      </div>

      <div className="space-y-2">
        <Label>Category Type *</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, category_type: 'clinic' })}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              formData.category_type === 'clinic'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Building2 className={`h-5 w-5 ${
              formData.category_type === 'clinic' ? 'text-primary' : 'text-muted-foreground'
            }`} />
            <div className="text-left">
              <p className="font-medium text-sm">Clinics</p>
              <p className="text-xs text-muted-foreground">Locations with addresses</p>
            </div>
          </button>
          
          <button
            type="button"
            onClick={() => setFormData({ ...formData, category_type: 'contact' })}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              formData.category_type === 'contact'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Users className={`h-5 w-5 ${
              formData.category_type === 'contact' ? 'text-primary' : 'text-muted-foreground'
            }`} />
            <div className="text-left">
              <p className="font-medium text-sm">Contacts</p>
              <p className="text-xs text-muted-foreground">People & departments</p>
            </div>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sort_order">Sort Order</Label>
        <Input
          id="sort_order"
          type="number"
          value={formData.sort_order}
          onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
          placeholder="0"
          min={0}
        />
        <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button 
          onClick={() => onSave(formData)}
          disabled={!formData.name.trim()}
        >
          <Save className="mr-2 h-4 w-4" />
          Save Category
        </Button>
      </div>
    </div>
  );
}
