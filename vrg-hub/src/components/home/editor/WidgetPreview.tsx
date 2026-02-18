import { Card } from "@/components/ui/card";
import type { Widget } from "./types";

interface WidgetPreviewProps {
  widget: Widget;
}

export function WidgetPreview({ widget }: WidgetPreviewProps) {
  return (
    <Card className="p-4 opacity-50 border-2 border-primary rotate-3">
      <div className="text-sm font-medium">{widget.type}</div>
    </Card>
  );
}
