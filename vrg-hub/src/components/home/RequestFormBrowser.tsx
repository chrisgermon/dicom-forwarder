import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, FileText } from "lucide-react";

interface RequestCategory {
  id: string;
  name: string;
}

interface RequestFormBrowserProps {
  onSelect: (url: string, title: string) => void;
}

export function RequestFormBrowser({ onSelect }: RequestFormBrowserProps) {
  const [categories, setCategories] = useState<RequestCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("request_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading request categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: RequestCategory) => {
    onSelect(`/requests/new?category=${category.id}`, category.name);
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search request forms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Categories List */}
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <Button
                key={category.id}
                variant="ghost"
                onClick={() => handleCategorySelect(category)}
                className="w-full justify-start"
              >
                <FileText className="h-4 w-4 mr-2 text-primary" />
                <span className="truncate">{category.name}</span>
              </Button>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No request forms found" : "No request forms available"}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="text-xs text-muted-foreground">
        Select a request form to create a quick link to it
      </div>
    </div>
  );
}
