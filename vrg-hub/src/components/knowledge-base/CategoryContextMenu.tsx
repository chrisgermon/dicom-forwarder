import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Edit, Trash2 } from "lucide-react";
import { useAccessControl } from "@/hooks/useAccessControl";
import { ReactNode } from "react";

interface CategoryContextMenuProps {
  children: ReactNode;
  categoryId: string;
  categoryName: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function CategoryContextMenu({
  children,
  onEdit,
  onDelete,
}: Omit<CategoryContextMenuProps, 'categoryId' | 'categoryName'>) {
  const { hasPermission } = useAccessControl();

  const canEdit = hasPermission("edit_knowledge_base") || hasPermission("manage_knowledge_base");
  const canDelete = hasPermission("delete_knowledge_base") || hasPermission("manage_knowledge_base");

  // If user has no permissions, don't show context menu
  if (!canEdit && !canDelete) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-popover border shadow-md z-[100]">
        {canEdit && (
          <ContextMenuItem onClick={onEdit} className="cursor-pointer">
            <Edit className="h-4 w-4 mr-2" />
            Edit Category
          </ContextMenuItem>
        )}
        {canDelete && (
          <ContextMenuItem 
            onClick={onDelete} 
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Category
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
