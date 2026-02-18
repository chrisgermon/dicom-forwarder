import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MloUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface SharedMloSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  mloUsers: MloUser[];
  className?: string;
}

export function SharedMloSelector({ value, onChange, mloUsers, className }: SharedMloSelectorProps) {
  return (
    <Select
      value={value || 'all'}
      onValueChange={(val) => onChange(val === 'all' ? null : val)}
    >
      <SelectTrigger className={`h-11 ${className || ''}`}>
        <SelectValue placeholder="Select MLO">
          {value 
            ? mloUsers.find(u => u.id === value)?.full_name || 'Select MLO'
            : 'All MLOs'
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All MLOs</SelectItem>
        {mloUsers.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.full_name || user.email || 'Unknown'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
