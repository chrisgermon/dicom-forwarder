import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  is_default: boolean | null;
  sort_order: number | null;
}

export function CpdCategoriesAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data: categories, isLoading } = useQuery({
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
      const { error } = await supabase.from("cpd_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cpd-categories-all"] });
      toast({ title: "Category deleted" });
    },
    onError: () => {
      toast({ title: "Error deleting category", variant: "destructive" });
    },
  });

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCategory(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>CPD Categories</CardTitle>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : categories?.length === 0 ? (
          <p className="text-muted-foreground">No categories defined yet.</p>
        ) : (
          <div className="space-y-2">
            {categories?.map((category: Category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {category.name}
                    {category.is_default && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {category.description || "No description"}
                    {!category.is_active && " • Inactive"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(category.id)}
                    disabled={category.is_default || false}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <CategoryFormDialog
          open={showForm}
          onOpenChange={handleCloseForm}
          category={editingCategory}
        />
      </CardContent>
    </Card>
  );
}

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: () => void;
  category: Category | null;
}

function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: category?.name || "",
    description: category?.description || "",
    isActive: category?.is_active ?? true,
    isDefault: category?.is_default ?? false,
    sortOrder: category?.sort_order?.toString() || "0",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        is_active: formData.isActive,
        is_default: formData.isDefault,
        sort_order: parseInt(formData.sortOrder) || 0,
      };

      if (category) {
        const { error } = await supabase
          .from("cpd_categories")
          .update(payload)
          .eq("id", category.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cpd_categories").insert(payload);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["cpd-categories-all"] });
      queryClient.invalidateQueries({ queryKey: ["cpd-categories-active"] });
      toast({ title: category ? "Category updated" : "Category created" });
      onOpenChange();
    } catch (error) {
      console.error("Error saving category:", error);
      toast({ title: "Error saving category", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form when category changes
  useState(() => {
    setFormData({
      name: category?.name || "",
      description: category?.description || "",
      isActive: category?.is_active ?? true,
      isDefault: category?.is_default ?? false,
      sortOrder: category?.sort_order?.toString() || "0",
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle>
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
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData((p) => ({ ...p, sortOrder: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, isActive: v }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, isDefault: v }))}
              />
              <Label htmlFor="isDefault">Default</Label>
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
