import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, GripVertical } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";

interface QuickAction {
  icon: string;
  label: string;
  href: string;
  color: string;
}

interface QuickActionsEditorProps {
  actions: QuickAction[];
  onSave: (actions: QuickAction[]) => void;
}

const availableIcons = [
  "FileText", "Calendar", "Users", "TrendingUp", "Home", "Settings",
  "Mail", "Phone", "MessageSquare", "Bell", "Clock", "Search",
  "Plus", "Minus", "Check", "X", "Info", "AlertCircle",
  "HelpCircle", "Star", "Heart", "Bookmark", "Flag", "Tag",
  "Folder", "File", "Image", "Video", "Music", "Download",
  "Upload", "Share", "Link", "Copy", "Edit", "Trash",
  "Save", "Archive", "Lock", "Unlock", "Eye", "EyeOff",
  "Zap", "Activity", "BarChart", "PieChart", "TrendingDown",
  "DollarSign", "CreditCard", "ShoppingCart", "Package", "Truck"
];

const colorOptions = [
  { value: "text-blue-600", label: "Blue" },
  { value: "text-green-600", label: "Green" },
  { value: "text-purple-600", label: "Purple" },
  { value: "text-orange-600", label: "Orange" },
  { value: "text-red-600", label: "Red" },
  { value: "text-pink-600", label: "Pink" },
  { value: "text-yellow-600", label: "Yellow" },
  { value: "text-cyan-600", label: "Cyan" },
  { value: "text-indigo-600", label: "Indigo" },
  { value: "text-teal-600", label: "Teal" },
];

export function QuickActionsEditor({ actions, onSave }: QuickActionsEditorProps) {
  const [editingActions, setEditingActions] = useState<QuickAction[]>(actions);
  const [isOpen, setIsOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentAction, setCurrentAction] = useState<QuickAction>({
    icon: "FileText",
    label: "",
    href: "",
    color: "text-blue-600",
  });

  const handleAddAction = () => {
    if (!currentAction.label || !currentAction.href) {
      toast.error("Please fill in all fields");
      return;
    }

    if (editingIndex !== null) {
      const updated = [...editingActions];
      updated[editingIndex] = currentAction;
      setEditingActions(updated);
      setEditingIndex(null);
    } else {
      setEditingActions([...editingActions, currentAction]);
    }

    setCurrentAction({
      icon: "FileText",
      label: "",
      href: "",
      color: "text-blue-600",
    });
  };

  const handleEditAction = (index: number) => {
    setCurrentAction(editingActions[index]);
    setEditingIndex(index);
  };

  const handleDeleteAction = (index: number) => {
    setEditingActions(editingActions.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(editingActions);
    setIsOpen(false);
    toast.success("Quick actions updated successfully");
  };

  const IconComponent = currentAction.icon
    ? (LucideIcons as any)[currentAction.icon]
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit2 className="h-4 w-4 mr-2" />
          Edit Quick Actions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Quick Actions</DialogTitle>
          <DialogDescription>
            Customize the quick action buttons displayed on the home page
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Actions List */}
          <div className="space-y-2">
            <Label>Current Actions</Label>
            <div className="space-y-2">
              {editingActions.map((action, index) => {
                const Icon = (LucideIcons as any)[action.icon];
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    {Icon && <Icon className={`h-5 w-5 ${action.color}`} />}
                    <div className="flex-1">
                      <p className="font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.href}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditAction(index)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAction(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add/Edit Form */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h4 className="font-medium">
              {editingIndex !== null ? "Edit Action" : "Add New Action"}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={currentAction.label}
                  onChange={(e) =>
                    setCurrentAction({ ...currentAction, label: e.target.value })
                  }
                  placeholder="e.g., New Request"
                />
              </div>

              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  value={currentAction.href}
                  onChange={(e) =>
                    setCurrentAction({ ...currentAction, href: e.target.value })
                  }
                  placeholder="e.g., /new-request"
                />
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={currentAction.icon}
                  onValueChange={(value) =>
                    setCurrentAction({ ...currentAction, icon: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {availableIcons.map((icon) => {
                      const Icon = (LucideIcons as any)[icon];
                      return (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            {Icon && <Icon className="h-4 w-4" />}
                            <span>{icon}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <Select
                  value={currentAction.color}
                  onValueChange={(value) =>
                    setCurrentAction({ ...currentAction, color: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${color.value}`}>●</div>
                          <span>{color.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            {IconComponent && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="flex items-center justify-center h-24 border rounded-lg bg-background">
                  <div className="flex flex-col items-center gap-2">
                    <IconComponent className={`h-6 w-6 ${currentAction.color}`} />
                    <span className="font-medium">{currentAction.label || "Label"}</span>
                  </div>
                </div>
              </div>
            )}

            <Button onClick={handleAddAction} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {editingIndex !== null ? "Update Action" : "Add Action"}
            </Button>
          </div>

          {/* Save Button */}
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingActions(actions);
                setIsOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}