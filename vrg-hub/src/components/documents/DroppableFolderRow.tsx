import { useDroppable } from '@dnd-kit/core';
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Folder, Edit, Trash2 } from "lucide-react";
import { FolderItem } from './types';
import { cn } from '@/lib/utils';

interface DroppableFolderRowProps {
  folder: FolderItem;
  onNavigate: () => void;
  onDelete: () => void;
  onRename: () => void;
}

export function DroppableFolderRow({ 
  folder, 
  onNavigate, 
  onDelete, 
  onRename
}: DroppableFolderRowProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: folder.id,
  });

  return (
    <TableRow 
      ref={setNodeRef}
      className={cn(
        "group cursor-pointer hover:bg-muted/50 transition-colors",
        isOver && "bg-primary/10 border-2 border-primary"
      )}
      onClick={onNavigate}
    >
      <TableCell className="py-3">
        {/* Empty cell for checkbox column */}
      </TableCell>
      <TableCell className="py-3">
        <Folder className="h-5 w-5 text-primary" />
      </TableCell>
      <TableCell className="font-medium">
        <span className="hover:text-primary transition-colors">
          {folder.name}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        Folder
      </TableCell>
      <TableCell className="text-muted-foreground">
        -
      </TableCell>
      <TableCell className="text-right">
        <div 
          className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
            title="Rename folder"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete folder"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
