import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Plus, Link, Image, FolderOpen, Type, MousePointerClick, Minus, ChevronDown, AlertCircle, Video, Users, Code } from "lucide-react";
import { ModuleType, MODULE_LABELS, MODULE_CATEGORIES } from "./types";

interface AddModuleButtonProps {
  onAdd: (type: ModuleType) => void;
}

const MODULE_ICONS: Record<ModuleType, typeof Link> = {
  quick_links: Link,
  image_gallery: Image,
  file_browser: FolderOpen,
  rich_text: Type,
  link_buttons: MousePointerClick,
  divider: Minus,
  accordion: ChevronDown,
  callout: AlertCircle,
  video_embed: Video,
  contact_cards: Users,
  embed_code: Code,
};

export function AddModuleButton({ onAdd }: AddModuleButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full border-dashed h-14 text-base">
          <Plus className="h-5 w-5 mr-2" />
          Add Content Block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        {Object.entries(MODULE_CATEGORIES).map(([key, category], index) => (
          <div key={key}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
              {category.label}
            </DropdownMenuLabel>
            {category.modules.map((type) => {
              const Icon = MODULE_ICONS[type];
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => onAdd(type)}
                  className="cursor-pointer py-2"
                >
                  <Icon className="h-4 w-4 mr-3 text-muted-foreground" />
                  <span>{MODULE_LABELS[type]}</span>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
