import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tag, Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileTag {
  id: string;
  name: string;
  category: string;
  color: string;
}

export const TAG_CATEGORIES = {
  department: {
    label: "Department",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200",
  },
  docType: {
    label: "Document Type",
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200",
  },
  modality: {
    label: "Modality",
    color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200",
  },
  status: {
    label: "Status",
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200",
  },
  accessLevel: {
    label: "Access Level",
    color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200",
  },
  custom: {
    label: "Custom",
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200",
  },
};

// Predefined tags for medical context
export const PREDEFINED_TAGS: FileTag[] = [
  // Department
  { id: "dept-radiology", name: "Radiology", category: "department", color: TAG_CATEGORIES.department.color },
  { id: "dept-admin", name: "Admin", category: "department", color: TAG_CATEGORIES.department.color },
  { id: "dept-hr", name: "HR", category: "department", color: TAG_CATEGORIES.department.color },
  { id: "dept-it", name: "IT", category: "department", color: TAG_CATEGORIES.department.color },
  { id: "dept-clinical", name: "Clinical", category: "department", color: TAG_CATEGORIES.department.color },

  // Document Type
  { id: "type-policy", name: "Policy", category: "docType", color: TAG_CATEGORIES.docType.color },
  { id: "type-protocol", name: "Protocol", category: "docType", color: TAG_CATEGORIES.docType.color },
  { id: "type-form", name: "Form", category: "docType", color: TAG_CATEGORIES.docType.color },
  { id: "type-template", name: "Template", category: "docType", color: TAG_CATEGORIES.docType.color },
  { id: "type-training", name: "Training", category: "docType", color: TAG_CATEGORIES.docType.color },
  { id: "type-report", name: "Report", category: "docType", color: TAG_CATEGORIES.docType.color },

  // Modality
  { id: "mod-ct", name: "CT", category: "modality", color: TAG_CATEGORIES.modality.color },
  { id: "mod-mri", name: "MRI", category: "modality", color: TAG_CATEGORIES.modality.color },
  { id: "mod-xray", name: "X-Ray", category: "modality", color: TAG_CATEGORIES.modality.color },
  { id: "mod-ultrasound", name: "Ultrasound", category: "modality", color: TAG_CATEGORIES.modality.color },
  { id: "mod-mammo", name: "Mammography", category: "modality", color: TAG_CATEGORIES.modality.color },

  // Status
  { id: "status-draft", name: "Draft", category: "status", color: TAG_CATEGORIES.status.color },
  { id: "status-review", name: "Under Review", category: "status", color: TAG_CATEGORIES.status.color },
  { id: "status-approved", name: "Approved", category: "status", color: TAG_CATEGORIES.status.color },
  { id: "status-archived", name: "Archived", category: "status", color: TAG_CATEGORIES.status.color },

  // Access Level
  { id: "access-public", name: "Public", category: "accessLevel", color: TAG_CATEGORIES.accessLevel.color },
  { id: "access-dept", name: "Department Only", category: "accessLevel", color: TAG_CATEGORIES.accessLevel.color },
  { id: "access-admin", name: "Admin Only", category: "accessLevel", color: TAG_CATEGORIES.accessLevel.color },
  { id: "access-confidential", name: "Confidential", category: "accessLevel", color: TAG_CATEGORIES.accessLevel.color },
];

interface FileTagsManagerProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags?: FileTag[];
  mode?: 'compact' | 'full';
}

export function FileTagsManager({
  selectedTags,
  onTagsChange,
  availableTags = PREDEFINED_TAGS,
  mode = 'compact',
}: FileTagsManagerProps) {
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagCategory, setNewTagCategory] = useState("custom");

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  const removeTag = (tagId: string) => {
    onTagsChange(selectedTags.filter(id => id !== tagId));
  };

  const addCustomTag = () => {
    if (newTagName.trim()) {
      const newTag: FileTag = {
        id: `custom-${Date.now()}`,
        name: newTagName.trim(),
        category: newTagCategory,
        color: TAG_CATEGORIES[newTagCategory as keyof typeof TAG_CATEGORIES].color,
      };
      // In a real app, this would be saved to the backend
      onTagsChange([...selectedTags, newTag.id]);
      setNewTagName("");
      setShowAddDialog(false);
    }
  };

  const selectedTagObjects = selectedTags
    .map(id => availableTags.find(tag => tag.id === id))
    .filter(Boolean) as FileTag[];

  const groupedTags = availableTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, FileTag[]>);

  if (mode === 'compact') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {selectedTagObjects.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className={cn("gap-1 pr-1", tag.color)}
          >
            {tag.name}
            <X
              className="h-3 w-3 cursor-pointer hover:text-destructive"
              onClick={() => removeTag(tag.id)}
            />
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1">
              <Tag className="h-3 w-3" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandEmpty>No tags found.</CommandEmpty>
              {Object.entries(groupedTags).map(([category, tags]) => (
                <CommandGroup
                  key={category}
                  heading={TAG_CATEGORIES[category as keyof typeof TAG_CATEGORIES]?.label || category}
                >
                  {tags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => {
                        toggleTag(tag.id);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedTags.includes(tag.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <Badge variant="outline" className={cn("mr-2", tag.color)}>
                        {tag.name}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </Command>
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setOpen(false);
                  setShowAddDialog(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Create Custom Tag
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Create Custom Tag Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Tag</DialogTitle>
              <DialogDescription>
                Add a new custom tag for categorizing files
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tag Name</label>
                <Input
                  placeholder="Enter tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={newTagCategory} onValueChange={setNewTagCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TAG_CATEGORIES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addCustomTag}>Create Tag</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Full mode with category sections
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Tag className="h-4 w-4" />
          File Tags
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Tag
        </Button>
      </div>

      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-4 border-b">
          {selectedTagObjects.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className={cn("gap-1 pr-1", tag.color)}
            >
              {tag.name}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeTag(tag.id)}
              />
            </Badge>
          ))}
        </div>
      )}

      {Object.entries(groupedTags).map(([category, tags]) => (
        <div key={category} className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">
            {TAG_CATEGORIES[category as keyof typeof TAG_CATEGORIES]?.label || category}
          </h4>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all",
                  selectedTags.includes(tag.id) ? tag.color : "hover:bg-accent",
                  tag.color
                )}
                onClick={() => toggleTag(tag.id)}
              >
                {selectedTags.includes(tag.id) && (
                  <Check className="h-3 w-3 mr-1" />
                )}
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
