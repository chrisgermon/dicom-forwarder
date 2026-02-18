import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MenuItem {
  title: string;
  url: string;
  icon?: any;
}

interface SidebarSearchProps {
  menuItems: MenuItem[];
  onItemClick: (url: string) => void;
  collapsed: boolean;
}

export function SidebarSearch({ menuItems, onItemClick, collapsed }: SidebarSearchProps) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!query) return [];
    
    const lowerQuery = query.toLowerCase();
    return menuItems.filter(item =>
      item.title.toLowerCase().includes(lowerQuery)
    );
  }, [query, menuItems]);

  if (collapsed) return null;

  return (
    <div className="px-3 py-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search menu..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-9 bg-background"
        />
      </div>
      
      {/* Search results dropdown */}
      {query && filteredItems.length > 0 && (
        <div className="mt-2 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                onItemClick(item.url);
                setQuery("");
              }}
              className="w-full text-left px-3 py-2 hover:bg-accent transition-colors text-sm flex items-center gap-2"
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              <span>{item.title}</span>
            </button>
          ))}
        </div>
      )}
      
      {query && filteredItems.length === 0 && (
        <div className="mt-2 px-3 py-2 text-xs text-muted-foreground">
          No menu items found
        </div>
      )}
    </div>
  );
}
