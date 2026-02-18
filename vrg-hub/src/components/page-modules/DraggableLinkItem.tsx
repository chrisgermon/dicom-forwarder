import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GripVertical, Trash2, ExternalLink, Printer } from "lucide-react";

export interface DraggableLinkItemData {
  id: string;
  title: string;
  url: string;
  description?: string;
  gradient?: string;
  icon?: string;
  sourceModuleId: string;
  type: 'quick_link' | 'link_button';
}

interface DraggableLinkItemProps {
  item: DraggableLinkItemData;
  editing: boolean;
  onUpdate: (id: string, updates: Partial<DraggableLinkItemData>) => void;
  onDelete: (id: string) => void;
  gradientOptions?: { value: string; label: string }[];
}

export function DraggableLinkItem({ 
  item, 
  editing, 
  onUpdate, 
  onDelete, 
  gradientOptions 
}: DraggableLinkItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.id,
    data: { item },
    disabled: !editing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (item.type === 'link_button') {
    return (
      <div ref={setNodeRef} style={style} className="relative group">
        {editing ? (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between gap-2">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted shrink-0"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </button>
              <Label className="text-xs text-muted-foreground flex-1">Button Label</Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <Input
              value={item.title}
              onChange={(e) => onUpdate(item.id, { title: e.target.value })}
              placeholder="Button label"
              className="h-8 text-sm"
            />
            <div>
              <Label className="text-xs text-muted-foreground">URL</Label>
              <Input
                value={item.url}
                onChange={(e) => onUpdate(item.id, { url: e.target.value })}
                placeholder="https://..."
                className="h-8 text-sm"
              />
            </div>
            {gradientOptions && (
              <div>
                <Label className="text-xs text-muted-foreground">Color</Label>
                <select
                  value={item.gradient || gradientOptions[0]?.value}
                  onChange={(e) => onUpdate(item.id, { gradient: e.target.value })}
                  className="w-full h-8 text-sm rounded-md border border-input bg-background px-2"
                >
                  {gradientOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* Preview */}
            <div className="pt-2">
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-medium text-sm bg-gradient-to-r ${item.gradient || 'from-blue-500 to-blue-600'} shadow-md`}
              >
                <Printer className="h-4 w-4" />
                {item.title || "Preview"}
              </div>
            </div>
          </div>
        ) : (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-white font-semibold text-base bg-gradient-to-r ${item.gradient || 'from-blue-500 to-blue-600'} shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] cursor-pointer`}
          >
            <Printer className="h-5 w-5" />
            {item.title}
            <ExternalLink className="h-4 w-4 opacity-70" />
          </a>
        )}
      </div>
    );
  }

  // Quick Link style
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative bg-muted/50 rounded-lg p-4 hover:bg-muted transition-colors"
    >
      {editing && (
        <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-background"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      )}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center text-center gap-2"
        onClick={(e) => editing && e.preventDefault()}
      >
        <div className="p-2 rounded-lg bg-primary/10">
          <ExternalLink className="h-5 w-5 text-primary" />
        </div>
        <span className="text-sm font-medium line-clamp-2">{item.title}</span>
        {item.description && (
          <span className="text-xs text-muted-foreground line-clamp-1">{item.description}</span>
        )}
      </a>
    </div>
  );
}
