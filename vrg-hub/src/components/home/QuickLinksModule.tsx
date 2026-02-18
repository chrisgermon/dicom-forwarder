import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Plus, Pencil, Trash2, Link as LinkIcon, FolderOpen, FileText, File } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentBrowser } from "./DocumentBrowser";
import { RequestFormBrowser } from "./RequestFormBrowser";
import { CustomPageBrowser } from "./CustomPageBrowser";

interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

interface QuickLinksModuleProps {
  title?: string;
  links?: QuickLink[];
  isEditing?: boolean;
  onUpdate?: (links: QuickLink[]) => void;
}

export function QuickLinksModule({ 
  title = "Quick Links", 
  links = [], 
  isEditing = false,
  onUpdate 
}: QuickLinksModuleProps) {
  const [currentLinks, setCurrentLinks] = useState<QuickLink[]>(links);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
  const [formData, setFormData] = useState({ title: "", url: "", icon: "" });
  const [linkType, setLinkType] = useState<"manual" | "document" | "request" | "page">("manual");

  // Sync local state with props when they change
  useEffect(() => {
    setCurrentLinks(links);
  }, [links]);

  const handleAddLink = () => {
    setEditingLink(null);
    setFormData({ title: "", url: "", icon: "" });
    setLinkType("manual");
    setIsDialogOpen(true);
  };

  const handleEditLink = (link: QuickLink) => {
    setEditingLink(link);
    setFormData({ title: link.title, url: link.url, icon: link.icon || "" });
    setLinkType("manual");
    setIsDialogOpen(true);
  };

  const handleSaveLink = () => {
    if (editingLink) {
      const updatedLinks = currentLinks.map(l => 
        l.id === editingLink.id ? { ...l, ...formData } : l
      );
      setCurrentLinks(updatedLinks);
      onUpdate?.(updatedLinks);
    } else {
      const newLink: QuickLink = {
        id: Date.now().toString(),
        ...formData
      };
      const updatedLinks = [...currentLinks, newLink];
      setCurrentLinks(updatedLinks);
      onUpdate?.(updatedLinks);
    }
    setIsDialogOpen(false);
  };

  const handleDeleteLink = (id: string) => {
    const updatedLinks = currentLinks.filter(l => l.id !== id);
    setCurrentLinks(updatedLinks);
    onUpdate?.(updatedLinks);
  };

  const handleDocumentSelect = (url: string, title: string) => {
    setFormData({ ...formData, title, url });
    setLinkType("manual");
  };

  return (
    <>
      <Card className="rounded-2xl shadow-lg border-2 border-border/50 hover:border-primary/30 transition-all duration-300 h-full bg-gradient-to-br from-background to-background/95">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-border/50">
          <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <LinkIcon className="h-5 w-5 text-primary" />
            </div>
            {title}
          </CardTitle>
          {isEditing && (
            <Button onClick={handleAddLink} size="sm" className="shadow-md hover:shadow-lg transition-all">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {currentLinks.map((link) => (
              <div 
                key={link.id} 
                className="relative flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-accent/30 to-accent/10 border-2 border-border/40 hover:border-primary/50 hover:shadow-md transition-all duration-200 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 flex-1 relative z-10"
                >
                  {link.icon && (
                    <div className="h-10 w-10 rounded-lg bg-background/80 flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform duration-200">
                      {link.icon}
                    </div>
                  )}
                  <span className="text-sm font-semibold group-hover:text-primary transition-colors">{link.title}</span>
                  <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
                </a>
                {isEditing && (
                  <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                    <Button
                      onClick={() => handleEditLink(link)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-background/80"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteLink(link.id)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {currentLinks.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex h-16 w-16 rounded-full bg-accent/30 items-center justify-center mb-4">
                  <LinkIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No links added yet
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLink ? "Edit Link" : "Add Link"}</DialogTitle>
            <DialogDescription>Link to external websites, internal documents, request forms, or custom pages</DialogDescription>
          </DialogHeader>
          
          <Tabs value={linkType} onValueChange={(v) => setLinkType(v as "manual" | "document" | "request" | "page")}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                URL
              </TabsTrigger>
              <TabsTrigger value="document" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="request" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Forms
              </TabsTrigger>
              <TabsTrigger value="page" className="flex items-center gap-2">
                <File className="h-4 w-4" />
                Pages
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Equipment Support"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com or /documents"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon (emoji)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="📞"
                />
              </div>
            </TabsContent>

            <TabsContent value="document" className="py-4">
              <DocumentBrowser onSelect={handleDocumentSelect} />
            </TabsContent>

            <TabsContent value="request" className="py-4">
              <RequestFormBrowser onSelect={handleDocumentSelect} />
            </TabsContent>

            <TabsContent value="page" className="py-4">
              <CustomPageBrowser onSelect={handleDocumentSelect} />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLink} disabled={!formData.title || !formData.url}>
              {editingLink ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
