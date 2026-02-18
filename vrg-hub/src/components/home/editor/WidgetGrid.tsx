import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { ResizableWidget } from "./ResizableWidget";
import type { Widget } from "./types";

interface WidgetGridProps {
  widgets: Widget[];
  onRemoveWidget: (id: string) => void;
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void;
  onReorderWidgets: (widgets: Widget[]) => void;
  previewMode: boolean;
}

export function WidgetGrid({ widgets, onRemoveWidget, onUpdateWidget, onReorderWidgets, previewMode }: WidgetGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);
      onReorderWidgets(arrayMove(widgets, oldIndex, newIndex));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-12 gap-x-3 gap-y-3 auto-rows-auto">
          {widgets.map((widget) => (
            <ResizableWidget
              key={widget.id}
              widget={widget}
              onRemove={() => onRemoveWidget(widget.id)}
              onUpdate={(updates) => onUpdateWidget(widget.id, updates)}
              previewMode={previewMode}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
