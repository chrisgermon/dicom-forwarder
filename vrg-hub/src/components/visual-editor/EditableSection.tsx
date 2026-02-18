import { ReactNode, useState } from "react";
import { useInlineEdit } from "@/contexts/InlineEditContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
interface EditableSectionProps {
  id: string;
  label: string;
  children: ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

export function EditableSection({
  id,
  label,
  children,
  isActive,
  onClick,
  onDelete,
}: EditableSectionProps) {
  const { isEditing } = useInlineEdit();
  const [isHovered, setIsHovered] = useState(false);

  if (!isEditing) {
    return <div id={id}>{children}</div>;
  }

  return (
    <div
      id={id}
      className={cn(
        "relative transition-all",
        isEditing && "cursor-pointer",
        isActive && "ring-2 ring-primary ring-offset-2"
      )}
      style={{
        border: isEditing ? "2px dashed #3b82f6" : "none",
        borderRadius: isEditing ? "8px" : "0",
        padding: isEditing ? "12px" : "0",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {isEditing && (isHovered || isActive) && (
        <>
          <div className="absolute -top-7 left-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-t-md font-medium z-20">
            {label}
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="absolute -top-8 right-0 h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 z-20 bg-background border border-border"
              aria-label={`Delete ${label}`}
              title={`Delete ${label}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
      {children}
    </div>
  );
}
