import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Folder, File, ChevronRight, Home, Search, FileText, Image as ImageIcon, FileCode, Archive } from "lucide-react";

interface DocumentFile {
  name: string;
  id: string;
  metadata: Record<string, any>;
}

interface FolderItem {
  name: string;
  id: string;
}

interface DocumentBrowserProps {
  onSelect: (url: string, title: string) => void;
}

export function DocumentBrowser({ onSelect }: DocumentBrowserProps) {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentPath, setCurrentPath] = useState("shared/");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadDocuments();
  }, [currentPath]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data: storageFiles, error } = await supabase.storage
        .from("documents")
        .list(currentPath, {
          limit: 100,
          offset: 0,
          sortBy: { column: "name", order: "asc" },
        });

      if (error) throw error;

      if (storageFiles) {
        const folderItems: FolderItem[] = [];
        const fileItems: DocumentFile[] = [];

        storageFiles.forEach((item) => {
          if (item.id === null) {
            folderItems.push({
              name: item.name,
              id: `${currentPath}${item.name}/`,
            });
          } else {
            fileItems.push({
              name: item.name,
              id: item.id,
              metadata: item.metadata || {},
            });
          }
        });

        setFolders(folderItems);
        setFiles(fileItems);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folderPath: string) => {
    setCurrentPath(folderPath);
    setSearchQuery("");
  };

  const handleFileSelect = async (file: DocumentFile) => {
    const filePath = `${currentPath}${file.name}`;
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(filePath, 3600 * 24 * 365); // 1 year expiry

    if (data?.signedUrl) {
      onSelect(`/documents?file=${encodeURIComponent(filePath)}`, file.name);
    }
  };

  const navigateUp = () => {
    if (currentPath === "shared/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length > 0 ? parts.join("/") + "/" : "shared/");
    setSearchQuery("");
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return ImageIcon;
    if (["pdf", "doc", "docx", "txt"].includes(ext || "")) return FileText;
    if (["js", "ts", "tsx", "jsx", "html", "css"].includes(ext || "")) return FileCode;
    if (["zip", "rar", "7z"].includes(ext || "")) return Archive;
    return File;
  };

  const pathParts = currentPath.split("/").filter(Boolean);
  
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setCurrentPath("shared/");
            setSearchQuery("");
          }}
          className="h-8 px-2"
        >
          <Home className="h-4 w-4" />
        </Button>
        {pathParts.map((part, index) => (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newPath = pathParts.slice(0, index + 1).join("/") + "/";
                setCurrentPath(newPath);
                setSearchQuery("");
              }}
              className="h-8 px-2"
            >
              {part}
            </Button>
          </div>
        ))}
      </div>

      {/* File List */}
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <>
              {currentPath !== "shared/" && (
                <Button
                  variant="ghost"
                  onClick={navigateUp}
                  className="w-full justify-start"
                >
                  <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                  <span>Back</span>
                </Button>
              )}
              
              {filteredFolders.map((folder) => {
                const FolderIcon = Folder;
                return (
                  <Button
                    key={folder.id}
                    variant="ghost"
                    onClick={() => handleFolderClick(folder.id)}
                    className="w-full justify-start"
                  >
                    <FolderIcon className="h-4 w-4 mr-2 text-primary" />
                    <span className="truncate">{folder.name}</span>
                  </Button>
                );
              })}

              {filteredFiles.map((file) => {
                const FileIcon = getFileIcon(file.name);
                return (
                  <Button
                    key={file.id}
                    variant="ghost"
                    onClick={() => handleFileSelect(file)}
                    className="w-full justify-start"
                  >
                    <FileIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{file.name}</span>
                  </Button>
                );
              })}

              {filteredFiles.length === 0 && filteredFolders.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No documents found" : "No documents in this folder"}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
