import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { AccordionContent as AccordionContentType, AccordionItem as AccordionItemType } from "./types";

interface AccordionModuleProps {
  content: AccordionContentType;
  editing: boolean;
  onChange: (content: AccordionContentType) => void;
}

export function AccordionModule({ content, editing, onChange }: AccordionModuleProps) {
  const addItem = () => {
    const newItem: AccordionItemType = {
      id: crypto.randomUUID(),
      title: "New Section",
      content: "Enter content here...",
    };
    onChange({ ...content, items: [...content.items, newItem] });
  };

  const updateItem = (id: string, updates: Partial<AccordionItemType>) => {
    onChange({
      ...content,
      items: content.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  };

  const deleteItem = (id: string) => {
    onChange({
      ...content,
      items: content.items.filter((item) => item.id !== id),
    });
  };

  if (!editing && content.items.length === 0) {
    return <p className="text-muted-foreground text-sm italic">No accordion items added yet.</p>;
  }

  if (!editing) {
    return (
      <Accordion 
        type={content.allowMultiple ? "multiple" : "single"} 
        collapsible
        className="w-full"
      >
        {content.items.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger className="text-left hover:no-underline">
              {item.title}
            </AccordionTrigger>
            <AccordionContent>
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="allowMultiple"
            checked={content.allowMultiple}
            onCheckedChange={(checked) => onChange({ ...content, allowMultiple: checked })}
          />
          <Label htmlFor="allowMultiple" className="text-sm">Allow multiple open</Label>
        </div>
      </div>

      <div className="space-y-3">
        {content.items.map((item) => (
          <div key={item.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <Input
                value={item.title}
                onChange={(e) => updateItem(item.id, { title: e.target.value })}
                placeholder="Section title"
                className="h-8 flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={item.content}
              onChange={(e) => updateItem(item.id, { content: e.target.value })}
              placeholder="Section content..."
              className="min-h-[80px] text-sm"
            />
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addItem} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-2" />
        Add Section
      </Button>
    </div>
  );
}
