import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, FileText } from "lucide-react";

interface CustomPage {
  id: string;
  title: string;
  slug: string;
}

interface CustomPageBrowserProps {
  onSelect: (url: string, title: string) => void;
}

export function CustomPageBrowser({ onSelect }: CustomPageBrowserProps) {
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("custom_pages")
        .select("id, title, slug")
        .eq("is_published", true)
        .order("title", { ascending: true });

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error("Error loading custom pages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageSelect = (page: CustomPage) => {
    onSelect(`/pages/${page.slug}`, page.title);
  };

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Pages List */}
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredPages.length > 0 ? (
            filteredPages.map((page) => (
              <Button
                key={page.id}
                variant="ghost"
                onClick={() => handlePageSelect(page)}
                className="w-full justify-start"
              >
                <FileText className="h-4 w-4 mr-2 text-primary" />
                <span className="truncate">{page.title}</span>
              </Button>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No pages found" : "No published pages available"}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="text-xs text-muted-foreground">
        Select a custom page to create a quick link to it
      </div>
    </div>
  );
}
