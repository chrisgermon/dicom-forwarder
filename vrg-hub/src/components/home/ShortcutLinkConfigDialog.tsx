import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Folder, ChevronRight, Home } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShortcutLinkConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcutType: "modality" | "department";
  shortcutKey: string;
  shortcutName: string;
  onSaved: () => void;
}

interface BrowseFolder {
  id: string;
  name: string;
  path: string;
  childCount: number;
}

export function ShortcutLinkConfigDialog({
  open,
  onOpenChange,
  shortcutType,
  shortcutKey,
  shortcutName,
  onSaved,
}: ShortcutLinkConfigDialogProps) {
  const [linkType, setLinkType] = useState<"url" | "sharepoint" | "internal">("url");
  const [urlValue, setUrlValue] = useState("");
  const [internalRoute, setInternalRoute] = useState("");
  const [sharepointPath, setSharepointPath] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // SharePoint folder browser state
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [folders, setFolders] = useState<BrowseFolder[]>([]);
  const [currentPath, setCurrentPath] = useState("/");
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  // Load existing config
  useEffect(() => {
    if (open) {
      loadExisting();
    }
  }, [open, shortcutType, shortcutKey]);

  const loadExisting = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("home_shortcut_links")
        .select("*")
        .eq("shortcut_type", shortcutType)
        .eq("shortcut_key", shortcutKey)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLinkType(data.link_type as "url" | "sharepoint" | "internal");
        setUrlValue(data.link_url || "");
        setSharepointPath(data.sharepoint_path || "");
        setInternalRoute(data.internal_route || "");
      } else {
        // Reset to defaults
        setLinkType("url");
        setUrlValue("");
        setSharepointPath("");
        setInternalRoute("");
      }
    } catch (error) {
      console.error("Error loading shortcut config:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async (path: string) => {
    setFolderLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to browse SharePoint");
        return;
      }

      const { data, error } = await supabase.functions.invoke("sharepoint-browse-folders-cached", {
        body: { folder_path: path },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        toast.error("Failed to load SharePoint folders");
        return;
      }

      const folderItems = (data?.folders || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        path: path === "/" ? `/${f.name}` : `${path}/${f.name}`,
        childCount: f.childCount || 0,
      }));

      setFolders(folderItems);
    } catch (error) {
      console.error("Load folders error:", error);
      toast.error("Failed to load folders");
    } finally {
      setFolderLoading(false);
    }
  };

  const navigateToFolder = (folder: BrowseFolder) => {
    setPathHistory([...pathHistory, currentPath]);
    setCurrentPath(folder.path);
    loadFolders(folder.path);
  };

  const navigateToRoot = () => {
    setCurrentPath("/");
    setPathHistory([]);
    loadFolders("/");
  };

  const selectCurrentPath = () => {
    setSharepointPath(currentPath);
    setShowFolderBrowser(false);
  };

  const openFolderBrowser = () => {
    setShowFolderBrowser(true);
    setCurrentPath("/");
    setPathHistory([]);
    loadFolders("/");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Check if record exists
      const { data: existing } = await supabase
        .from("home_shortcut_links")
        .select("id")
        .eq("shortcut_type", shortcutType)
        .eq("shortcut_key", shortcutKey)
        .maybeSingle();

      const linkData = {
        shortcut_type: shortcutType,
        shortcut_key: shortcutKey,
        link_type: linkType,
        link_url: linkType === "url" ? urlValue : null,
        sharepoint_path: linkType === "sharepoint" ? sharepointPath : null,
        internal_route: linkType === "internal" ? internalRoute : null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from("home_shortcut_links")
          .update(linkData)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("home_shortcut_links")
          .insert({ ...linkData, created_by: user.id });
        if (error) throw error;
      }

      toast.success("Link configured successfully");
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving shortcut link:", error);
      toast.error(error.message || "Failed to save link");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLink = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("home_shortcut_links")
        .delete()
        .eq("shortcut_type", shortcutType)
        .eq("shortcut_key", shortcutKey);

      if (error) throw error;

      toast.success("Link removed");
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error removing link:", error);
      toast.error("Failed to remove link");
    } finally {
      setSaving(false);
    }
  };

  const getBreadcrumbs = () => {
    if (currentPath === "/") return [];
    return currentPath.split("/").filter(Boolean);
  };

  if (showFolderBrowser) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select SharePoint Folder</DialogTitle>
            <DialogDescription>
              Navigate to and select the folder to link
            </DialogDescription>
          </DialogHeader>

          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-1 text-sm py-2 border-b overflow-x-auto">
            <Button variant="ghost" size="sm" onClick={navigateToRoot} className="h-7 px-2">
              <Home className="h-4 w-4" />
            </Button>
            {getBreadcrumbs().map((crumb, index) => (
              <div key={index} className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="px-1 text-muted-foreground">{crumb}</span>
              </div>
            ))}
          </div>

          <ScrollArea className="h-[300px] border rounded-lg p-2">
            {folderLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : folders.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No subfolders found
              </div>
            ) : (
              <div className="space-y-1">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => navigateToFolder(folder)}
                    className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left transition-colors"
                  >
                    <Folder className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium flex-1 truncate">{folder.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 p-2 rounded">
            <span>Selected: {currentPath}</span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderBrowser(false)}>
              Cancel
            </Button>
            <Button onClick={selectCurrentPath}>
              Select This Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Link for {shortcutName}</DialogTitle>
          <DialogDescription>
            Set where this shortcut should navigate to when clicked
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <Label>Link Type</Label>
              <RadioGroup value={linkType} onValueChange={(v) => setLinkType(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="url" id="url" />
                  <Label htmlFor="url" className="font-normal cursor-pointer">External URL</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sharepoint" id="sharepoint" />
                  <Label htmlFor="sharepoint" className="font-normal cursor-pointer">SharePoint Folder</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="internal" id="internal" />
                  <Label htmlFor="internal" className="font-normal cursor-pointer">Internal Page</Label>
                </div>
              </RadioGroup>
            </div>

            {linkType === "url" && (
              <div className="space-y-2">
                <Label htmlFor="urlInput">URL</Label>
                <Input
                  id="urlInput"
                  placeholder="https://example.com"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                />
              </div>
            )}

            {linkType === "sharepoint" && (
              <div className="space-y-2">
                <Label>SharePoint Folder</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="/path/to/folder"
                    value={sharepointPath}
                    onChange={(e) => setSharepointPath(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={openFolderBrowser}>
                    <Folder className="h-4 w-4 mr-1" />
                    Browse
                  </Button>
                </div>
              </div>
            )}

            {linkType === "internal" && (
              <div className="space-y-2">
                <Label htmlFor="routeInput">Internal Route</Label>
                <Input
                  id="routeInput"
                  placeholder="/documentation"
                  value={internalRoute}
                  onChange={(e) => setInternalRoute(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="destructive" onClick={handleRemoveLink} disabled={saving}>
            Remove Link
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}