import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  GripVertical, 
  Trash2, 
  Link, 
  Image, 
  FolderOpen, 
  Type, 
  MousePointerClick, 
  Minus, 
  ChevronDown, 
  AlertCircle, 
  Video, 
  Users, 
  Code,
  Copy,
  ChevronUp,
  ChevronDownIcon,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { PageModule, ModuleType, ModuleContent, MODULE_LABELS, ColumnSpan, COLUMN_SPAN_OPTIONS } from "./types";
import { QuickLinksModule } from "./QuickLinksModule";
import { ImageGalleryModule } from "./ImageGalleryModule";
import { FileBrowserModule } from "./FileBrowserModule";
import { RichTextModule } from "./RichTextModule";
import { LinkButtonsModule } from "./LinkButtonsModule";
import { DividerModule } from "./DividerModule";
import { AccordionModule } from "./AccordionModule";
import { CalloutModule } from "./CalloutModule";
import { VideoEmbedModule } from "./VideoEmbedModule";
import { ContactCardsModule } from "./ContactCardsModule";
import { EmbedCodeModule } from "./EmbedCodeModule";

interface ModuleCardProps {
  module: PageModule;
  editing: boolean;
  onUpdate: (module: PageModule) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (module: PageModule) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
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

export function ModuleCard({ 
  module, 
  editing, 
  onUpdate, 
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
}: ModuleCardProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, width: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id, disabled: !editing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = MODULE_ICONS[module.module_type];

  const handleContentChange = (content: ModuleContent) => {
    onUpdate({ ...module, content });
  };

  const handleTitleChange = (title: string) => {
    onUpdate({ ...module, title });
  };

  // Handle drag-to-resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      width: module.column_span,
    });
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;

      const container = cardRef.current.closest('.grid');
      if (!container) return;

      const containerWidth = (container as HTMLElement).offsetWidth;
      const columnWidth = containerWidth / 12;
      const deltaX = e.clientX - resizeStart.x;
      const columnsDelta = Math.round(deltaX / columnWidth);
      
      // Snap to valid column span values
      const validSpans = [3, 4, 6, 8, 12];
      let newWidth = resizeStart.width + columnsDelta;
      
      // Find nearest valid span
      const nearestSpan = validSpans.reduce((prev, curr) => 
        Math.abs(curr - newWidth) < Math.abs(prev - newWidth) ? curr : prev
      );

      if (nearestSpan !== module.column_span) {
        onUpdate({ ...module, column_span: nearestSpan as ColumnSpan });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizeStart, module, onUpdate]);

  // Quick resize buttons
  const handleQuickResize = (span: ColumnSpan) => {
    onUpdate({ ...module, column_span: span });
  };

  const renderModuleContent = () => {
    switch (module.module_type) {
      case 'quick_links':
        return (
          <QuickLinksModule
            content={module.content as any}
            editing={editing}
            onChange={handleContentChange}
            moduleId={module.id}
          />
        );
      case 'image_gallery':
        return (
          <ImageGalleryModule
            content={module.content as any}
            editing={editing}
            onChange={handleContentChange}
          />
        );
      case 'file_browser':
        return (
          <FileBrowserModule
            content={module.content as any}
            editing={editing}
            onChange={handleContentChange}
          />
        );
      case 'rich_text':
        return (
          <RichTextModule
            content={module.content as any}
            editing={editing}
            onChange={handleContentChange}
          />
        );
      case 'link_buttons':
        return (
          <LinkButtonsModule
            content={module.content as any}
            editing={editing}
            onChange={handleContentChange}
            moduleId={module.id}
          />
        );
      case 'divider':
        return (
          <DividerModule
            content={module.content as any}
            editing={editing}
            onChange={handleContentChange}
          />
        );
      case 'accordion':
        return (
          <AccordionModule
            content={module.content as any}
            editing={editing}
            onChange={handleContentChange}
          />
        );
      case 'callout':
        return (
          <CalloutModule
            content={module.content as any}
            editing={editing}
            onChange={handleContentChange}
          />
        );
      case 'video_embed':
        return (
          <VideoEmbedModule
            content={module.content as any}
            editing={editing}
            onChange={handleContentChange}
          />
        );
      case 'contact_cards':
        return (
          <ContactCardsModule
            content={module.content as any}
            editing={editing}
            onChange={handleContentChange}
          />
        );
      case 'embed_code':
        return (
          <EmbedCodeModule
            content={module.content as any}
            editing={editing}
            onChange={handleContentChange}
          />
        );
    }
  };

  // For rich_text modules: hide header if not editing and title is empty
  const isRichTextWithNoHeader = module.module_type === 'rich_text' && !editing && !module.title?.trim();

  return (
    <TooltipProvider>
      <Card
        ref={(node) => {
          setNodeRef(node);
          if (node) cardRef.current = node;
        }}
        style={style}
        className={`relative transition-all duration-200 group ${
          isDragging ? "shadow-xl ring-2 ring-primary/30 opacity-90 scale-[1.02]" : ""
        } ${isResizing ? "ring-2 ring-primary/50" : ""} ${
          editing ? "border-2 border-dashed border-muted-foreground/30 hover:border-primary/50" : ""
        }`}
      >
        {/* Editing Toolbar */}
        {editing && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background border rounded-full px-2 py-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20">
            {/* Drag Handle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Drag to reorder</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-border" />

            {/* Quick Resize Buttons */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={module.column_span === 4 ? "secondary" : "ghost"}
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleQuickResize(4)}
                >
                  <span className="text-xs font-medium">⅓</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>1/3 Width</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={module.column_span === 6 ? "secondary" : "ghost"}
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleQuickResize(6)}
                >
                  <span className="text-xs font-medium">½</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Half Width</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={module.column_span === 12 ? "secondary" : "ghost"}
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleQuickResize(12)}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Full Width</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-border" />

            {/* Move Up/Down */}
            {onMoveUp && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onMoveUp}
                    disabled={isFirst}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Move Up</TooltipContent>
              </Tooltip>
            )}

            {onMoveDown && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onMoveDown}
                    disabled={isLast}
                  >
                    <ChevronDownIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Move Down</TooltipContent>
              </Tooltip>
            )}

            <div className="w-px h-4 bg-border" />

            {/* Duplicate */}
            {onDuplicate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onDuplicate(module)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicate</TooltipContent>
              </Tooltip>
            )}

            {/* Collapse Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                >
                  {isCollapsed ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isCollapsed ? "Expand" : "Collapse"}</TooltipContent>
            </Tooltip>

            {/* Delete */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(module.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Resize Handle (Right Edge) */}
        {editing && (
          <div
            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-primary/20 transition-all z-10 flex items-center justify-center rounded-r-lg"
            onMouseDown={handleResizeStart}
          >
            <div className="w-1 h-8 bg-primary/40 rounded-full" />
          </div>
        )}

        {/* Width Indicator (shows during resize) */}
        {isResizing && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium shadow-lg z-30">
            {COLUMN_SPAN_OPTIONS.find(o => o.value === module.column_span)?.label || `${module.column_span} cols`}
          </div>
        )}

        {!isRichTextWithNoHeader && (
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {module.module_type !== 'rich_text' && (
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              )}
              {editing ? (
                <>
                  <Input
                    value={module.title || ""}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder={module.module_type === 'rich_text' ? "Optional title..." : MODULE_LABELS[module.module_type]}
                    className="h-8 flex-1"
                  />
                  <Select
                    value={String(module.column_span)}
                    onValueChange={(value) => onUpdate({ ...module, column_span: Number(value) as ColumnSpan })}
                  >
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMN_SPAN_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <CardTitle className="text-base flex-1">
                  {module.title || MODULE_LABELS[module.module_type]}
                </CardTitle>
              )}
            </div>
          </CardHeader>
        )}
        
        {/* Collapsible Content */}
        {!isCollapsed && (
          <CardContent className={isRichTextWithNoHeader ? "pt-4" : ""}>
            {renderModuleContent()}
          </CardContent>
        )}

        {/* Collapsed Indicator */}
        {isCollapsed && editing && (
          <CardContent className="py-2">
            <div className="text-center text-muted-foreground text-sm">
              <span className="italic">Content collapsed</span>
            </div>
          </CardContent>
        )}
      </Card>
    </TooltipProvider>
  );
}
