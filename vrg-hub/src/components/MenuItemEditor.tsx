import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';

const iconList = [
  'Home', 'BarChart3', 'ShoppingCart', 'Clock', 'Package', 'Users', 'Settings',
  'Building2', 'FileText', 'UserPlus', 'Mail', 'Network', 'ScrollText',
  'HelpCircle', 'Wrench', 'Megaphone', 'BookOpen', 'UserMinus', 'Printer',
  'MessageCircle', 'FolderOpen', 'Shield', 'Newspaper', 'LifeBuoy',
];

interface MenuItemEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemKey: string;
  currentLabel: string;
  currentIcon?: string;
  onSave: (label: string, icon: string) => Promise<void>;
}

export function MenuItemEditor({
  open,
  onOpenChange,
  itemKey: _itemKey,
  currentLabel,
  currentIcon,
  onSave,
}: MenuItemEditorProps) {
  void _itemKey; // Used for identification
  const [label, setLabel] = useState(currentLabel);
  const [icon, setIcon] = useState(currentIcon || 'FileText');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(label, icon);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving menu item:', error);
    } finally {
      setSaving(false);
    }
  };

  const SelectedIcon = (Icons as any)[icon] || Icons.FileText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Menu Item</DialogTitle>
          <DialogDescription>
            Customize the label and icon for this menu item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Menu item label"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <SelectedIcon className="w-4 h-4" />
                    <span>{icon}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {iconList.map((iconName) => {
                  const IconComponent = (Icons as any)[iconName];
                  return (
                    <SelectItem key={iconName} value={iconName}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        <span>{iconName}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 p-3 border rounded-lg bg-accent/50">
            <SelectedIcon className="w-5 h-5" />
            <span className="font-medium">{label}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
