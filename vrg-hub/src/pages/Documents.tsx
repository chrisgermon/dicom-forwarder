import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/ui/page-container";
import { useToast } from "@/hooks/use-toast";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { DroppableFolderRow } from "@/components/documents/DroppableFolderRow";
import { DraggableFileRow } from "@/components/documents/DraggableFileRow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Download,
  Trash2,
  File,
  FileText,
  Image as ImageIcon,
  FileCode,
  Archive,
  Loader2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FolderPlus,
  Folder,
  ChevronRight,
  Home,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DocumentFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any>;
}

interface FolderItem {
  name: string;
  id: string;
  created_at: string;
}

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentPath, setCurrentPath] = useState("shared/");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteFile, setDeleteFile] = useState<DocumentFile | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFolderOpen, setUploadFolderOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterType, setFilterType] = useState<string>("all");
  const [previewFile, setPreviewFile] = useState<DocumentFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [renameFile, setRenameFile] = useState<DocumentFile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteFolder, setDeleteFolder] = useState<FolderItem | null>(null);
  const [renameFolder, setRenameFolder] = useState<FolderItem | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");
  const [searchResults, setSearchResults] = useState<Array<DocumentFile & { path: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user, currentPath]);

  const loadFiles = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // If on root, do one-time migration
      if (currentPath === "shared/") {
        let { data, error } = await supabase.storage
          .from("documents")
          .list(currentPath, {
            sortBy: { column: "created_at", order: "desc" },
          });

        if (error) throw error;

        // If shared is empty, migrate any existing user-specific documents to shared
        if ((data?.length || 0) === 0) {
          const { data: userData, error: userListError } = await supabase.storage
            .from("documents")
            .list(`${user.id}/`, {
              sortBy: { column: "created_at", order: "desc" },
            });

          if (userListError) throw userListError;

          if ((userData?.length || 0) > 0) {
            // Move each file into the shared folder (one-time migration)
            for (const file of userData!) {
              const fromPath = `${user.id}/${file.name}`;
              const toPath = `shared/${file.name}`;
              const { error: moveError } = await supabase.storage
                .from("documents")
                .move(fromPath, toPath);

              // If a file already exists in shared, skip it
              if (moveError && !/already exists|exists/i.test(moveError.message || "")) {
                console.warn("Move failed for", fromPath, "->", toPath, moveError.message);
              }
            }

            // Reload shared list after migration
            const res = await supabase.storage
              .from("documents")
              .list(currentPath, { sortBy: { column: "created_at", order: "desc" } });
            data = res.data;
          }
        }

        // Separate folders from files
        const folderItems: FolderItem[] = [];
        const fileItems: DocumentFile[] = [];
        
        (data || []).forEach((item) => {
          if (item.id === null) {
            // It's a folder
            folderItems.push({
              name: item.name,
              id: item.name,
              created_at: item.created_at || new Date().toISOString(),
            });
          } else if (item.name !== '.keep') {
            // It's a file (excluding .keep files)
            fileItems.push(item as DocumentFile);
          }
        });

        setFolders(folderItems);
        setFiles(fileItems);
      } else {
        // Load from current path
        const { data, error } = await supabase.storage
          .from("documents")
          .list(currentPath, {
            sortBy: { column: "created_at", order: "desc" },
          });

        if (error) throw error;

        // Separate folders from files
        const folderItems: FolderItem[] = [];
        const fileItems: DocumentFile[] = [];
        
        (data || []).forEach((item) => {
          if (item.id === null) {
            // It's a folder
            folderItems.push({
              name: item.name,
              id: item.name,
              created_at: item.created_at || new Date().toISOString(),
            });
          } else if (item.name !== '.keep') {
            // It's a file (excluding .keep files)
            fileItems.push(item as DocumentFile);
          }
        });

        setFolders(folderItems);
        setFiles(fileItems);
      }
    } catch (error: any) {
      console.error("Error loading files:", error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!user || files.length === 0) return;

    // Validate file sizes (20MB limit)
    const invalidFiles = files.filter(file => file.size > 20 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast({
        title: "Files too large",
        description: `${invalidFiles.length} file(s) exceed the 20MB limit`,
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const file of files) {
        try {
          // Get the relative path from the file's webkitRelativePath if available (for folder uploads)
          const relativePath = (file as any).webkitRelativePath || file.name;
          
          // If it's a folder upload, extract the path after the first folder name
          let filePath: string;
          if (relativePath.includes('/')) {
            // Extract path after the root folder name (e.g., "MyFolder/subfolder/file.txt" -> "subfolder/file.txt")
            const pathParts = relativePath.split('/');
            pathParts.shift(); // Remove the root folder name
            filePath = `${currentPath}${pathParts.join('/')}`;
          } else {
            filePath = `${currentPath}${file.name}`;
          }

          const { error: uploadError } = await supabase.storage
            .from("documents")
            .upload(filePath, file, {
              upsert: false,
            });

          if (uploadError) throw uploadError;
          successCount++;
        } catch (error: any) {
          console.error("Error uploading file:", file.name, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} document(s) uploaded successfully`,
        });
        loadFiles();
      }

      if (errorCount > 0) {
        toast({
          title: "Warning",
          description: `${errorCount} document(s) failed to upload`,
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
      setUploadOpen(false);
      setUploadFolderOpen(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;

    try {
      // Create a placeholder file in the folder to make it exist
      const folderPath = `${currentPath}${newFolderName}/.keep`;
      const { error } = await supabase.storage
        .from("documents")
        .upload(folderPath, new Blob([""], { type: "text/plain" }), {
          upsert: false,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Folder created successfully",
      });

      setNewFolderName("");
      setCreateFolderOpen(false);
      loadFiles();
    } catch (error: any) {
      console.error("Error creating folder:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  const navigateToFolder = (folderName: string) => {
    setCurrentPath(`${currentPath}${folderName}/`);
  };

  const navigateToRoot = () => {
    setCurrentPath("shared/");
  };


  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !user) return;
    
    // Check if we're dropping a file on a folder
    const fileId = active.id as string;
    const folderId = over.id as string;
    
    // Find the file and folder
    const file = files.find(f => f.id === fileId);
    const folder = folders.find(f => f.id === folderId);
    
    if (!file || !folder) return;
    
    try {
      const oldPath = `${currentPath}${file.name}`;
      const newPath = `${currentPath}${folder.name}/${file.name}`;
      
      const { error } = await supabase.storage
        .from("documents")
        .move(oldPath, newPath);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Moved ${file.name} to ${folder.name}`,
      });
      
      loadFiles();
    } catch (error: any) {
      console.error("Error moving file:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to move file",
        variant: "destructive",
      });
    }
  };

  const getBreadcrumbs = () => {
    const parts = currentPath.split("/").filter(Boolean);
    return parts.map((part, index) => ({
      name: part === "shared" ? "Home" : part,
      path: parts.slice(0, index + 1).join("/") + "/",
    }));
  };

  const handleDeleteFolder = async () => {
    if (!user || !deleteFolder) return;

    try {
      // List all files in the folder recursively
      const folderPath = `${currentPath}${deleteFolder.name}/`;
      const { data, error: listError } = await supabase.storage
        .from("documents")
        .list(folderPath, {
          limit: 1000,
          sortBy: { column: "name", order: "asc" },
        });

      if (listError) throw listError;

      // Delete all files in the folder
      if (data && data.length > 0) {
        const filePaths = data.map((file) => `${folderPath}${file.name}`);
        const { error: deleteError } = await supabase.storage
          .from("documents")
          .remove(filePaths);

        if (deleteError) throw deleteError;
      }

      // Also delete the .keep file if it exists
      await supabase.storage
        .from("documents")
        .remove([`${folderPath}.keep`]);

      toast({
        title: "Success",
        description: "Folder deleted successfully",
      });

      setDeleteFolder(null);
      loadFiles();
    } catch (error: any) {
      console.error("Error deleting folder:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete folder",
        variant: "destructive",
      });
    }
  };

  const openRenameFolderDialog = (folder: FolderItem) => {
    setRenameFolder(folder);
    setRenameFolderValue(folder.name);
  };

  const handleRenameFolder = async () => {
    if (!user || !renameFolder || !renameFolderValue.trim()) return;

    try {
      const oldFolderPath = `${currentPath}${renameFolder.name}/`;
      const newFolderPath = `${currentPath}${renameFolderValue}/`;

      // List all files in the old folder
      const { data, error: listError } = await supabase.storage
        .from("documents")
        .list(oldFolderPath, {
          limit: 1000,
          sortBy: { column: "name", order: "asc" },
        });

      if (listError) throw listError;

      // Move each file to the new folder
      if (data && data.length > 0) {
        for (const file of data) {
          const oldPath = `${oldFolderPath}${file.name}`;
          const newPath = `${newFolderPath}${file.name}`;
          
          const { error: moveError } = await supabase.storage
            .from("documents")
            .move(oldPath, newPath);

          if (moveError) throw moveError;
        }
      }

      toast({
        title: "Success",
        description: "Folder renamed successfully",
      });

      setRenameFolder(null);
      setRenameFolderValue("");
      loadFiles();
    } catch (error: any) {
      console.error("Error renaming folder:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to rename folder",
        variant: "destructive",
      });
    }
  };

  const handleOpenFile = async (file: DocumentFile) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(`${currentPath}${file.name}`, 3600); // 1 hour expiry

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error("Error opening file:", error);
      toast({
        title: "Error",
        description: "Failed to open document",
        variant: "destructive",
      });
    }
  };

  const isPreviewable = (filename: string, mimetype?: string) => {
    const ext = getFileExtension(filename).toLowerCase();
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
    const documentExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];
    const isPdf = ext === "pdf";
    const isImage = imageExtensions.includes(ext) || mimetype?.startsWith("image/");
    const isDocument = documentExtensions.includes(ext);
    return isPdf || isImage || isDocument;
  };

  const handlePreview = async (file: DocumentFile) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(`${currentPath}${file.name}`, 3600); // 1 hour expiry

      if (error) throw error;

      setPreviewUrl(data.signedUrl);
      setPreviewFile(file);
    } catch (error: any) {
      console.error("Error previewing file:", error);
      toast({
        title: "Error",
        description: "Failed to preview document",
        variant: "destructive",
      });
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewUrl("");
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredAndSortedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredAndSortedFiles.map(f => f.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedFiles.size === 0) return;

    try {
      const filesToDelete = files.filter(f => selectedFiles.has(f.id));
      const paths = filesToDelete.map(f => `${currentPath}${f.name}`);

      const { error } = await supabase.storage
        .from("documents")
        .remove(paths);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedFiles.size} document(s) deleted`,
      });

      setSelectedFiles(new Set());
      loadFiles();
    } catch (error: any) {
      console.error("Error deleting files:", error);
      toast({
        title: "Error",
        description: "Failed to delete documents",
        variant: "destructive",
      });
    }
  };

  const handleBulkDownload = async () => {
    if (!user || selectedFiles.size === 0) return;

    const filesToDownload = files.filter(f => selectedFiles.has(f.id));
    
    for (const file of filesToDownload) {
      await handleDownload(file);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  const handleRename = async () => {
    if (!user || !renameFile || !renameValue.trim()) return;

    try {
      const oldPath = `${currentPath}${renameFile.name}`;
      const newPath = `${currentPath}${renameValue}`;

      // Download the file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(oldPath);

      if (downloadError) throw downloadError;

      // Upload with new name
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(newPath, fileData, { upsert: false });

      if (uploadError) throw uploadError;

      // Delete old file
      const { error: deleteError } = await supabase.storage
        .from("documents")
        .remove([oldPath]);

      if (deleteError) throw deleteError;

      toast({
        title: "Success",
        description: "Document renamed successfully",
      });

      setRenameFile(null);
      setRenameValue("");
      loadFiles();
    } catch (error: any) {
      console.error("Error renaming file:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to rename document",
        variant: "destructive",
      });
    }
  };

  const openRenameDialog = (file: DocumentFile) => {
    setRenameFile(file);
    setRenameValue(file.name);
  };

  const handleDownload = async (file: DocumentFile) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(`${currentPath}${file.name}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Document downloaded",
      });
    } catch (error: any) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async (file: DocumentFile) => {
    if (!user) return;

    try {
      const filePath = `${currentPath}${file.name}`;
      
      // Create a proper URL to the documents page with file parameter
      const documentUrl = `${window.location.origin}/documents?file=${encodeURIComponent(filePath)}`;
      
      await navigator.clipboard.writeText(documentUrl);
      toast({
        title: "Success",
        description: "Link copied to clipboard",
      });
    } catch (error: any) {
      console.error("Error copying link:", error);
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteFile || !user) return;

    try {
      const { error } = await supabase.storage
        .from("documents")
        .remove([`${currentPath}${deleteFile.name}`]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document deleted",
      });

      loadFiles();
    } catch (error: any) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    } finally {
      setDeleteFile(null);
    }
  };

  const getFileExtension = (filename: string) => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
  };

  const getFileIcon = (filename: string, mimetype?: string) => {
    const ext = getFileExtension(filename).toLowerCase();
    
    if (mimetype?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
      return <ImageIcon className="h-5 w-5 text-primary" />;
    if (ext === "pdf") return <FileText className="h-5 w-5 text-red-500" />;
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
      return <Archive className="h-5 w-5 text-yellow-500" />;
    if (["js", "jsx", "ts", "tsx", "json", "xml", "html", "css"].includes(ext))
      return <FileCode className="h-5 w-5 text-green-500" />;
    if (["doc", "docx"].includes(ext))
      return <FileText className="h-5 w-5 text-blue-500" />;
    if (["xls", "xlsx"].includes(ext))
      return <FileText className="h-5 w-5 text-green-600" />;
    if (["ppt", "pptx"].includes(ext))
      return <FileText className="h-5 w-5 text-orange-500" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const handleSort = (column: "name" | "date" | "size") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (column: "name" | "date" | "size") => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  // Search across entire file system using backend function
  const searchAllFiles = async (query: string) => {
    if (!user || !query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('search-documents', {
        body: { searchQuery: query }
      });

      if (error) throw error;

      setSearchResults(data.results || []);
    } catch (error: any) {
      console.error("Error searching files:", error);
      toast({
        title: "Error",
        description: "Failed to search documents",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchAllFiles(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredAndSortedFiles = useMemo(() => {
    // If searching, use search results
    if (isSearching && searchResults.length > 0) {
      let filtered = searchResults.filter((file) => {
        const fileExt = getFileExtension(file.name).toLowerCase();
        const matchesFilter = filterType === "all" || fileExt === filterType.toLowerCase();
        return matchesFilter;
      });

      filtered.sort((a, b) => {
        let comparison = 0;
        if (sortBy === "name") {
          comparison = a.name.localeCompare(b.name);
        } else if (sortBy === "date") {
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        } else if (sortBy === "size") {
          comparison = (a.metadata?.size || 0) - (b.metadata?.size || 0);
        }
        return sortOrder === "asc" ? comparison : -comparison;
      });

      return filtered;
    }

    // Normal folder view
    let filtered = files.filter((file) => {
      const fileExt = getFileExtension(file.name).toLowerCase();
      const matchesFilter = filterType === "all" || fileExt === filterType.toLowerCase();
      return matchesFilter;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "date") {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === "size") {
        comparison = (a.metadata?.size || 0) - (b.metadata?.size || 0);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [files, searchResults, isSearching, filterType, sortBy, sortOrder]);

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Documents</h1>
            <p className="text-lg text-muted-foreground">
              Upload and manage your personal documents
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Folder</DialogTitle>
                  <DialogDescription>
                    Enter a name for the new folder
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateFolder();
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCreateFolderOpen(false);
                        setNewFolderName("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                      Create Folder
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Files
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Files</DialogTitle>
                  <DialogDescription>
                    Select one or multiple files to upload (max 20MB each)
                  </DialogDescription>
                </DialogHeader>
                <FileDropzone
                  onFilesSelected={handleFileUpload}
                  multiple
                  maxSize={20}
                  label={uploading ? "Uploading..." : "Drag files here or click to upload"}
                />
              </DialogContent>
            </Dialog>
            <Dialog open={uploadFolderOpen} onOpenChange={setUploadFolderOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Folder className="mr-2 h-4 w-4" />
                  Upload Folder
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Folder</DialogTitle>
                  <DialogDescription>
                    Select a folder to upload with all its contents (max 20MB per file)
                  </DialogDescription>
                </DialogHeader>
                <FileDropzone
                  onFilesSelected={handleFileUpload}
                  allowFolders
                  maxSize={20}
                  label={uploading ? "Uploading..." : "Select folder to upload"}
                />
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              size="icon"
              onClick={loadFiles}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={navigateToRoot}
            className="h-8 px-2"
          >
            <Home className="h-4 w-4" />
          </Button>
          {getBreadcrumbs().map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPath(crumb.path)}
                className="h-8 px-2"
              >
                {crumb.name}
              </Button>
            </div>
          ))}
        </div>

        {selectedFiles.size > 0 && (
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedFiles.size} document(s) selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFiles(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="docx">DOCX</SelectItem>
              <SelectItem value="xlsx">XLSX</SelectItem>
              <SelectItem value="jpg">Images</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : folders.length === 0 && filteredAndSortedFiles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <File className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {isSearching ? "No documents found" : files.length === 0 ? "No documents yet" : "No documents found"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isSearching 
                  ? `No files found matching "${searchQuery}"`
                  : files.length === 0
                    ? "Click the upload button to get started"
                    : "Try adjusting your search or filters"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <DndContext onDragEnd={handleDragEnd}>
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedFiles.size === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("name")}
                        className="hover:bg-transparent p-0 h-auto font-semibold"
                      >
                        Name {getSortIcon("name")}
                      </Button>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("size")}
                        className="hover:bg-transparent p-0 h-auto font-semibold"
                      >
                        Size {getSortIcon("size")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Folders first - hide when searching */}
                  {!isSearching && folders.map((folder) => (
                    <DroppableFolderRow 
                      key={folder.id} 
                      folder={folder}
                      onNavigate={() => navigateToFolder(folder.name)}
                      onDelete={() => setDeleteFolder(folder)}
                      onRename={() => openRenameFolderDialog(folder)}
                    />
                  ))}
                  
                  {/* Files */}
                  {filteredAndSortedFiles.map((file) => {
                    const filePath = isSearching && 'path' in file ? (file as any).path : undefined;
                    return (
                      <DraggableFileRow
                        key={file.id}
                        file={file}
                        selected={selectedFiles.has(file.id)}
                        onToggleSelect={() => toggleFileSelection(file.id)}
                        onPreview={() => handlePreview(file)}
                        onDownload={() => handleDownload(file)}
                        onRename={() => openRenameDialog(file)}
                        onDelete={() => setDeleteFile(file)}
                        onOpenFile={() => handleOpenFile(file)}
                        onCopyLink={() => handleCopyLink(file)}
                        isPreviewable={isPreviewable(file.name, file.metadata?.mimetype)}
                        getFileIcon={getFileIcon}
                        getFileExtension={getFileExtension}
                        formatFileSize={formatFileSize}
                        filePath={filePath}
                      />
                    );
                  })}
                </TableBody>
              </Table>
              </DndContext>
            </CardContent>
          </Card>
        )}

      <Dialog open={!!previewFile} onOpenChange={closePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
            <DialogDescription>
              Document preview - {formatFileSize(previewFile?.metadata?.size || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewFile && previewUrl && (
              <>
                {getFileExtension(previewFile.name).toLowerCase() === "pdf" ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[70vh] border-0"
                    title="PDF Preview"
                  />
                ) : ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(
                    getFileExtension(previewFile.name).toLowerCase()
                  ) ? (
                  <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                    className="w-full h-[70vh] border-0"
                    title="Document Preview"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt={previewFile.name}
                    className="w-full h-auto object-contain"
                  />
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameFile} onOpenChange={() => setRenameFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
            <DialogDescription>
              Enter a new name for the document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Document name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRename();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRenameFile(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleRename}>
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteFile?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Folder Rename Dialog */}
      <Dialog open={!!renameFolder} onOpenChange={() => setRenameFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for the folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={renameFolderValue}
              onChange={(e) => setRenameFolderValue(e.target.value)}
              placeholder="Folder name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameFolder();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRenameFolder(null);
                  setRenameFolderValue("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleRenameFolder} disabled={!renameFolderValue.trim()}>
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Folder Delete Dialog */}
      <AlertDialog open={!!deleteFolder} onOpenChange={() => setDeleteFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the folder "{deleteFolder?.name}" and all its contents? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
