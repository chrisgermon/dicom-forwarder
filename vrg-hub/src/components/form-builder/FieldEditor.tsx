import { useState } from 'react';
import { FormField, FieldOption } from '@/types/form-builder';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onClose: () => void;
}

export function FieldEditor({ field, onUpdate, onClose }: FieldEditorProps) {
  const [localField, setLocalField] = useState(field);

  const handleUpdate = (updates: Partial<FormField>) => {
    const updated = { ...localField, ...updates };
    setLocalField(updated);
    onUpdate(updated);
  };

  const handleAddOption = () => {
    const options = localField.options || [];
    // Support both string arrays and FieldOption arrays
    const newOption = typeof options[0] === 'string' 
      ? '' 
      : { label: '', value: `option_${Date.now()}` };
    handleUpdate({
      options: [...options, newOption] as any,
    });
  };

  const handleUpdateOption = (index: number, value: string) => {
    const options = [...(localField.options || [])];
    // Support both string arrays and FieldOption arrays
    if (typeof options[0] === 'string' || options.length === 0) {
      options[index] = value;
    } else {
      (options[index] as FieldOption).label = value;
      (options[index] as FieldOption).value = value.toLowerCase().replace(/\s+/g, '_');
    }
    handleUpdate({ options: options as any });
  };

  const handleDeleteOption = (index: number) => {
    const options = localField.options?.filter((_, i) => i !== index);
    handleUpdate({ options: options as any });
  };

  const needsOptions = ['select', 'multiselect', 'radio'].includes(field.type);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Field Settings</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 pr-4">
          <div>
            <Label htmlFor="field-label">Label</Label>
            <Input
              id="field-label"
              value={localField.label}
              onChange={(e) => handleUpdate({ label: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="field-placeholder">Placeholder</Label>
            <Input
              id="field-placeholder"
              value={localField.placeholder || ''}
              onChange={(e) => handleUpdate({ placeholder: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="field-description">Description</Label>
            <Textarea
              id="field-description"
              value={localField.description || ''}
              onChange={(e) => handleUpdate({ description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="field-required">Required</Label>
            <Switch
              id="field-required"
              checked={localField.required || false}
              onCheckedChange={(required) => handleUpdate({ required })}
            />
          </div>

          {needsOptions && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Options</Label>
                <Button size="sm" variant="outline" onClick={handleAddOption}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              
              <div className="space-y-2">
                {(localField.options || []).map((option, index) => {
                  const optionValue = typeof option === 'string' ? option : option.label;
                  return (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Option label"
                        value={optionValue}
                        onChange={(e) => handleUpdateOption(index, e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteOption(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {['number', 'text', 'textarea'].includes(field.type) && (
            <>
              <div>
                <Label htmlFor="field-min">Minimum Length/Value</Label>
                <Input
                  id="field-min"
                  type="number"
                  value={localField.validation?.min || ''}
                  onChange={(e) =>
                    handleUpdate({
                      validation: {
                        ...localField.validation,
                        min: parseInt(e.target.value) || undefined,
                      },
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="field-max">Maximum Length/Value</Label>
                <Input
                  id="field-max"
                  type="number"
                  value={localField.validation?.max || ''}
                  onChange={(e) =>
                    handleUpdate({
                      validation: {
                        ...localField.validation,
                        max: parseInt(e.target.value) || undefined,
                      },
                    })
                  }
                />
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
