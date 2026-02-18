import { memo, useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  ExternalLink,
  Folder,
  ChevronRight,
  MoreVertical,
  Trash2,
  Pencil,
  Copy,
  Move,
  Eye,
  
} from "lucide-react";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { getFileTypeConfig, canPreviewFile, formatFileSize } from "@/lib/fileTypeConfig";

export interface SharePointFolder {
  id: string;
  name: string;
  webUrl: string;
  childCount: number;
  lastModifiedDateTime: string;
  path?: string;
}

export interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  lastModifiedDateTime: string;
  lastModifiedBy?: string;
  fileType: string;
  downloadUrl?: string;
  path?: string;
}

export interface FileOperationCallbacks {
  onDelete?: (item: SharePointFile | SharePointFolder, type: 'file' | 'folder') => void;
  onRename?: (item: SharePointFile | SharePointFolder, type: 'file' | 'folder') => void;
  onMove?: (item: SharePointFile | SharePointFolder, type: 'file' | 'folder') => void;
  onCopy?: (item: SharePointFile | SharePointFolder, type: 'file' | 'folder') => void;
  onPreview?: (file: SharePointFile) => void;
  onToggleFavorite?: (item: SharePointFile | SharePointFolder, type: 'file' | 'folder') => void;
  isFavorite?: (itemId: string) => boolean;
}

interface FolderRowProps {
  folder: SharePointFolder;
  onNavigate: (name: string, path?: string) => void;
  isSearchResult: boolean;
  currentPath: string;
  loading: boolean;
  selected?: boolean;
  onSelectChange?: (id: string, selected: boolean) => void;
  operations?: FileOperationCallbacks;
}

interface FileRowProps {
  file: SharePointFile;
  isSearchResult: boolean;
  currentPath: string;
  selected?: boolean;
  onSelectChange?: (id: string, selected: boolean) => void;
  operations?: FileOperationCallbacks;
}

// Get appropriate icon based on file extension using centralized config
function getFileIcon(filename: string) {
  const config = getFileTypeConfig(filename);
  const Icon = config.icon;
  return <Icon className={`h-5 w-5 ${config.colorClass}`} />;
}

export const FolderRow = memo<FolderRowProps>(({
  folder,
  onNavigate,
  isSearchResult,
  currentPath,
  loading,
  selected,
  onSelectChange,
  operations,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on checkbox or menu
    if ((e.target as HTMLElement).closest('[data-no-navigate]')) {
      return;
    }
    onNavigate(folder.name, folder.path);
  };

  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 ${loading ? 'opacity-50 pointer-events-none' : ''} ${selected ? 'bg-muted/30' : ''}`}
      onClick={handleRowClick}
    >
      {onSelectChange && (
        <TableCell className="w-10" data-no-navigate>
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectChange(folder.id, !!checked)}
            onClick={(e) => e.stopPropagation()}
          />
        </TableCell>
      )}
      <TableCell className="w-10">
        <Folder className="h-5 w-5 text-primary" />
      </TableCell>
      <TableCell className="font-medium">
        {folder.name}
      </TableCell>
      {isSearchResult && (
        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
          {folder.path || currentPath}
        </TableCell>
      )}
      <TableCell className="hidden md:table-cell text-sm text-muted-foreground whitespace-nowrap">
        {formatAUDateTimeFull(folder.lastModifiedDateTime)}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
        —
      </TableCell>
      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
        —
      </TableCell>
      <TableCell data-no-navigate>
        <div className="flex gap-1 items-center">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => window.open(folder.webUrl, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in SharePoint
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {operations?.onRename && (
                <DropdownMenuItem onClick={() => operations.onRename?.(folder, 'folder')}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
              )}
              {operations?.onMove && (
                <DropdownMenuItem onClick={() => operations.onMove?.(folder, 'folder')}>
                  <Move className="h-4 w-4 mr-2" />
                  Move to...
                </DropdownMenuItem>
              )}
              {operations?.onCopy && (
                <DropdownMenuItem onClick={() => operations.onCopy?.(folder, 'folder')}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to...
                </DropdownMenuItem>
              )}
              {operations?.onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => operations.onDelete?.(folder, 'folder')}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onNavigate(folder.name, folder.path); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

FolderRow.displayName = 'FolderRow';

export const FileRow = memo<FileRowProps>(({
  file,
  isSearchResult,
  currentPath,
  selected,
  onSelectChange,
  operations,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasPreview = canPreviewFile(file.name);

  return (
    <TableRow className={`hover:bg-muted/50 ${selected ? 'bg-muted/30' : ''}`}>
      {onSelectChange && (
        <TableCell className="w-10">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectChange(file.id, !!checked)}
          />
        </TableCell>
      )}
      <TableCell className="w-10">
        {getFileIcon(file.name)}
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span
            className={`truncate max-w-xs ${hasPreview && operations?.onPreview ? 'cursor-pointer hover:text-primary hover:underline' : ''}`}
            onClick={() => hasPreview && operations?.onPreview?.(file)}
          >
            {file.name}
          </span>
          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
            {file.fileType}
          </span>
        </div>
      </TableCell>
      {isSearchResult && (
        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
          {file.path || currentPath}
        </TableCell>
      )}
      <TableCell className="hidden md:table-cell text-sm text-muted-foreground whitespace-nowrap">
        {formatAUDateTimeFull(file.lastModifiedDateTime)}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground truncate max-w-[120px]">
        {file.lastModifiedBy || '—'}
      </TableCell>
      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
        {formatFileSize(file.size)}
      </TableCell>
      <TableCell>
        <div className="flex gap-1 items-center">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {hasPreview && operations?.onPreview && (
                <DropdownMenuItem onClick={() => operations.onPreview?.(file)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => window.open(file.webUrl, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in SharePoint
              </DropdownMenuItem>
              {file.downloadUrl && (
                <DropdownMenuItem onClick={() => window.open(file.downloadUrl, '_blank')}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {operations?.onRename && (
                <DropdownMenuItem onClick={() => operations.onRename?.(file, 'file')}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
              )}
              {operations?.onMove && (
                <DropdownMenuItem onClick={() => operations.onMove?.(file, 'file')}>
                  <Move className="h-4 w-4 mr-2" />
                  Move to...
                </DropdownMenuItem>
              )}
              {operations?.onCopy && (
                <DropdownMenuItem onClick={() => operations.onCopy?.(file, 'file')}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to...
                </DropdownMenuItem>
              )}
              {operations?.onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => operations.onDelete?.(file, 'file')}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {file.downloadUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(file.downloadUrl, '_blank')}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

FileRow.displayName = 'FileRow';
