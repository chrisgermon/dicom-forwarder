import { Folder, MoreVertical, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatBytes } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Folder {
  id: string;
  name: string;
  created_at: string;
}

interface FileDocument {
  id: string;
  name: string;
  storage_path: string;
  size: number;
  mime_type: string;
  created_at: string;
}

interface FileBrowserProps {
  folders: Folder[];
  files: FileDocument[];
  viewMode: 'grid' | 'list';
  loading: boolean;
  onFolderClick: (folderId: string) => void;
  onRefresh: () => void;
}

export function FileBrowser({
  folders,
  files,
  viewMode,
  loading,
  onFolderClick,
  onRefresh,
}: FileBrowserProps) {
  const { toast } = useToast();

  const handleFileClick = async (file: FileDocument) => {
    try {
      // Check if file type is viewable in browser
      const viewableTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'text/plain',
      ];

      if (viewableTypes.includes(file.mime_type)) {
        // Create signed URL for secure access (valid for 1 hour)
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(file.storage_path, 3600);

        if (error) throw error;

        // Open in new tab for viewable types
        window.open(data.signedUrl, '_blank');
      } else {
        // Download for other types
        handleDownload(file);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error opening file',
        description: error.message,
      });
    }
  };

  const handleDownload = async (file: FileDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(file.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Download started',
        description: `Downloading ${file.name}`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: error.message,
      });
    }
  };

  const handleDelete = async (type: 'file' | 'folder', id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      if (type === 'file') {
        const { error } = await supabase
          .from('file_documents')
          .update({ is_active: false })
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('file_folders')
          .update({ is_active: false })
          .eq('id', id);

        if (error) throw error;
      }

      toast({
        title: 'Deleted successfully',
        description: `"${name}" has been deleted`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error.message,
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
    return '📄';
  };

  if (loading) {
    return (
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'}>
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className={viewMode === 'grid' ? 'h-32' : 'h-16'} />
        ))}
      </div>
    );
  }

  if (folders.length === 0 && files.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Folder className="size-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-1">No files or folders</h3>
        <p className="text-muted-foreground text-sm">
          Upload files or create folders to get started
        </p>
      </Card>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {folders.map((folder) => (
          <Card
            key={folder.id}
            className="p-4 cursor-pointer hover:bg-accent transition-colors group"
            onClick={() => onFolderClick(folder.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <Folder className="size-10 text-primary" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDelete('folder', folder.id, folder.name)}>
                    <Trash2 className="size-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-1">
              <p className="font-medium truncate">{folder.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(folder.created_at), { addSuffix: true })}
              </p>
            </div>
          </Card>
        ))}

        {files.map((file) => (
          <Card 
            key={file.id} 
            className="p-4 cursor-pointer hover:bg-accent transition-colors group"
            onClick={() => handleFileClick(file)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-4xl">{getFileIcon(file.mime_type)}</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file);
                  }}>
                    <Download className="size-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleDelete('file', file.id, file.name);
                  }}>
                    <Trash2 className="size-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-1">
              <p className="font-medium truncate text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)} • {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
              </p>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {folders.map((folder) => (
        <Card
          key={folder.id}
          className="p-3 cursor-pointer hover:bg-accent transition-colors group flex items-center justify-between"
          onClick={() => onFolderClick(folder.id)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Folder className="size-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{folder.name}</p>
              <p className="text-xs text-muted-foreground">
                Folder • {formatDistanceToNow(new Date(folder.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDelete('folder', folder.id, folder.name)}>
                <Trash2 className="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Card>
      ))}

      {files.map((file) => (
        <Card 
          key={file.id} 
          className="p-3 cursor-pointer hover:bg-accent transition-colors group flex items-center justify-between"
          onClick={() => handleFileClick(file)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-2xl flex-shrink-0">{getFileIcon(file.mime_type)}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)} • {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                handleDownload(file);
              }}>
                <Download className="size-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                handleDelete('file', file.id, file.name);
              }}>
                <Trash2 className="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Card>
      ))}
    </div>
  );
}
