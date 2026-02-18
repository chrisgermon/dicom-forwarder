import { Button } from '@/components/ui/button';
import { FieldType } from '@/types/form-builder';
import {
  Type,
  AlignLeft,
  Hash,
  Mail,
  Phone,
  ChevronDown,
  CheckSquare,
  Circle,
  Calendar,
  Upload,
  MapPin,
  Package,
} from 'lucide-react';

interface FieldPaletteProps {
  onAddField: (type: FieldType) => void;
}

const fieldTypes: { type: FieldType; label: string; icon: any }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'textarea', label: 'Text Area', icon: AlignLeft },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Phone', icon: Phone },
  { type: 'select', label: 'Dropdown', icon: ChevronDown },
  { type: 'multiselect', label: 'Multi Select', icon: CheckSquare },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'radio', label: 'Radio', icon: Circle },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'file', label: 'File Upload', icon: Upload },
  { type: 'location', label: 'Location', icon: MapPin },
  { type: 'catalog_item', label: 'Catalog Item', icon: Package },
];

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fieldTypes.map(({ type, label, icon: Icon }) => (
        <Button
          key={type}
          variant="outline"
          size="sm"
          onClick={() => onAddField(type)}
          className="justify-start"
        >
          <Icon className="w-4 h-4 mr-2" />
          {label}
        </Button>
      ))}
    </div>
  );
}
