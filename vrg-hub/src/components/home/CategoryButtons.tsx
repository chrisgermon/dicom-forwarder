import { Button } from "@/components/ui/button";
import { Plus, Pencil, X } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Category {
  id: string;
  label: string;
  url?: string;
}

interface CategoryButtonsProps {
  categories?: Category[];
  isEditing?: boolean;
  onUpdate?: (categories: Category[]) => void;
}

const defaultCategories: Category[] = [];

export function CategoryButtons({
  categories = defaultCategories,
  isEditing = false,
  onUpdate,
}: CategoryButtonsProps) {
  const [currentCategories, setCurrentCategories] = useState<Category[]>(categories);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ label: "", url: "" });

  const handleAddCategory = () => {
    setEditingCategory(null);
    setFormData({ label: "", url: "#" });
    setIsDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({ label: category.label, url: category.url || "#" });
    setIsDialogOpen(true);
  };

  const handleSaveCategory = () => {
    if (editingCategory) {
      const updatedCategories = currentCategories.map((c) =>
        c.id === editingCategory.id ? { ...c, ...formData } : c
      );
      setCurrentCategories(updatedCategories);
      onUpdate?.(updatedCategories);
    } else {
      const newCategory: Category = {
        id: Date.now().toString(),
        ...formData,
      };
      const updatedCategories = [...currentCategories, newCategory];
      setCurrentCategories(updatedCategories);
      onUpdate?.(updatedCategories);
    }
    setIsDialogOpen(false);
  };

  const handleDeleteCategory = (id: string) => {
    const updatedCategories = currentCategories.filter((c) => c.id !== id);
    setCurrentCategories(updatedCategories);
    onUpdate?.(updatedCategories);
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {currentCategories.map((category) => (
          <div key={category.id} className="relative group">
            <Button
              variant="outline"
              className="h-14 w-full rounded-2xl font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:border-accent"
              onClick={() => {
                if (!isEditing && category.url) {
                  window.location.href = category.url;
                }
              }}
            >
              {category.label}
            </Button>
            {isEditing && (
              <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  onClick={() => handleEditCategory(category)}
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0 rounded-full"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  onClick={() => handleDeleteCategory(category.id)}
                  size="sm"
                  variant="destructive"
                  className="h-6 w-6 p-0 rounded-full"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
        {isEditing && (
          <Button
            onClick={handleAddCategory}
            variant="outline"
            className="h-14 rounded-2xl border-dashed border-2 hover:border-primary transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      {!isEditing && currentCategories.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No categories yet</p>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>Set the label and optional URL for this category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Category Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., General Xray"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL (optional)</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com or #"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
