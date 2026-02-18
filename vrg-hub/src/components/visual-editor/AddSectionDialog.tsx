import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Image, Layout, Type } from "lucide-react";

interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (section: { id: string; label: string; type: string }) => void;
}

const sectionTypes = [
  { value: "text", label: "Text Section", icon: Type, description: "Add a text content section" },
  { value: "image", label: "Image Section", icon: Image, description: "Add an image with caption" },
  { value: "content", label: "Content Block", icon: FileText, description: "Add a rich content block" },
  { value: "custom", label: "Custom Section", icon: Layout, description: "Add a custom section" },
];

export function AddSectionDialog({ open, onOpenChange, onAdd }: AddSectionDialogProps) {
  const [sectionName, setSectionName] = useState("");
  const [sectionType, setSectionType] = useState("text");

  const handleAdd = () => {
    if (!sectionName.trim()) return;

    const id = sectionName.toLowerCase().replace(/\s+/g, "-");
    onAdd({
      id,
      label: sectionName,
      type: sectionType,
    });

    // Reset form
    setSectionName("");
    setSectionType("text");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Section</DialogTitle>
          <DialogDescription>
            Create a new editable section for your page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="section-name">Section Name</Label>
            <Input
              id="section-name"
              placeholder="e.g., Features, Testimonials, Gallery"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="section-type">Section Type</Label>
            <Select value={sectionType} onValueChange={setSectionType}>
              <SelectTrigger id="section-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sectionTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {type.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!sectionName.trim()}>
            Add Section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
