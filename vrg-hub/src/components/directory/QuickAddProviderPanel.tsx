import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface QuickAddProviderPanelProps {
  brandId: string;
  categories: string[];
  onProviderAdded: () => void;
}

export function QuickAddProviderPanel({ brandId, categories, onProviderAdded }: QuickAddProviderPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    url: "",
    description: "",
  });
  const [customCategory, setCustomCategory] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({ name: "", category: "", url: "", description: "" });
    setCustomCategory("");
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error("Provider name is required");
      return;
    }

    const categoryToUse = customCategory.trim() || formData.category;
    if (!categoryToUse) {
      toast.error("Category is required");
      return;
    }

    setIsAdding(true);
    
    // Get the max sort order
    const { data: existingProviders } = await supabase
      .from("external_providers")
      .select("sort_order")
      .eq("brand_id", brandId)
      .eq("category", categoryToUse)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSortOrder = existingProviders && existingProviders.length > 0 
      ? (existingProviders[0].sort_order || 0) + 1 
      : 0;

    const { error } = await supabase.from("external_providers").insert([{
      brand_id: brandId,
      name: formData.name.trim(),
      category: categoryToUse,
      url: formData.url.trim() || null,
      description: formData.description.trim() || null,
      sort_order: nextSortOrder,
      is_active: true,
    }]);

    if (error) {
      toast.error("Failed to add provider");
      console.error(error);
    } else {
      toast.success("Provider added");
      resetForm();
      onProviderAdded();
      nameInputRef.current?.focus();
    }
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleAdd();
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Quick Add Provider
              </span>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3" onKeyDown={handleKeyDown}>
            <Input
              ref={nameInputRef}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Provider name *"
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
                  <SelectValue placeholder="Category *" />
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
                placeholder="Website URL (optional)"
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

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-muted-foreground">⌘+Enter to add</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetForm();
                    setIsOpen(false);
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAdd} disabled={isAdding}>
                  <Plus className="w-4 h-4 mr-1" />
                  {isAdding ? "Adding..." : "Add Provider"}
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
