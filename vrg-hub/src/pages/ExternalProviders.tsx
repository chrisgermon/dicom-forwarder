import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, Settings, ExternalLink, Pencil, Info } from "lucide-react";
import { toast } from "sonner";
import { ExternalProvidersEditor } from "@/components/directory/ExternalProvidersEditor";
import { InlineProviderEditor } from "@/components/directory/InlineProviderEditor";
import { QuickAddProviderPanel } from "@/components/directory/QuickAddProviderPanel";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

interface Brand {
  id: string;
  name: string;
  display_name: string;
}

interface ExternalProvider {
  id: string;
  name: string;
  category: string;
  url?: string;
  description?: string;
  brand_id: string;
  sort_order?: number;
}

export default function ExternalProviders() {
  const { userRole } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [providers, setProviders] = useState<ExternalProvider[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const isAdmin = userRole === "tenant_admin" || userRole === "super_admin";

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchProviders();
    }
  }, [selectedBrand]);

  const fetchBrands = async () => {
    setIsLoadingBrands(true);
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (error) {
      toast.error("Failed to load brands");
      console.error(error);
    } else if (data) {
      setBrands(data);
      if (data.length > 0) {
        setSelectedBrand(data[0].name);
        setSelectedBrandId(data[0].id);
      }
    }
    setIsLoadingBrands(false);
  };

  const fetchProviders = async () => {
    setIsLoadingData(true);
    const brand = brands.find((b) => b.name === selectedBrand);
    if (!brand) {
      setIsLoadingData(false);
      return;
    }
    
    setSelectedBrandId(brand.id);

    const { data, error } = await supabase
      .from("external_providers")
      .select("*")
      .eq("brand_id", brand.id)
      .eq("is_active", true)
      .order("category")
      .order("sort_order");

    if (error) {
      toast.error("Failed to load providers");
      console.error(error);
    } else if (data) {
      setProviders(data);
      const uniqueCategories = [...new Set(data.map(p => p.category))];
      setCategories(uniqueCategories);
    }
    setIsLoadingData(false);
  };

  const filteredProviders = providers.filter(
    (provider) =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedProviders = filteredProviders.reduce((acc, provider) => {
    if (!acc[provider.category]) {
      acc[provider.category] = [];
    }
    acc[provider.category].push(provider);
    return acc;
  }, {} as Record<string, ExternalProvider[]>);

  if (isLoadingBrands) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title="External Providers"
        description="Quick access to external healthcare providers and partners"
        actions={
          isAdmin ? (
            <div className="flex gap-2">
              <Button
                variant={isEditMode ? "default" : "outline"}
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <Pencil className="w-4 h-4 mr-2" />
                {isEditMode ? "Done Editing" : "Edit Mode"}
              </Button>
              <Button onClick={() => setEditorOpen(true)} variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Manage Categories
              </Button>
            </div>
          ) : undefined
        }
      />

      {isEditMode && isAdmin && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <Info className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">
            Edit Mode: Click any provider card to edit • Use Quick Add below to add new providers
          </span>
        </div>
      )}

      {brands.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {brands.map((brand) => (
            <Button
              key={brand.id}
              variant={selectedBrand === brand.name ? "default" : "outline"}
              onClick={() => setSelectedBrand(brand.name)}
            >
              {brand.display_name}
            </Button>
          ))}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search providers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isEditMode && isAdmin && selectedBrandId && (
        <QuickAddProviderPanel
          brandId={selectedBrandId}
          categories={categories}
          onProviderAdded={fetchProviders}
        />
      )}

      {isLoadingData ? (
        <div className="text-center py-12">Loading providers...</div>
      ) : filteredProviders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery
                ? "No providers found matching your search"
                : "No external providers available"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedProviders).map(([category, categoryProviders]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-2xl font-semibold">{category}</h2>
                <Badge variant="secondary" className="text-xs">
                  {categoryProviders.length}
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryProviders.map((provider) => (
                  editingProviderId === provider.id ? (
                    <InlineProviderEditor
                      key={provider.id}
                      provider={provider}
                      categories={categories}
                      onSave={() => {
                        setEditingProviderId(null);
                        fetchProviders();
                      }}
                      onCancel={() => setEditingProviderId(null)}
                    />
                  ) : (
                    <Card 
                      key={provider.id} 
                      className={`hover:shadow-lg transition-all ${
                        isEditMode && isAdmin 
                          ? "cursor-pointer hover:border-primary/50 hover:ring-2 hover:ring-primary/20" 
                          : ""
                      }`}
                      onClick={() => {
                        if (isEditMode && isAdmin) {
                          setEditingProviderId(provider.id);
                        }
                      }}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg flex items-start justify-between">
                          <span>{provider.name}</span>
                          <div className="flex items-center gap-1">
                            {isEditMode && isAdmin && (
                              <Pencil className="w-3 h-3 text-muted-foreground" />
                            )}
                            {provider.url && (
                              <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        </CardTitle>
                        {provider.description && (
                          <CardDescription>{provider.description}</CardDescription>
                        )}
                      </CardHeader>
                      {provider.url && (
                        <CardContent>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(provider.url, "_blank");
                            }}
                          >
                            Visit Website
                          </Button>
                        </CardContent>
                      )}
                    </Card>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <ExternalProvidersEditor onClose={() => {
            setEditorOpen(false);
            fetchProviders();
          }} />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
