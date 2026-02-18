import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FolderPlus,
  File,
  Folder,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileToUpload {
  file: File;
  path: string; // Relative path from selection root
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface FolderStructure {
  name: string;
  path: string;
  files: FileToUpload[];
  subfolders: FolderStructure[];
}

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  onUploadComplete?: () => void;
}

/**
 * Bulk Upload Dialog Component
 * Supports uploading multiple files and entire folder structures
 * Preserves folder hierarchy from the user's selection
 */
export function BulkUploadDialog({
  open,
  onOpenChange,
  currentPath,
  onUploadComplete,
}: BulkUploadDialogProps) {
  const [files, setFiles] = useState<FileToUpload[]>([]);
  const [folderStructure, setFolderStructure] = useState<FolderStructure | null>(null);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles: FileToUpload[] = Array.from(selectedFiles).map((file) => ({
      file,
      path: file.name,
      status: 'pending',
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    setFolderStructure(null); // Clear folder structure when individual files are selected
  };

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Build folder structure from webkitRelativePath
    const structure = buildFolderStructure(Array.from(selectedFiles));
    setFolderStructure(structure);

    // Also add to flat files list
    const newFiles: FileToUpload[] = Array.from(selectedFiles).map((file) => ({
      file,
      path: (file as any).webkitRelativePath || file.name,
      status: 'pending',
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const buildFolderStructure = (files: File[]): FolderStructure | null => {
    if (files.length === 0) return null;

    const root: FolderStructure = {
      name: 'root',
      path: '',
      files: [],
      subfolders: [],
    };

    files.forEach((file) => {
      const relativePath = (file as any).webkitRelativePath || file.name;
      const parts = relativePath.split('/');

      let currentLevel = root;

      // Navigate/create folder structure
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i];
        let subfolder = currentLevel.subfolders.find((f) => f.name === folderName);

        if (!subfolder) {
          subfolder = {
            name: folderName,
            path: parts.slice(0, i + 1).join('/'),
            files: [],
            subfolders: [],
          };
          currentLevel.subfolders.push(subfolder);
        }

        currentLevel = subfolder;
      }

      // Add file to the deepest folder
      currentLevel.files.push({
        file,
        path: relativePath,
        status: 'pending',
        progress: 0,
      });
    });

    return root.subfolders.length > 0 ? root.subfolders[0] : root;
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));

    // Rebuild folder structure if needed
    if (folderStructure) {
      const remainingFiles = files.filter((_, i) => i !== index);
      if (remainingFiles.length > 0) {
        const newStructure = buildFolderStructure(remainingFiles.map((f) => f.file));
        setFolderStructure(newStructure);
      } else {
        setFolderStructure(null);
      }
    }
  };

  const clearAll = () => {
    setFiles([]);
    setFolderStructure(null);
    setOverallProgress(0);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);

    try {
      // TODO: Replace with actual SharePoint upload logic
      // For now, simulate upload
      for (let i = 0; i < files.length; i++) {
        const _file = files[i]; void _file;

        // Update status to uploading
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'uploading' as const } : f
          )
        );

        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise((resolve) => setTimeout(resolve, 100));

          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, progress } : f
            )
          );
        }

        // Mark as success (or error based on actual upload result)
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'success' as const, progress: 100 }
              : f
          )
        );

        // Update overall progress
        setOverallProgress(Math.round(((i + 1) / files.length) * 100));
      }

      toast.success(`Successfully uploaded ${files.length} file${files.length > 1 ? 's' : ''}`);
      onUploadComplete?.();

      // Close dialog after short delay
      setTimeout(() => {
        onOpenChange(false);
        clearAll();
        setUploading(false);
      }, 1000);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
      setUploading(false);
    }
  };

  const getStatusIcon = (status: FileToUpload['status']) => {
    switch (status) {
      case 'pending':
        return <File className="h-4 w-4 text-muted-foreground" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-info animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const stats = {
    total: files.length,
    pending: files.filter((f) => f.status === 'pending').length,
    uploading: files.filter((f) => f.status === 'uploading').length,
    success: files.filter((f) => f.status === 'success').length,
    error: files.filter((f) => f.status === 'error').length,
  };

  const FolderTree = ({ structure, level = 0 }: { structure: FolderStructure; level?: number }) => (
    <div className={cn("space-y-1", level > 0 && "ml-4")}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Folder className="h-4 w-4 text-primary" />
        {structure.name}
        <Badge variant="secondary" className="h-5 text-xs">
          {structure.files.length} files
        </Badge>
      </div>

      {structure.subfolders.map((subfolder, idx) => (
        <FolderTree key={idx} structure={subfolder} level={level + 1} />
      ))}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Bulk Upload
            </DialogTitle>
            <DialogDescription>
              Upload multiple files or entire folder structures to {currentPath}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload Buttons */}
            {!uploading && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <File className="h-4 w-4 mr-2" />
                  Select Files
                </Button>
                <Button
                  variant="outline"
                  onClick={() => folderInputRef.current?.click()}
                  className="flex-1"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Select Folder
                </Button>
              </div>
            )}

            {/* Stats */}
            {files.length > 0 && (
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <Badge variant="secondary">{stats.total} total</Badge>
                {stats.pending > 0 && (
                  <Badge variant="outline">{stats.pending} pending</Badge>
                )}
                {stats.uploading > 0 && (
                  <Badge variant="outline" className="bg-info/10">
                    {stats.uploading} uploading
                  </Badge>
                )}
                {stats.success > 0 && (
                  <Badge variant="outline" className="bg-success/10">
                    {stats.success} completed
                  </Badge>
                )}
                {stats.error > 0 && (
                  <Badge variant="destructive">{stats.error} failed</Badge>
                )}
              </div>
            )}

            {/* Overall Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Overall Progress</span>
                  <span className="text-muted-foreground">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            )}

            {/* Folder Structure Preview */}
            {folderStructure && !uploading && (
              <div className="border border-border rounded-lg p-4">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FolderPlus className="h-4 w-4" />
                  Folder Structure Preview
                </p>
                <ScrollArea className="h-[150px]">
                  <FolderTree structure={folderStructure} />
                </ScrollArea>
              </div>
            )}

            {/* File List */}
            {files.length > 0 && (
              <div className="border border-border rounded-lg">
                <div className="p-3 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Files to Upload</p>
                    {!uploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        className="h-7 px-2 text-xs"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>
                <ScrollArea className="h-[250px]">
                  <div className="p-2 space-y-1">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md group"
                      >
                        {getStatusIcon(file.status)}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" title={file.path}>
                            {file.path}
                          </p>
                          {file.status === 'uploading' && (
                            <Progress value={file.progress} className="h-1 mt-1" />
                          )}
                          {file.error && (
                            <p className="text-xs text-destructive mt-1">{file.error}</p>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {(file.file.size / 1024).toFixed(1)} KB
                        </div>

                        {!uploading && file.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(index)}
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Empty State */}
            {files.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-lg">
                <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm font-medium mb-1">No files selected</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Click "Select Files" to upload individual files or "Select Folder" to
                  upload an entire folder structure
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Cancel'}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {files.length > 0 && `(${files.length})`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={folderInputRef}
        type="file"
        /* @ts-ignore - webkitdirectory is not in the types but is supported */
        webkitdirectory="true"
        directory="true"
        className="hidden"
        onChange={handleFolderSelect}
      />
    </>
  );
}
