import { useState, useEffect, useCallback } from "react";
import { Search, Users, Loader2, Star, Clock, Save, Ticket, FileText, Newspaper, BookOpen, ShoppingCart, AlertTriangle, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompanyFeatures } from "@/hooks/useCompanyFeatures";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SearchResult {
  id: string;
  type: 'request' | 'news' | 'user' | 'ticket' | 'knowledge-base' | 'hardware' | 'incident' | 'marketing';
  title: string;
  description?: string;
  url: string;
  icon: any;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { isFeatureEnabled: _isFeatureEnabled } = useCompanyFeatures(); void _isFeatureEnabled;
  const queryClient = useQueryClient();

  // Fetch saved searches
  const { data: savedSearches } = useQuery({
    queryKey: ["saved-searches", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("saved_searches")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem("recentSearches");
      if (!stored) {
        setRecentSearches([]);
        return;
      }

      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.slice(0, 5));
      } else {
        setRecentSearches([]);
      }
    } catch (error) {
      console.error("Failed to load recent searches from localStorage", error);
      setRecentSearches([]);
    }
  }, []);

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("saved_searches").insert([{
        user_id: user?.id,
        name: savedSearchName,
        query: search,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      setSaveDialogOpen(false);
      setSavedSearchName("");
      toast.success("Search saved successfully");
    },
    onError: () => {
      toast.error("Failed to save search");
    },
  });

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Save to recent searches
  const addToRecentSearches = (query: string) => {
    if (!query.trim() || typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem("recentSearches");
      const recent = stored ? JSON.parse(stored) : [];
      const normalized = Array.isArray(recent) ? recent : [];
      const updated = [query, ...normalized.filter((q: string) => q !== query)].slice(0, 10);
      window.localStorage.setItem("recentSearches", JSON.stringify(updated));
      setRecentSearches(updated.slice(0, 5));
    } catch (error) {
      console.error("Failed to update recent searches", error);
    }
  };

  const performSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Run all searches in parallel
      const searchPromises = [];

      // Search tickets
      searchPromises.push(
        supabase
          .from('tickets')
          .select('id, title, description, status, request_number')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(5)
          .then(({ data }) => {
            if (data) {
              searchResults.push(...data.map((t) => {
                const formattedNumber = `vrg-${String(t.request_number).padStart(5, '0')}`;
                return {
                  id: t.id,
                  type: 'ticket' as const,
                  title: t.title,
                  description: `#${formattedNumber} - ${t.status}`,
                  url: `/request/${formattedNumber}`,
                  icon: Ticket
                };
              }));
            }
          })
      );

      // Search hardware requests
      searchPromises.push(
        supabase
          .from('hardware_requests')
          .select('id, title, status, request_number')
          .or(`title.ilike.%${query}%,business_justification.ilike.%${query}%`)
          .limit(5)
          .then(({ data }) => {
            if (data) {
              searchResults.push(...data.map((r) => ({
                id: r.id,
                type: 'hardware' as const,
                title: r.title,
                description: `#${r.request_number} - ${r.status}`,
                url: `/hardware-requests/${r.id}`,
                icon: ShoppingCart
              })));
            }
          })
      );

      // Search incidents
      searchPromises.push(
        supabase
          .from('incidents')
          .select('id, incident_description, incident_type, status')
          .or(`incident_description.ilike.%${query}%,incident_type.ilike.%${query}%`)
          .limit(5)
          .then(({ data }) => {
            if (data) {
              searchResults.push(...data.map((i) => ({
                id: i.id,
                type: 'incident' as const,
                title: i.incident_type,
                description: `${i.status} - ${i.incident_description?.substring(0, 50)}...`,
                url: `/incidents/${i.id}`,
                icon: AlertTriangle
              })));
            }
          })
      );

      // Search marketing requests
      searchPromises.push(
        supabase
          .from('marketing_requests')
          .select('id, title, request_type, status')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(5)
          .then(({ data }) => {
            if (data) {
              searchResults.push(...data.map((m) => ({
                id: m.id,
                type: 'marketing' as const,
                title: m.title,
                description: `${m.request_type} - ${m.status}`,
                url: `/marketing-requests/${m.id}`,
                icon: Megaphone
              })));
            }
          })
      );

      // Search news articles
      searchPromises.push(
        supabase
          .from('news_articles')
          .select('id, title, excerpt, slug')
          .eq('is_published', true)
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .limit(5)
          .then(({ data }) => {
            if (data) {
              searchResults.push(...data.map((n) => ({
                id: n.id,
                type: 'news' as const,
                title: n.title,
                description: n.excerpt || '',
                url: `/news/${n.slug || n.id}`,
                icon: Newspaper
              })));
            }
          })
      );

      // Search knowledge base pages
      searchPromises.push(
        supabase
          .from('kb_pages')
          .select('id, title, excerpt, slug')
          .eq('is_published', true)
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .limit(5)
          .then(({ data }) => {
            if (data) {
              searchResults.push(...data.map((p) => ({
                id: p.id,
                type: 'knowledge-base' as const,
                title: p.title,
                description: p.excerpt || '',
                url: `/knowledge-base/${p.slug || p.id}`,
                icon: BookOpen
              })));
            }
          })
      );

      // Search users/profiles (if has permission)
      if (hasPermission('view_dashboard')) {
        searchPromises.push(
          supabase
            .from('profiles')
            .select('id, full_name, email')
            .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(5)
            .then(({ data }) => {
              if (data) {
                searchResults.push(...data.map((u) => ({
                  id: u.id,
                  type: 'user' as const,
                  title: u.full_name || 'Unknown',
                  description: u.email || '',
                  url: `/directory`,
                  icon: Users
                })));
              }
            })
        );
      }

      // Search custom pages
      searchPromises.push(
        supabase
          .from('custom_pages')
          .select('id, title, slug')
          .eq('is_published', true)
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .limit(5)
          .then(({ data }) => {
            if (data) {
              searchResults.push(...data.map((p) => ({
                id: p.id,
                type: 'knowledge-base' as const,
                title: p.title,
                description: 'Custom Page',
                url: `/pages/${p.slug}`,
                icon: FileText
              })));
            }
          })
      );

      // Wait for all searches to complete
      await Promise.all(searchPromises);

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [hasPermission]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, performSearch]);

  useEffect(() => {
    if (open && search.length >= 2) {
      performSearch(search);
    }
  }, [open, search, performSearch]);

  const handleSelect = (url: string) => {
    addToRecentSearches(search);
    setOpen(false);
    navigate(url);
    setSearch("");
  };

  const handleSavedSearchClick = (query: string) => {
    setSearch(query);
    addToRecentSearches(query);
  };

  return (
    <>
      <div className="flex gap-2 w-full items-center">
        <Button
          variant="outline"
          className="relative h-9 flex-1 justify-start text-sm text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="ml-2 truncate">Search...</span>
          <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
        
        {search && (
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Save search">
                <Save className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Search</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Search Name</Label>
                  <Input
                    value={savedSearchName}
                    onChange={(e) => setSavedSearchName(e.target.value)}
                    placeholder="e.g., Pending Hardware Requests"
                  />
                </div>
                <Button
                  onClick={() => saveSearchMutation.mutate()}
                  disabled={!savedSearchName.trim()}
                  className="w-full"
                >
                  Save Search
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search tickets, requests, news, knowledge base, people..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          {!search && recentSearches.length > 0 && (
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((query: string, index: number) => (
                <CommandItem key={index} onSelect={() => setSearch(query)}>
                  <Clock className="mr-2 h-4 w-4" />
                  {query}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          
          {!search && savedSearches && savedSearches.length > 0 && (
            <CommandGroup heading="Saved Searches">
             {savedSearches.map((saved: any) => (
                <CommandItem key={saved.id} onSelect={() => handleSavedSearchClick(saved.query)}>
                  <Star className="mr-2 h-4 w-4" />
                  {saved.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandEmpty>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              "No results found."
            )}
          </CommandEmpty>
          
          {results.length > 0 && (
            <>
            {['ticket', 'hardware', 'incident', 'marketing', 'news', 'knowledge-base', 'user'].map(type => {
                const typeResults = results.filter(r => r.type === type);
                if (typeResults.length === 0) return null;
                
                const labels: Record<string, string> = {
                  ticket: 'IT Tickets',
                  hardware: 'Hardware Requests',
                  incident: 'Incidents',
                  marketing: 'Marketing Requests',
                  news: 'News',
                  'knowledge-base': 'Knowledge Base',
                  user: 'People'
                };
                
                return (
                  <CommandGroup key={type} heading={labels[type as keyof typeof labels]}>
                    {typeResults.map((result) => {
                      const Icon = result.icon;
                      return (
                        <CommandItem
                          key={result.id}
                          value={`${result.title} ${result.description || ''}`}
                          onSelect={() => handleSelect(result.url)}
                          className="flex items-start gap-3 py-3"
                        >
                          <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="flex-1 overflow-hidden">
                            <div className="font-medium truncate">{result.title}</div>
                            {result.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {result.description}
                              </div>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
