import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  MoreVertical,
  Trash2,
  Pencil,
  Copy,
  Move,
  Eye,
} from "lucide-react";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { getFileTypeConfig, canPreviewFile, formatFileSize } from "@/lib/fileTypeConfig";
import { SharePointFolder, SharePointFile, FileOperationCallbacks } from "./SharePointTableRow";

interface SharePointGridViewProps {
  folders: SharePointFolder[];
  files: SharePointFile[];
  onFolderNavigate: (name: string, path?: string) => void;
  selectedItems: Set<string>;
  onSelectChange: (id: string, selected: boolean) => void;
  operations?: FileOperationCallbacks;
  loading?: boolean;
}

const FolderGridItem = memo<{
  folder: SharePointFolder;
  onNavigate: (name: string, path?: string) => void;
  selected: boolean;
  onSelectChange: (id: string, selected: boolean) => void;
  operations?: FileOperationCallbacks;
  loading?: boolean;
}>(({ folder, onNavigate, selected, onSelectChange, operations, loading }) => {
  return (
    <Card
      className={`group transition-all duration-200 hover:shadow-elevated hover:scale-[1.01] ${
        loading ? 'opacity-50 pointer-events-none' : ''
      } ${selected ? 'ring-2 ring-primary' : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Header with checkbox and menu */}
          <div className="flex items-start justify-between">
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectChange(folder.id, !!checked)}
              onClick={(e) => e.stopPropagation()}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
          </div>

          {/* Folder icon and content */}
          <div
            className="flex flex-col items-center gap-3 cursor-pointer"
            onClick={() => onNavigate(folder.name, folder.path)}
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10">
              <Folder className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center w-full">
              <p className="font-medium truncate" title={folder.name}>
                {folder.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {folder.childCount} {folder.childCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            {formatAUDateTimeFull(folder.lastModifiedDateTime)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

FolderGridItem.displayName = 'FolderGridItem';

const FileGridItem = memo<{
  file: SharePointFile;
  selected: boolean;
  onSelectChange: (id: string, selected: boolean) => void;
  operations?: FileOperationCallbacks;
}>(({ file, selected, onSelectChange, operations }) => {
  const config = getFileTypeConfig(file.name);
  const Icon = config.icon;
  const hasPreview = canPreviewFile(file.name);

  return (
    <Card
      className={`group transition-all duration-200 hover:shadow-elevated hover:scale-[1.01] ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Header with checkbox and menu */}
          <div className="flex items-start justify-between">
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectChange(file.id, !!checked)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
          </div>

          {/* File icon and content */}
          <div
            className={`flex flex-col items-center gap-3 ${
              hasPreview && operations?.onPreview ? 'cursor-pointer' : ''
            }`}
            onClick={() => hasPreview && operations?.onPreview?.(file)}
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-muted/10">
              <Icon className={`h-8 w-8 ${config.colorClass}`} />
            </div>
            <div className="text-center w-full">
              <p className="font-medium truncate text-sm" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t truncate">
            {formatAUDateTimeFull(file.lastModifiedDateTime)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

FileGridItem.displayName = 'FileGridItem';

export function SharePointGridView({
  folders,
  files,
  onFolderNavigate,
  selectedItems,
  onSelectChange,
  operations,
  loading,
}: SharePointGridViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {folders.map((folder) => (
        <FolderGridItem
          key={folder.id}
          folder={folder}
          onNavigate={onFolderNavigate}
          selected={selectedItems.has(folder.id)}
          onSelectChange={onSelectChange}
          operations={operations}
          loading={loading}
        />
      ))}
      {files.map((file) => (
        <FileGridItem
          key={file.id}
          file={file}
          selected={selectedItems.has(file.id)}
          onSelectChange={onSelectChange}
          operations={operations}
        />
      ))}
    </div>
  );
}
