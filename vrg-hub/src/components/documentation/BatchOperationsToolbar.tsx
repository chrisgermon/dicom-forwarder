import { Button } from '@/components/ui/button';
import { Download, Trash2, FolderInput, X } from 'lucide-react';

interface BatchOperationsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDownload: () => void;
  onBulkDelete: () => void;
  onBulkMove: () => void;
}

export function BatchOperationsToolbar({
  selectedCount,
  onClearSelection,
  onBulkDownload,
  onBulkDelete,
  onBulkMove,
}: BatchOperationsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-primary text-primary-foreground p-3 rounded-lg flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="font-medium">{selectedCount} item{selectedCount !== 1 ? 's' : ''} selected</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-7 text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onBulkDownload}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onBulkMove}
          className="gap-2"
        >
          <FolderInput className="h-4 w-4" />
          Move
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onBulkDelete}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
