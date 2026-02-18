import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LinkButtonsContent, LinkButton } from "./types";
import { DraggableLinkItem, DraggableLinkItemData } from "./DraggableLinkItem";

interface LinkButtonsModuleProps {
  content: LinkButtonsContent;
  editing: boolean;
  onChange: (content: LinkButtonsContent) => void;
  moduleId: string;
}

// Predefined gradient options for buttons
const GRADIENT_OPTIONS = [
  { value: "from-blue-500 to-blue-600", label: "Blue" },
  { value: "from-purple-500 to-purple-600", label: "Purple" },
  { value: "from-pink-500 to-rose-500", label: "Pink" },
  { value: "from-orange-500 to-orange-600", label: "Orange" },
  { value: "from-emerald-500 to-green-600", label: "Green" },
  { value: "from-cyan-500 to-teal-600", label: "Cyan" },
  { value: "from-violet-500 to-indigo-600", label: "Violet" },
  { value: "from-amber-500 to-yellow-600", label: "Amber" },
];

export function LinkButtonsModule({ content, editing, onChange, moduleId }: LinkButtonsModuleProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${moduleId}`,
    data: { moduleId, moduleType: 'link_buttons' },
  });

  const addButton = () => {
    const newButton: LinkButton = {
      id: crypto.randomUUID(),
      title: "New Button",
      url: "",
      gradient: GRADIENT_OPTIONS[content.buttons.length % GRADIENT_OPTIONS.length].value,
    };
    onChange({ ...content, buttons: [...content.buttons, newButton] });
  };

  const updateButton = (id: string, updates: Partial<DraggableLinkItemData>) => {
    onChange({
      ...content,
      buttons: content.buttons.map((btn) =>
        btn.id === id ? { ...btn, ...updates } : btn
      ),
    });
  };

  const deleteButton = (id: string) => {
    onChange({
      ...content,
      buttons: content.buttons.filter((btn) => btn.id !== id),
    });
  };

  // Convert to draggable item format
  const draggableItems: DraggableLinkItemData[] = content.buttons.map(btn => ({
    id: btn.id,
    title: btn.title,
    url: btn.url,
    gradient: btn.gradient,
    sourceModuleId: moduleId,
    type: 'link_button' as const,
  }));

  if (!editing && content.buttons.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No buttons added yet
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      className={`space-y-4 min-h-[80px] rounded-lg transition-colors ${
        isOver && editing ? 'bg-primary/5 ring-2 ring-primary/20 ring-dashed' : ''
      }`}
    >
      <SortableContext items={draggableItems.map(i => i.id)} strategy={rectSortingStrategy}>
        {/* Display buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {draggableItems.map((item) => (
            <DraggableLinkItem
              key={item.id}
              item={item}
              editing={editing}
              onUpdate={updateButton}
              onDelete={deleteButton}
              gradientOptions={GRADIENT_OPTIONS}
            />
          ))}
        </div>
      </SortableContext>

      {editing && content.buttons.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
          Drag buttons here or add new ones
        </div>
      )}

      {/* Add button (editing mode) */}
      {editing && (
        <Button
          variant="outline"
          size="sm"
          onClick={addButton}
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Button
        </Button>
      )}
    </div>
  );
}

export { GRADIENT_OPTIONS };
