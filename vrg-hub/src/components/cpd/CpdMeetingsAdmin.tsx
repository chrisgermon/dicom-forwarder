import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Meeting {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  default_duration_hours: number | null;
  location: string | null;
  is_recurring: boolean | null;
  is_active: boolean | null;
}

export function CpdMeetingsAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const { data: meetings, isLoading } = useQuery({
    queryKey: ["cpd-meetings-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cpd_meetings")
        .select("*, category:cpd_categories(name)")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["cpd-categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cpd_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cpd_meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cpd-meetings-all"] });
      toast({ title: "Meeting deleted" });
    },
    onError: () => {
      toast({ title: "Error deleting meeting", variant: "destructive" });
    },
  });

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMeeting(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Meeting Templates</CardTitle>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Meeting
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : meetings?.length === 0 ? (
          <p className="text-muted-foreground">No meetings defined yet.</p>
        ) : (
          <div className="space-y-2">
            {meetings?.map((meeting: any) => (
              <div
                key={meeting.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{meeting.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {meeting.category?.name || "No category"} •{" "}
                    {meeting.default_duration_hours || 0} hrs default
                    {!meeting.is_active && " • Inactive"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(meeting)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(meeting.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <MeetingFormDialog
          open={showForm}
          onOpenChange={handleCloseForm}
          meeting={editingMeeting}
          categories={categories || []}
          userId={user?.id || ""}
        />
      </CardContent>
    </Card>
  );
}

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: () => void;
  meeting: Meeting | null;
  categories: Array<{ id: string; name: string }>;
  userId: string;
}

function MeetingFormDialog({
  open,
  onOpenChange,
  meeting,
  categories,
  userId,
}: MeetingFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: meeting?.name || "",
    description: meeting?.description || "",
    categoryId: meeting?.category_id || "",
    defaultDuration: meeting?.default_duration_hours?.toString() || "",
    location: meeting?.location || "",
    isRecurring: meeting?.is_recurring ?? true,
    isActive: meeting?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        category_id: formData.categoryId || null,
        default_duration_hours: parseFloat(formData.defaultDuration) || null,
        location: formData.location || null,
        is_recurring: formData.isRecurring,
        is_active: formData.isActive,
        created_by: userId,
      };

      if (meeting) {
        const { error } = await supabase
          .from("cpd_meetings")
          .update(payload)
          .eq("id", meeting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cpd_meetings").insert(payload);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["cpd-meetings-all"] });
      queryClient.invalidateQueries({ queryKey: ["cpd-meetings-active"] });
      toast({ title: meeting ? "Meeting updated" : "Meeting created" });
      onOpenChange();
    } catch (error) {
      console.error("Error saving meeting:", error);
      toast({ title: "Error saving meeting", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form when meeting changes
  useState(() => {
    setFormData({
      name: meeting?.name || "",
      description: meeting?.description || "",
      categoryId: meeting?.category_id || "",
      defaultDuration: meeting?.default_duration_hours?.toString() || "",
      location: meeting?.location || "",
      isRecurring: meeting?.is_recurring ?? true,
      isActive: meeting?.is_active ?? true,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{meeting ? "Edit Meeting" : "Add Meeting"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(v) => setFormData((p) => ({ ...p, categoryId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="defaultDuration">Default Duration (hrs)</Label>
              <Input
                id="defaultDuration"
                type="number"
                step="0.5"
                min="0"
                value={formData.defaultDuration}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, defaultDuration: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="isRecurring"
                checked={formData.isRecurring}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, isRecurring: v }))}
              />
              <Label htmlFor="isRecurring">Recurring</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, isActive: v }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onOpenChange}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
