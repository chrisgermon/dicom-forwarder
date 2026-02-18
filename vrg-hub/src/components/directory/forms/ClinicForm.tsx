import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Save, X } from 'lucide-react';
import { Clinic, DirectoryCategory } from '@/types/directory';
import { Badge } from '@/components/ui/badge';

interface ClinicFormProps {
  clinic: Clinic;
  categories: DirectoryCategory[];
  onSave: (clinic: Clinic) => void;
  onCancel: () => void;
}

export function ClinicForm({ clinic, categories, onSave, onCancel }: ClinicFormProps) {
  const [formData, setFormData] = useState<Clinic>(clinic);
  const [extensionInput, setExtensionInput] = useState({ name: '', number: '' });

  const addExtension = () => {
    if (extensionInput.name.trim() && extensionInput.number.trim()) {
      setFormData({
        ...formData,
        extensions: [...formData.extensions, { 
          name: extensionInput.name.trim(), 
          number: extensionInput.number.trim() 
        }]
      });
      setExtensionInput({ name: '', number: '' });
    }
  };

  const removeExtension = (index: number) => {
    setFormData({
      ...formData,
      extensions: formData.extensions.filter((_, i) => i !== index)
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addExtension();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category_id}
            onValueChange={(value) => setFormData({ ...formData, category_id: value })}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id!}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Select
            value={formData.region || 'melbourne'}
            onValueChange={(value) => setFormData({ ...formData, region: value })}
          >
            <SelectTrigger id="region">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="melbourne">Melbourne</SelectItem>
              <SelectItem value="sydney">Sydney</SelectItem>
              <SelectItem value="brisbane">Brisbane</SelectItem>
              <SelectItem value="perth">Perth</SelectItem>
              <SelectItem value="adelaide">Adelaide</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Clinic Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter clinic name"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(03) 1234 5678"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fax">Fax</Label>
          <Input
            id="fax"
            value={formData.fax}
            onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
            placeholder="(03) 1234 5679"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Enter full address"
          rows={2}
        />
      </div>

      <div className="space-y-3">
        <Label>Extensions</Label>
        
        {formData.extensions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.extensions.map((ext, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="py-1.5 px-3 gap-2 text-sm"
              >
                <span>{ext.name}:</span>
                <span className="font-mono font-medium">{ext.number}</span>
                <button
                  type="button"
                  onClick={() => removeExtension(index)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            placeholder="Extension name (e.g., Reception)"
            value={extensionInput.name}
            onChange={(e) => setExtensionInput({ ...extensionInput, name: e.target.value })}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Input
            placeholder="Number"
            value={extensionInput.number}
            onChange={(e) => setExtensionInput({ ...extensionInput, number: e.target.value })}
            onKeyDown={handleKeyDown}
            className="w-28"
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={addExtension}
            disabled={!extensionInput.name.trim() || !extensionInput.number.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Press Enter to add quickly</p>
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button 
          onClick={() => onSave(formData)}
          disabled={!formData.name.trim() || !formData.phone.trim() || !formData.address.trim()}
        >
          <Save className="mr-2 h-4 w-4" />
          Save Clinic
        </Button>
      </div>
    </div>
  );
}
