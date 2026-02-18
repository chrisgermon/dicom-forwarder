import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FolderPlus, Folder, ChevronRight, Home } from "lucide-react";
import { toast } from "sonner";
import { SharePointFile, SharePointFolder } from "./SharePointTableRow";

// Delete Confirmation Dialog
interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: (SharePointFile | SharePointFolder) | null;
  itemType: 'file' | 'folder';
  onConfirm: () => Promise<void>;
}

export function DeleteDialog({ open, onOpenChange, item, itemType, onConfirm }: DeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemType}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{item?.name}"?
            {itemType === 'folder' && (
              <span className="block mt-2 text-destructive font-medium">
                This will also delete all files and subfolders inside it.
              </span>
            )}
            <span className="block mt-2">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Rename Dialog
interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: (SharePointFile | SharePointFolder) | null;
  itemType: 'file' | 'folder';
  onConfirm: (newName: string) => Promise<void>;
}

export function RenameDialog({ open, onOpenChange, item, itemType, onConfirm }: RenameDialogProps) {
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (item) {
      setNewName(item.name);
    }
  }, [item]);

  const handleRename = async () => {
    if (!newName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    if (newName === item?.name) {
      onOpenChange(false);
      return;
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(newName)) {
      toast.error('Name contains invalid characters: < > : " / \\ | ? *');
      return;
    }

    setRenaming(true);
    try {
      await onConfirm(newName.trim());
      onOpenChange(false);
    } catch (error) {
      console.error('Rename error:', error);
    } finally {
      setRenaming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {itemType}</DialogTitle>
          <DialogDescription>
            Enter a new name for "{item?.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="newName">New name</Label>
          <Input
            id="newName"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="mt-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRename();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={renaming}>
            Cancel
          </Button>
          <Button onClick={handleRename} disabled={renaming}>
            {renaming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Renaming...
              </>
            ) : (
              'Rename'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create Folder Dialog
interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  onConfirm: (folderName: string) => Promise<void>;
}

export function CreateFolderDialog({ open, onOpenChange, currentPath, onConfirm }: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setFolderName('');
    }
  }, [open]);

  const handleCreate = async () => {
    if (!folderName.trim()) {
      toast.error('Folder name cannot be empty');
      return;
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(folderName)) {
      toast.error('Name contains invalid characters: < > : " / \\ | ? *');
      return;
    }

    setCreating(true);
    try {
      await onConfirm(folderName.trim());
      onOpenChange(false);
    } catch (error) {
      console.error('Create folder error:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Create New Folder
          </DialogTitle>
          <DialogDescription>
            Create a new folder in: {currentPath || '/'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="folderName">Folder name</Label>
          <Input
            id="folderName"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="New Folder"
            className="mt-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreate();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Folder'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Move/Copy Dialog with folder browser
interface MoveCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: (SharePointFile | SharePointFolder) | null;
  itemType: 'file' | 'folder';
  operation: 'move' | 'copy';
  onConfirm: (destinationPath: string, destinationId?: string) => Promise<void>;
}

interface BrowseFolder {
  id: string;
  name: string;
  path: string;
  childCount: number;
}

export function MoveCopyDialog({
  open,
  onOpenChange,
  item,
  itemType,
  operation,
  onConfirm,
}: MoveCopyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [folders, setFolders] = useState<BrowseFolder[]>([]);
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setCurrentPath('/');
      setPathHistory([]);
      loadFolders('/');
    }
  }, [open]);

  const loadFolders = async (path: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('sharepoint-browse-folders-cached', {
        body: { folder_path: path },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        toast.error('Failed to load folders');
        return;
      }

      const folderItems = (data?.folders || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        path: path === '/' ? `/${f.name}` : `${path}/${f.name}`,
        childCount: f.childCount || 0,
      }));

      setFolders(folderItems);
    } catch (error) {
      console.error('Load folders error:', error);
      toast.error('Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folder: BrowseFolder) => {
    // Prevent selecting the same folder if moving a folder
    if (itemType === 'folder' && item && folder.id === item.id) {
      toast.error("Cannot move a folder into itself");
      return;
    }

    setPathHistory([...pathHistory, currentPath]);
    setCurrentPath(folder.path);
    loadFolders(folder.path);
  };

  // Navigation back handled by breadcrumbs

  const navigateToRoot = () => {
    setCurrentPath('/');
    setPathHistory([]);
    loadFolders('/');
  };

  const handleConfirm = async () => {
    setExecuting(true);
    try {
      await onConfirm(currentPath);
      onOpenChange(false);
    } catch (error) {
      console.error(`${operation} error:`, error);
    } finally {
      setExecuting(false);
    }
  };

  const getBreadcrumbs = () => {
    if (currentPath === '/') return [];
    return currentPath.split('/').filter(Boolean);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {operation === 'move' ? 'Move' : 'Copy'} "{item?.name}"
          </DialogTitle>
          <DialogDescription>
            Select a destination folder
          </DialogDescription>
        </DialogHeader>

        {/* Breadcrumb navigation */}
        <div className="flex items-center gap-1 text-sm py-2 border-b overflow-x-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={navigateToRoot}
            className="h-7 px-2"
          >
            <Home className="h-4 w-4" />
          </Button>
          {getBreadcrumbs().map((part, index) => {
            const pathToSegment = '/' + getBreadcrumbs().slice(0, index + 1).join('/');
            return (
              <div key={index} className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCurrentPath(pathToSegment);
                    loadFolders(pathToSegment);
                  }}
                  className="h-7 px-2"
                >
                  {part}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Folder list */}
        <div className="h-64 overflow-y-auto border rounded">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : folders.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No subfolders in this location
            </div>
          ) : (
            <div className="divide-y">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => navigateToFolder(folder)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 text-left"
                  disabled={itemType === 'folder' && item?.id === folder.id}
                >
                  <Folder className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="truncate flex-1">{folder.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {folder.childCount} items
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected location */}
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Destination:</span> {currentPath}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={executing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={executing}>
            {executing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {operation === 'move' ? 'Moving...' : 'Copying...'}
              </>
            ) : (
              <>
                {operation === 'move' ? 'Move Here' : 'Copy Here'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
