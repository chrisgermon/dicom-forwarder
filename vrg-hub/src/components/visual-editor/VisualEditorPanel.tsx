import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { FieldEditor } from "./FieldEditor";

interface Field {
  name: string;
  label: string;
  type: "text" | "textarea" | "image";
  value: string;
}

interface VisualEditorPanelProps {
  sectionLabel: string;
  fields: Field[];
  onChange: (name: string, value: string) => void;
  onDelete?: () => void;
}

export function VisualEditorPanel({
  sectionLabel,
  fields,
  onChange,
  onDelete,
}: VisualEditorPanelProps) {
  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-background border-l shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">{sectionLabel}</h2>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Edit section content</p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <FieldEditor fields={fields} onChange={onChange} />
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground">
          Changes are tracked automatically. Click Save to persist.
        </p>
      </div>
    </div>
  );
}
