import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DividerContent } from "./types";

interface DividerModuleProps {
  content: DividerContent;
  editing: boolean;
  onChange: (content: DividerContent) => void;
}

const DIVIDER_STYLES = [
  { value: 'solid', label: 'Solid Line' },
  { value: 'dashed', label: 'Dashed Line' },
  { value: 'dotted', label: 'Dotted Line' },
  { value: 'gradient', label: 'Gradient' },
];

const SPACING_OPTIONS = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
];

export function DividerModule({ content, editing, onChange }: DividerModuleProps) {
  const spacingClass = {
    sm: 'my-2',
    md: 'my-4',
    lg: 'my-8',
  }[content.spacing];

  const dividerStyle = () => {
    switch (content.style) {
      case 'dashed':
        return <hr className={`border-dashed border-border ${spacingClass}`} />;
      case 'dotted':
        return <hr className={`border-dotted border-border ${spacingClass}`} />;
      case 'gradient':
        return (
          <div className={`h-px bg-gradient-to-r from-transparent via-border to-transparent ${spacingClass}`} />
        );
      default:
        return <hr className={`border-border ${spacingClass}`} />;
    }
  };

  if (!editing) {
    return dividerStyle();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Style</Label>
          <Select
            value={content.style}
            onValueChange={(value) => onChange({ ...content, style: value as DividerContent['style'] })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIVIDER_STYLES.map((style) => (
                <SelectItem key={style.value} value={style.value}>
                  {style.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Spacing</Label>
          <Select
            value={content.spacing}
            onValueChange={(value) => onChange({ ...content, spacing: value as DividerContent['spacing'] })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPACING_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="pt-2 border-t">
        <Label className="text-xs text-muted-foreground">Preview</Label>
        {dividerStyle()}
      </div>
    </div>
  );
}
