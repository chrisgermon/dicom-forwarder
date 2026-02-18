import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { Widget } from "./types";

interface WidgetConfigProps {
  widget: Widget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<Widget>) => void;
}

export function WidgetConfig({ widget, open, onOpenChange, onUpdate }: WidgetConfigProps) {
  const [config, setConfig] = useState(widget.config);
  const [size, setSize] = useState(widget.size);

  const handleSave = () => {
    onUpdate({ config, size });
    onOpenChange(false);
  };

  const renderConfigFields = () => {
    switch (widget.type) {
      case "dynamic-hero":
        return (
          <>
            <div className="space-y-2">
              <Label>Custom Welcome Title (optional)</Label>
              <Input
                value={config.title || ""}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Leave empty for default welcome"
              />
            </div>
            <div className="flex items-center justify-between space-x-2 py-2">
              <div className="space-y-0.5">
                <Label>Show Tasks & Approvals</Label>
                <p className="text-xs text-muted-foreground">Display pending tasks and approvals</p>
              </div>
              <Switch
                checked={config.showTasks !== false}
                onCheckedChange={(checked) => setConfig({ ...config, showTasks: checked })}
              />
            </div>
            <div className="flex items-center justify-between space-x-2 py-2">
              <div className="space-y-0.5">
                <Label>Show Announcements</Label>
                <p className="text-xs text-muted-foreground">Display news and announcements</p>
              </div>
              <Switch
                checked={config.showAnnouncements !== false}
                onCheckedChange={(checked) => setConfig({ ...config, showAnnouncements: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label>Auto-advance Interval (seconds)</Label>
              <Input
                type="number"
                min="0"
                value={(config.autoAdvanceInterval || 6000) / 1000}
                onChange={(e) => setConfig({ ...config, autoAdvanceInterval: parseInt(e.target.value) * 1000 })}
                placeholder="6"
              />
              <p className="text-xs text-muted-foreground">Set to 0 to disable auto-advance</p>
            </div>
          </>
        );

      case "welcome":
        const office365Apps = config.office365Apps || [
          { name: "Outlook", icon: "Mail", url: "https://outlook.office.com", color: "text-blue-600" },
          { name: "Teams", icon: "Users", url: "https://teams.microsoft.com", color: "text-purple-600" },
          { name: "OneDrive", icon: "Cloud", url: "https://onedrive.live.com", color: "text-blue-500" },
          { name: "SharePoint", icon: "Share2", url: "https://www.office.com/launch/sharepoint", color: "text-teal-600" },
        ];

        const commonIcons = [
          "Mail", "Users", "Cloud", "Share2", "FileText", "Sheet", "Presentation",
          "Calendar", "MessageSquare", "Video", "Phone", "Settings", "Database",
          "Globe", "Lock", "UserPlus", "Folder", "Image", "Music", "Film"
        ];

        const colorOptions = [
          { label: "Blue", value: "text-blue-600" },
          { label: "Purple", value: "text-purple-600" },
          { label: "Green", value: "text-green-600" },
          { label: "Red", value: "text-red-600" },
          { label: "Orange", value: "text-orange-600" },
          { label: "Teal", value: "text-teal-600" },
          { label: "Pink", value: "text-pink-600" },
          { label: "Yellow", value: "text-yellow-600" },
          { label: "Indigo", value: "text-indigo-600" },
          { label: "Cyan", value: "text-cyan-600" },
        ];

        const sensors = useSensors(
          useSensor(PointerSensor),
          useSensor(KeyboardSensor)
        );

        const handleAddApp = () => {
          const newApp = { id: `app-${Date.now()}`, name: "New App", icon: "Circle", url: "https://", color: "text-gray-600" };
          setConfig({ ...config, office365Apps: [...office365Apps, newApp] });
        };

        const handleUpdateApp = (index: number, field: string, value: string) => {
          const updatedApps = [...office365Apps];
          updatedApps[index] = { ...updatedApps[index], [field]: value };
          setConfig({ ...config, office365Apps: updatedApps });
        };

        const handleRemoveApp = (index: number) => {
          const updatedApps = office365Apps.filter((_, i) => i !== index);
          setConfig({ ...config, office365Apps: updatedApps });
        };

        const handleDragEnd = (event: DragEndEvent) => {
          const { active, over } = event;
          if (over && active.id !== over.id) {
            const oldIndex = office365Apps.findIndex((app) => (app.id || app.name) === active.id);
            const newIndex = office365Apps.findIndex((app) => (app.id || app.name) === over.id);
            setConfig({ ...config, office365Apps: arrayMove(office365Apps, oldIndex, newIndex) });
          }
        };

        const SortableAppItem = ({ app, index }: { app: any; index: number }) => {
          const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
          } = useSortable({ id: app.id || app.name });

          const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
          };

          const IconComponent = (LucideIcons as any)[app.icon];

          return (
            <div ref={setNodeRef} style={style} className="border rounded-lg p-3 space-y-2 bg-background">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div {...attributes} {...listeners} className="cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Label className="text-xs text-muted-foreground">App {index + 1}</Label>
                  {IconComponent && <IconComponent className={`h-3 w-3 ${app.color}`} />}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveApp(index)}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={app.name}
                    onChange={(e) => handleUpdateApp(index, 'name', e.target.value)}
                    placeholder="App name"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Icon</Label>
                  <Select
                    value={app.icon}
                    onValueChange={(value) => handleUpdateApp(index, 'icon', value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-popover z-50">
                      {commonIcons.map((iconName) => {
                        const Icon = (LucideIcons as any)[iconName];
                        return (
                          <SelectItem key={iconName} value={iconName}>
                            <div className="flex items-center gap-2">
                              {Icon && <Icon className="h-3 w-3" />}
                              <span>{iconName}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Color</Label>
                  <Select
                    value={app.color}
                    onValueChange={(value) => handleUpdateApp(index, 'color', value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${color.value.replace('text-', 'bg-')}`} />
                            <span>{color.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={app.url}
                    onChange={(e) => handleUpdateApp(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          );
        };

        return (
          <>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={config.title || ""}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Welcome message"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={config.subtitle || ""}
                onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                placeholder="Subtitle text"
              />
            </div>
            
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <Label>Office 365 Quick Access Apps</Label>
                <Button size="sm" variant="outline" onClick={handleAddApp}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add App
                </Button>
              </div>
              
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={office365Apps.map(app => app.id || app.name)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {office365Apps.map((app, index) => (
                      <SortableAppItem key={app.id || app.name} app={app} index={index} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </>
        );

      case "news-feed":
      case "notifications":
      case "recent-activity":
      case "quick-links":
      case "company-info":
        return (
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={config.title || ""}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              placeholder="Widget title"
            />
          </div>
        );

      case "text-block":
        return (
          <>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={config.title || ""}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Block title"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={config.content || ""}
                onChange={(e) => setConfig({ ...config, content: e.target.value })}
                placeholder="Text content"
                rows={4}
              />
            </div>
          </>
        );

      case "stats-card":
        return (
          <>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={config.title || ""}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Stat title"
              />
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                value={config.value || ""}
                onChange={(e) => setConfig({ ...config, value: e.target.value })}
                placeholder="Stat value"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={config.description || ""}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Description"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Widget</DialogTitle>
          <DialogDescription>
            Customize the appearance and behavior of this component
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Width (Grid Columns)</Label>
            <Select
              value={size.width.toString()}
              onValueChange={(value) => setSize({ ...size, width: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 columns (1/4)</SelectItem>
                <SelectItem value="4">4 columns (1/3)</SelectItem>
                <SelectItem value="6">6 columns (1/2)</SelectItem>
                <SelectItem value="8">8 columns (2/3)</SelectItem>
                <SelectItem value="12">12 columns (Full)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderConfigFields()}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
