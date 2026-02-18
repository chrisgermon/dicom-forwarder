import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Folder, Download, ChevronRight, FolderOpen, ExternalLink, AlertCircle, Star, Search } from "lucide-react";
import { FileBrowserContent } from "./types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatBytes } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConnectOffice365Button } from "@/components/documentation/ConnectOffice365Button";
import { Input } from "@/components/ui/input";

interface SharePointFolder {
  id: string;
  name: string;
  webUrl: string;
  childCount: number;
  lastModifiedDateTime: string;
}

interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
  createdBy?: string;
  lastModifiedBy?: string;
  fileType: string;
  downloadUrl?: string;
}

interface FileBrowserModuleProps {
  content: FileBrowserContent;
  editing: boolean;
  onChange: (content: FileBrowserContent) => void;
}

const STARRED_FILES_KEY = "file_browser_starred";

export function FileBrowserModule({ content, editing, onChange }: FileBrowserModuleProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [folders, setFolders] = useState<SharePointFolder[]>([]);
  const [files, setFiles] = useState<SharePointFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [pathStack, setPathStack] = useState<{ path: string; name: string }[]>([]);
  const [needsO365, setNeedsO365] = useState(false);
  const [, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load starred files from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STARRED_FILES_KEY);
    if (stored) {
      try {
        setStarredIds(JSON.parse(stored));
      } catch {
        setStarredIds([]);
      }
    }
  }, []);

  // Load files for the selected folder (display mode)
  useEffect(() => {
    if (content.folder_id) {
      loadSharePointFiles(content.folder_id);
    }
  }, [content.folder_id]);

  const toggleStar = (fileId: string) => {
    const updated = starredIds.includes(fileId)
      ? starredIds.filter((id) => id !== fileId)
      : [...starredIds, fileId];
    setStarredIds(updated);
    localStorage.setItem(STARRED_FILES_KEY, JSON.stringify(updated));
  };

  // Filter and limit files: starred first, then most recent, max 5 unless searching
  const displayFiles = useMemo(() => {
    let filtered = files;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = files.filter((f) => f.name.toLowerCase().includes(query));
      return filtered; // Return all search results, no limit
    }

    // No search: show starred first, then recent, limit to 5
    const starred = filtered.filter((f) => starredIds.includes(f.id));
    const unstarred = filtered.filter((f) => !starredIds.includes(f.id));
    
    // Sort unstarred by last modified (most recent first)
    unstarred.sort((a, b) => 
      new Date(b.lastModifiedDateTime).getTime() - new Date(a.lastModifiedDateTime).getTime()
    );

    const combined = [...starred, ...unstarred];
    return combined.slice(0, 5);
  }, [files, starredIds, searchQuery]);

  const loadSharePointFiles = async (folderPath: string) => {
    setLoadingFiles(true);
    setError(null);
    setNeedsO365(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please log in to view SharePoint files");
        setFiles([]);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("sharepoint-browse-folders", {
        body: { folder_path: folderPath },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (fnError) throw fnError;

      if (data.needsO365) {
        setNeedsO365(true);
        setError(data.error);
        setFiles([]);
        return;
      }

      if (data.error) {
        setError(data.error);
        setFiles([]);
        return;
      }

      setConfigured(data.configured !== false);
      setFiles(data.files || []);
    } catch (err: any) {
      console.error("Error loading SharePoint files:", err);
      setError(err.message || "Failed to load files");
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Load folders for browsing (picker mode)
  const loadSharePointFolders = async (folderPath: string = "/") => {
    setLoading(true);
    setError(null);
    setNeedsO365(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please log in to browse SharePoint");
        setFolders([]);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("sharepoint-browse-folders", {
        body: { folder_path: folderPath },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (fnError) throw fnError;

      if (data.needsO365) {
        setNeedsO365(true);
        setError(data.error);
        setFolders([]);
        return;
      }

      if (data.error) {
        setError(data.error);
        setFolders([]);
        return;
      }

      setConfigured(data.configured !== false);
      setFolders(data.folders || []);
      setCurrentPath(data.currentPath || folderPath);
    } catch (err: any) {
      console.error("Error loading SharePoint folders:", err);
      setError(err.message || "Failed to load folders");
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setCurrentPath("/");
    setPathStack([]);
    loadSharePointFolders("/");
  };

  const navigateToFolder = async (folder: SharePointFolder) => {
    const newPath = currentPath === "/" ? `/${folder.name}` : `${currentPath}/${folder.name}`;
    setPathStack([...pathStack, { path: currentPath, name: currentPath === "/" ? "Root" : currentPath.split("/").pop() || "Root" }]);
    setCurrentPath(newPath);
    loadSharePointFolders(newPath);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentPath("/");
      setPathStack([]);
      loadSharePointFolders("/");
    } else {
      const target = pathStack[index];
      setCurrentPath(target.path);
      setPathStack(pathStack.slice(0, index));
      loadSharePointFolders(target.path);
    }
  };

  const selectCurrentFolder = () => {
    const folderName = currentPath === "/" ? "Root" : currentPath.split("/").pop() || "SharePoint";
    onChange({ folder_id: currentPath, folder_name: folderName });
    setDialogOpen(false);
  };

  const handleFileClick = (file: SharePointFile) => {
    window.open(file.webUrl, "_blank");
  };

  const handleDownload = (file: SharePointFile) => {
    if (file.downloadUrl) {
      window.open(file.downloadUrl, "_blank");
      toast.success(`Downloading ${file.name}`);
    } else {
      window.open(file.webUrl, "_blank");
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(type)) return "🖼️";
    if (["mp4", "mov", "avi", "wmv"].includes(type)) return "🎥";
    if (type === "pdf") return "📄";
    if (["doc", "docx"].includes(type)) return "📝";
    if (["xls", "xlsx"].includes(type)) return "📊";
    if (["ppt", "pptx"].includes(type)) return "📽️";
    if (["zip", "rar", "7z"].includes(type)) return "📦";
    return "📄";
  };

  // Show O365 connection prompt
  if (needsO365) {
    return (
      <div className="space-y-3">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Connect your Office 365 account to access SharePoint files."}
          </AlertDescription>
        </Alert>
        <ConnectOffice365Button />
      </div>
    );
  }

  // View mode: show files from selected SharePoint folder
  if (!editing) {
    if (!content.folder_id) {
      return <p className="text-muted-foreground text-sm italic">No SharePoint folder selected.</p>;
    }

    if (loadingFiles) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (files.length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground">
          <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">This folder is empty</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Files list */}
        <div className="space-y-2">
          {displayFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No files match your search</p>
          ) : (
            displayFiles.map((file) => (
              <div
                key={file.id}
                className="group flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                onClick={() => handleFileClick(file)}
              >
                <div className="text-2xl">{getFileIcon(file.fileType)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate flex items-center gap-1.5">
                    {file.name}
                    {starredIds.includes(file.id) && (
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)} •{" "}
                    {formatDistanceToNow(new Date(file.lastModifiedDateTime), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(file.id);
                    }}
                    title={starredIds.includes(file.id) ? "Unstar" : "Star"}
                  >
                    <Star className={`h-4 w-4 ${starredIds.includes(file.id) ? "fill-yellow-400 text-yellow-400" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(file.webUrl, "_blank");
                    }}
                    title="Open in SharePoint"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Show count info */}
        {!searchQuery && files.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            Showing {displayFiles.length} of {files.length} files (starred + recent)
          </p>
        )}
      </div>
    );
  }

  // Edit mode: show SharePoint folder picker
  return (
    <div className="space-y-3">
      {content.folder_id ? (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Folder className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-medium text-sm">{content.folder_name || "SharePoint Folder"}</p>
            <p className="text-xs text-muted-foreground">Path: {content.folder_id}</p>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm italic">No SharePoint folder selected yet.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" onClick={handleOpenDialog}>
            <Folder className="h-4 w-4 mr-2" />
            {content.folder_id ? "Change Folder" : "Select SharePoint Folder"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select a SharePoint Folder</DialogTitle>
          </DialogHeader>

          {needsO365 ? (
            <div className="space-y-3 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error || "Connect your Office 365 account to browse SharePoint."}
                </AlertDescription>
              </Alert>
              <ConnectOffice365Button />
            </div>
          ) : (
            <>
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 text-sm flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => navigateToBreadcrumb(-1)}
                >
                  Root
                </Button>
                {pathStack.map((bc, idx) => (
                  <div key={idx} className="flex items-center">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => navigateToBreadcrumb(idx)}
                    >
                      {bc.name}
                    </Button>
                  </div>
                ))}
                {currentPath !== "/" && (
                  <div className="flex items-center">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="px-2 text-sm font-medium">
                      {currentPath.split("/").pop()}
                    </span>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Folder list */}
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : folders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No subfolders here
                  </div>
                ) : (
                  <div className="divide-y">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigateToFolder(folder)}
                      >
                        <Folder className="h-5 w-5 text-primary" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{folder.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {folder.childCount} items
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={selectCurrentFolder} className="w-full">
                Select This Folder
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
