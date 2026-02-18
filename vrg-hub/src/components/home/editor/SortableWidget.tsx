import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Settings } from "lucide-react";
import { WidgetRenderer } from "./WidgetRenderer";
import { WidgetConfig } from "./WidgetConfig";
import { useState } from "react";
import type { Widget } from "./types";

interface SortableWidgetProps {
  widget: Widget;
  onRemove: () => void;
  onUpdate: (updates: Partial<Widget>) => void;
  previewMode: boolean;
}

export function SortableWidget({ widget, onRemove, onUpdate, previewMode }: SortableWidgetProps) {
  const [showConfig, setShowConfig] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Map widget width to actual Tailwind classes
  const getColSpanClass = (width: number) => {
    const colSpanMap: Record<number, string> = {
      1: "col-span-1",
      2: "col-span-2",
      3: "col-span-3",
      4: "col-span-4",
      5: "col-span-5",
      6: "col-span-6",
      7: "col-span-7",
      8: "col-span-8",
      9: "col-span-9",
      10: "col-span-10",
      11: "col-span-11",
      12: "col-span-12",
    };
    return colSpanMap[Math.min(width, 12)] || "col-span-12";
  };

  const colSpan = getColSpanClass(widget.size.width);

  if (previewMode) {
    return (
      <div ref={setNodeRef} style={style} className={colSpan}>
        <WidgetRenderer widget={widget} />
      </div>
    );
  }

  return (
    <>
      <div ref={setNodeRef} style={style} className={colSpan}>
        <Card className="relative group border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowConfig(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-7 w-7"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div
            className="absolute top-2 left-2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity z-10"
            {...attributes}
            {...listeners}
          >
            <Button variant="secondary" size="icon" className="h-7 w-7">
              <GripVertical className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 pt-12">
            <WidgetRenderer widget={widget} isEditor />
          </div>
        </Card>
      </div>

      <WidgetConfig
        widget={widget}
        open={showConfig}
        onOpenChange={setShowConfig}
        onUpdate={onUpdate}
      />
    </>
  );
}
