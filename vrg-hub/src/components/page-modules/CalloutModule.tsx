import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { CalloutContent } from "./types";
import { cn } from "@/lib/utils";

interface CalloutModuleProps {
  content: CalloutContent;
  editing: boolean;
  onChange: (content: CalloutContent) => void;
}

const CALLOUT_TYPES = [
  { value: 'info', label: 'Information', icon: Info, className: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200' },
  { value: 'success', label: 'Success', icon: CheckCircle, className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, className: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200' },
  { value: 'error', label: 'Error', icon: AlertCircle, className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200' },
];

export function CalloutModule({ content, editing, onChange }: CalloutModuleProps) {
  const calloutType = CALLOUT_TYPES.find((t) => t.value === content.type) || CALLOUT_TYPES[0];
  const Icon = calloutType.icon;

  const renderCallout = () => (
    <div className={cn("flex gap-3 p-4 rounded-lg border", calloutType.className)}>
      <Icon className="h-5 w-5 mt-0.5 shrink-0" />
      <div className="space-y-1">
        {content.title && <p className="font-semibold">{content.title}</p>}
        {content.message && <p className="text-sm opacity-90">{content.message}</p>}
      </div>
    </div>
  );

  if (!editing) {
    if (!content.title && !content.message) {
      return <p className="text-muted-foreground text-sm italic">No callout content added yet.</p>;
    }
    return renderCallout();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Type</Label>
        <Select
          value={content.type}
          onValueChange={(value) => onChange({ ...content, type: value as CalloutContent['type'] })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CALLOUT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <type.icon className="h-4 w-4" />
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Title (optional)</Label>
        <Input
          value={content.title}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
          placeholder="Callout title"
          className="h-8"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Message</Label>
        <Textarea
          value={content.message}
          onChange={(e) => onChange({ ...content, message: e.target.value })}
          placeholder="Enter your message..."
          className="min-h-[80px]"
        />
      </div>

      <div className="pt-2 border-t">
        <Label className="text-xs text-muted-foreground">Preview</Label>
        <div className="mt-2">
          {renderCallout()}
        </div>
      </div>
    </div>
  );
}
