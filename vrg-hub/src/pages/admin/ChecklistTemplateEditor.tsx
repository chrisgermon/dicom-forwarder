import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChecklistAdmin } from "@/hooks/useChecklistAdmin";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function ChecklistTemplateEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === "new";
  const { createTemplate, updateTemplate, createItem, updateItem, deleteItem, fetchTemplate, fetchTemplateItems } = useChecklistAdmin();

  const [templateData, setTemplateData] = useState({
    name: "",
    description: "",
    checklist_type: "daily",
    location_id: "",
    brand_id: "",
    is_active: true,
  });

  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    task_description: "",
    time_slot: "",
    allow_na: true,
    is_required: true,
  });

  // Fetch locations and brands
  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Brands query - kept for potential future use
  void useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Load existing template
  useEffect(() => {
    if (!isNew && id) {
      fetchTemplate(id).then((template) => {
        setTemplateData({
          name: template.name,
          description: template.description || "",
          checklist_type: template.checklist_type,
          location_id: template.location_id || "",
          brand_id: template.brand_id || "",
          is_active: template.is_active,
        });
      });

      fetchTemplateItems(id).then(setItems);
    }
  }, [id, isNew]);

  const handleSaveTemplate = async () => {
    if (!templateData.name) {
      toast.error("Template name is required");
      return;
    }

    if (isNew) {
      const result = await createTemplate.mutateAsync(templateData);
      navigate(`/admin/checklist-templates/${result.id}`);
    } else {
      await updateTemplate.mutateAsync({ id: id!, ...templateData });
    }
  };

  const handleAddItem = async () => {
    if (!newItem.task_description) {
      toast.error("Task description is required");
      return;
    }

    if (isNew) {
      toast.error("Please save the template first");
      return;
    }

    const item = {
      template_id: id!,
      ...newItem,
      sort_order: items.length,
    };

    const result = await createItem.mutateAsync(item);
    setItems([...items, result]);
    setNewItem({ task_description: "", time_slot: "", allow_na: true, is_required: true });
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem.mutateAsync(itemId);
    setItems(items.filter((i) => i.id !== itemId));
  };

  const handleMoveItem = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];

    // Update sort orders
    await Promise.all(
      newItems.map((item, idx) =>
        updateItem.mutateAsync({ id: item.id, sort_order: idx })
      )
    );

    setItems(newItems);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate("/admin/checklist-templates")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Templates
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{isNew ? "New Template" : "Edit Template"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Template Name</Label>
            <Input
              value={templateData.name}
              onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
              placeholder="Daily Clinic Checklist"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={templateData.description}
              onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
              placeholder="Description of this checklist"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select
                value={templateData.checklist_type}
                onValueChange={(value) => setTemplateData({ ...templateData, checklist_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Location</Label>
              <Select
                value={templateData.location_id}
                onValueChange={(value) => setTemplateData({ ...templateData, location_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch
              checked={templateData.is_active}
              onCheckedChange={(checked) => setTemplateData({ ...templateData, is_active: checked })}
            />
          </div>

          <Button onClick={handleSaveTemplate} className="w-full">
            {isNew ? "Create Template" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {!isNew && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add New Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Task Description</Label>
                <Input
                  value={newItem.task_description}
                  onChange={(e) => setNewItem({ ...newItem, task_description: e.target.value })}
                  placeholder="Check equipment status"
                />
              </div>

              <div>
                <Label>Time Slot (optional)</Label>
                <Input
                  value={newItem.time_slot}
                  onChange={(e) => setNewItem({ ...newItem, time_slot: e.target.value })}
                  placeholder="7am, 10am, 2pm, etc."
                />
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newItem.allow_na}
                    onCheckedChange={(checked) => setNewItem({ ...newItem, allow_na: checked })}
                  />
                  <Label>Allow N/A</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newItem.is_required}
                    onCheckedChange={(checked) => setNewItem({ ...newItem, is_required: checked })}
                  />
                  <Label>Required</Label>
                </div>
              </div>

              <Button onClick={handleAddItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Checklist Items ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-card"
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveItem(index, "up")}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveItem(index, "down")}
                        disabled={index === items.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex-1">
                      <div className="font-medium">{item.task_description}</div>
                      {item.time_slot && (
                        <div className="text-sm text-muted-foreground">
                          Time: {item.time_slot}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No items yet. Add your first task above.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
