import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, User, Pencil, Check, X, Trash2 } from 'lucide-react';
import { Contact } from '@/types/directory';
import { cn } from '@/lib/utils';

const CONTACT_TYPES = [
  { value: 'admin', label: 'Administration' },
  { value: 'management', label: 'Management' },
  { value: 'clinical', label: 'Clinical' },
  { value: 'billing', label: 'Billing' },
  { value: 'other', label: 'Other' },
];

interface InlineContactEditorProps {
  contact: Contact;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (contact: Contact) => void;
  onCancel: () => void;
  onDelete: () => void;
  showEditControls?: boolean;
}

export function InlineContactEditor({
  contact,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  showEditControls = false,
}: InlineContactEditorProps) {
  const [formData, setFormData] = useState(contact);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setFormData(contact);
  }, [contact]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  const handleSave = () => {
    if (formData.name.trim() && formData.title.trim()) {
      onSave(formData);
    }
  };

  if (isEditing) {
    return (
      <Card className="h-full border-primary shadow-lg ring-2 ring-primary/20" onKeyDown={handleKeyDown}>
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <Input
                ref={nameInputRef}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                className="font-semibold text-base h-8"
              />
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Job title"
                className="text-sm h-7"
              />
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button size="sm" variant="ghost" onClick={onCancel} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave} className="h-8 w-8 p-0" disabled={!formData.name.trim() || !formData.title.trim()}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select
              value={formData.contact_type || 'admin'}
              onValueChange={(value) => setFormData({ ...formData, contact_type: value })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(03) 1234 5678"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Email</label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                className="h-8 text-sm"
              />
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
        showEditControls && "hover:shadow-md cursor-pointer"
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
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-semibold truncate">{contact.name}</CardTitle>
            <p className="text-sm text-muted-foreground truncate">{contact.title}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {contact.contact_type && (
          <Badge variant="secondary" className="text-xs capitalize">
            {contact.contact_type}
          </Badge>
        )}
        
        {contact.phone && (
          <a 
            href={`tel:${contact.phone.replace(/\s/g, '')}`} 
            className="flex items-center gap-2.5 text-sm group/link"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-foreground group-hover/link:text-primary transition-colors">
              {contact.phone}
            </span>
          </a>
        )}
        
        {contact.email && (
          <a 
            href={`mailto:${contact.email}`} 
            className="flex items-center gap-2.5 text-sm group/link"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-foreground group-hover/link:text-primary transition-colors truncate">
              {contact.email}
            </span>
          </a>
        )}
        
        {!contact.phone && !contact.email && (
          <p className="text-sm text-muted-foreground italic">No contact details</p>
        )}
      </CardContent>
    </Card>
  );
}
