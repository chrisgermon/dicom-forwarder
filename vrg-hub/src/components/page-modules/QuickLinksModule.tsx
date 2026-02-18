import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { QuickLink, QuickLinksContent } from "./types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DraggableLinkItem, DraggableLinkItemData } from "./DraggableLinkItem";

interface QuickLinksModuleProps {
  content: QuickLinksContent;
  editing: boolean;
  onChange: (content: QuickLinksContent) => void;
  moduleId: string;
}

export function QuickLinksModule({ content, editing, onChange, moduleId }: QuickLinksModuleProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLink, setNewLink] = useState<Partial<QuickLink>>({});

  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${moduleId}`,
    data: { moduleId, moduleType: 'quick_links' },
  });

  const addLink = () => {
    if (!newLink.title || !newLink.url) return;
    
    const link: QuickLink = {
      id: crypto.randomUUID(),
      title: newLink.title,
      url: newLink.url,
      description: newLink.description,
      icon: newLink.icon,
    };
    
    onChange({ links: [...content.links, link] });
    setNewLink({});
    setDialogOpen(false);
  };

  const removeLink = (id: string) => {
    onChange({ links: content.links.filter(l => l.id !== id) });
  };

  const updateLink = (id: string, updates: Partial<DraggableLinkItemData>) => {
    onChange({
      links: content.links.map(l => 
        l.id === id ? { ...l, ...updates } : l
      ),
    });
  };

  // Convert to draggable item format
  const draggableItems: DraggableLinkItemData[] = content.links.map(link => ({
    id: link.id,
    title: link.title,
    url: link.url,
    description: link.description,
    icon: link.icon,
    sourceModuleId: moduleId,
    type: 'quick_link' as const,
  }));

  if (!editing && content.links.length === 0) {
    return <p className="text-muted-foreground text-sm italic">No quick links added yet.</p>;
  }

  return (
    <div 
      ref={setNodeRef}
      className={`space-y-3 min-h-[80px] rounded-lg transition-colors ${
        isOver && editing ? 'bg-primary/5 ring-2 ring-primary/20 ring-dashed' : ''
      }`}
    >
      <SortableContext items={draggableItems.map(i => i.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {draggableItems.map((item) => (
            <DraggableLinkItem
              key={item.id}
              item={item}
              editing={editing}
              onUpdate={updateLink}
              onDelete={removeLink}
            />
          ))}
        </div>
      </SortableContext>

      {editing && content.links.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
          Drag links here or add new ones
        </div>
      )}

      {editing && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Add Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Quick Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={newLink.title || ""}
                  onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                  placeholder="Link title"
                />
              </div>
              <div className="space-y-2">
                <Label>URL *</Label>
                <Input
                  value={newLink.url || ""}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={newLink.description || ""}
                  onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>
              <Button onClick={addLink} disabled={!newLink.title || !newLink.url}>
                Add Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
