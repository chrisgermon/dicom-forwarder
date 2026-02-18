import { useState, useRef, useEffect } from "react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Settings, GripHorizontal } from "lucide-react";
import { WidgetRenderer } from "./WidgetRenderer";
import { WidgetConfig } from "./WidgetConfig";
import type { Widget } from "./types";

interface ResizableWidgetProps {
  widget: Widget;
  onRemove: () => void;
  onUpdate: (updates: Partial<Widget>) => void;
  previewMode: boolean;
}

export function ResizableWidget({ widget, onRemove, onUpdate, previewMode }: ResizableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });
  const [showConfig, setShowConfig] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, width: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

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

  const colSpan = colSpanMap[Math.min(widget.size.width, 12)] || "col-span-12";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      width: widget.size.width,
    });
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!widgetRef.current) return;

      const containerWidth = widgetRef.current.parentElement?.offsetWidth || 1200;
      const columnWidth = containerWidth / 12;
      const deltaX = e.clientX - resizeStart.x;
      const columnsDelta = Math.round(deltaX / columnWidth);
      const newWidth = Math.max(1, Math.min(12, resizeStart.width + columnsDelta));

      if (newWidth !== widget.size.width) {
        onUpdate({ size: { ...widget.size, width: newWidth } });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizeStart, widget.size, onUpdate]);

  if (previewMode) {
    return (
      <div ref={widgetRef} className={colSpan}>
        <WidgetRenderer widget={widget} />
      </div>
    );
  }

  return (
    <>
      <div ref={setNodeRef} style={style} className={colSpan}>
        <Card className="relative group border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors h-full">
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

          {/* Resize Handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-primary/20 transition-opacity z-10 flex items-center justify-center"
            onMouseDown={handleResizeStart}
          >
            <GripHorizontal className="h-4 w-4 text-primary rotate-90" />
          </div>

          <div className="p-0">
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
