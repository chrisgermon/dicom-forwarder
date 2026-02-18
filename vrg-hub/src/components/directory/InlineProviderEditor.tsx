import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ExternalProvider {
  id: string;
  name: string;
  category: string;
  url?: string;
  description?: string;
  brand_id: string;
  sort_order?: number;
}

interface InlineProviderEditorProps {
  provider: ExternalProvider;
  categories: string[];
  onSave: () => void;
  onCancel: () => void;
}

export function InlineProviderEditor({ provider, categories, onSave, onCancel }: InlineProviderEditorProps) {
  const [formData, setFormData] = useState({
    name: provider.name,
    category: provider.category,
    url: provider.url || "",
    description: provider.description || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [formData]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Provider name is required");
      return;
    }

    const categoryToUse = customCategory.trim() || formData.category;
    if (!categoryToUse) {
      toast.error("Category is required");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("external_providers")
      .update({
        name: formData.name.trim(),
        category: categoryToUse,
        url: formData.url.trim() || null,
        description: formData.description.trim() || null,
      })
      .eq("id", provider.id);

    if (error) {
      toast.error("Failed to save provider");
      console.error(error);
    } else {
      toast.success("Provider updated");
      onSave();
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("external_providers")
      .delete()
      .eq("id", provider.id);

    if (error) {
      toast.error("Failed to delete provider");
      console.error(error);
    } else {
      toast.success("Provider deleted");
      onSave();
    }
  };

  return (
    <>
      <div className="p-4 space-y-3 bg-muted/50 rounded-lg border-2 border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Editing Provider</span>
          <span className="text-xs text-muted-foreground">⌘+Enter to save • Esc to cancel</span>
        </div>
        
        <div className="grid gap-3">
          <Input
            ref={nameInputRef}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Provider name *"
            className="font-medium"
          />
          
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={formData.category}
              onValueChange={(value) => {
                setFormData({ ...formData, category: value });
                setCustomCategory("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Or new category"
            />
          </div>
          
          <div className="relative">
            <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="Website URL"
              className="pl-10"
              type="url"
            />
          </div>
          
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description (optional)"
            rows={2}
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Check className="w-4 h-4 mr-1" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{provider.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
