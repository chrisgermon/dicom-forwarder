import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Phone, Printer, MapPin, Pencil, Check, X, Plus, Trash2 } from 'lucide-react';
import { Clinic } from '@/types/directory';
import { cn } from '@/lib/utils';

interface InlineClinicEditorProps {
  clinic: Clinic;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (clinic: Clinic) => void;
  onCancel: () => void;
  onDelete: () => void;
  showEditControls?: boolean;
  isDragging?: boolean;
}

export function InlineClinicEditor({
  clinic,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  showEditControls = false,
  isDragging = false,
}: InlineClinicEditorProps) {
  const [formData, setFormData] = useState(clinic);
  const [extensionInput, setExtensionInput] = useState({ name: '', number: '' });
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setFormData(clinic);
  }, [clinic]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  const handleSave = () => {
    if (formData.name.trim() && formData.phone.trim()) {
      onSave(formData);
    }
  };

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

  const handleExtensionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addExtension();
    }
  };

  if (isEditing) {
    return (
      <Card className="h-full border-primary shadow-lg ring-2 ring-primary/20" onKeyDown={handleKeyDown}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <Input
              ref={nameInputRef}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Clinic name"
              className="font-semibold text-base h-8"
            />
            <div className="flex gap-1 flex-shrink-0">
              <Button size="sm" variant="ghost" onClick={onCancel} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave} className="h-8 w-8 p-0" disabled={!formData.name.trim() || !formData.phone.trim()}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Phone *</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(03) 1234 5678"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Fax</label>
              <Input
                value={formData.fax}
                onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                placeholder="(03) 1234 5679"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Address</label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter address"
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Extensions</label>
            {formData.extensions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {formData.extensions.map((ext, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="py-0.5 px-2 gap-1 text-xs"
                  >
                    <span>{ext.name}:</span>
                    <span className="font-mono">{ext.number}</span>
                    <button
                      type="button"
                      onClick={() => removeExtension(index)}
                      className="ml-0.5 hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <Input
                placeholder="Name"
                value={extensionInput.name}
                onChange={(e) => setExtensionInput({ ...extensionInput, name: e.target.value })}
                onKeyDown={handleExtensionKeyDown}
                className="h-7 text-xs flex-1"
              />
              <Input
                placeholder="Ext"
                value={extensionInput.number}
                onChange={(e) => setExtensionInput({ ...extensionInput, number: e.target.value })}
                onKeyDown={handleExtensionKeyDown}
                className="h-7 text-xs w-16"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={addExtension}
                disabled={!extensionInput.name.trim() || !extensionInput.number.trim()}
                className="h-7 w-7 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t text-xs text-muted-foreground">
            <span>⌘+Enter to save, Esc to cancel</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDelete}
              className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "h-full transition-all group relative",
        showEditControls && "hover:shadow-md cursor-pointer",
        isDragging && "opacity-50"
      )}
      onClick={showEditControls ? onEdit : undefined}
    >
      {showEditControls && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="h-7 w-7 p-0 shadow-sm"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-base font-semibold">{clinic.name}</span>
          {clinic.region && (
            <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded">
              {clinic.region}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="space-y-2">
          <a 
            href={`tel:${clinic.phone.replace(/\s/g, '')}`} 
            className="flex items-center gap-2.5 text-sm group/link"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-foreground group-hover/link:text-primary transition-colors font-medium">
              {clinic.phone}
            </span>
          </a>
          
          {clinic.fax && (
            <div className="flex items-center gap-2.5 text-sm">
              <Printer className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{clinic.fax}</span>
            </div>
          )}
          
          <div className="flex items-start gap-2.5 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground text-xs leading-relaxed">{clinic.address}</span>
          </div>
        </div>

        {clinic.extensions.length > 0 && (
          <div className="pt-3 mt-3 border-t">
            <h4 className="font-semibold text-xs mb-2 text-foreground uppercase tracking-wide">
              Extensions
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {clinic.extensions.map((ext, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{ext.name}</span>
                  <span className="font-mono font-medium text-foreground ml-2">{ext.number}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
