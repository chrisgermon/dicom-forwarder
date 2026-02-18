import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ICON_OPTIONS, getIconComponent } from '@/utils/iconMap';

interface IconSelectorProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconSelector({ value, onChange }: IconSelectorProps) {
  const SelectedIcon = getIconComponent(value);

  return (
    <div className="space-y-2">
      <Label>Icon</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <SelectedIcon className="w-4 h-4 mr-2" />
            {value || 'Select icon'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid grid-cols-6 gap-2">
            {ICON_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.name}
                  variant={value === option.name ? 'default' : 'ghost'}
                  size="sm"
                  className="h-10 w-10 p-0"
                  onClick={() => onChange(option.name)}
                  title={option.name}
                >
                  <Icon className="w-4 h-4" />
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
