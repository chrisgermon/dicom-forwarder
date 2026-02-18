import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  X, 
  Plus, 
  Eye, 
  Home,
  ChevronRight,
  Save,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  label: string;
  type: string;
}

interface VisualEditorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  activeSection: string | null;
  onSectionClick: (id: string) => void;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onReset: () => void;
  onAddSection: () => void;
}

export function VisualEditorSidebar({
  isOpen,
  onClose,
  sections,
  activeSection,
  onSectionClick,
  hasUnsavedChanges,
  onSave,
  onReset,
  onAddSection,
}: VisualEditorSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed left-0 top-0 h-screen w-80 bg-background border-r shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-sm">Pages</h2>
            {hasUnsavedChanges && (
              <p className="text-xs text-orange-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-600 rounded-full" />
                Unsaved Changes
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Actions */}
      <div className="p-3 border-b space-y-2">
        <Button
          onClick={onSave}
          disabled={!hasUnsavedChanges}
          className="w-full"
          size="sm"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
        <Button
          onClick={onReset}
          disabled={!hasUnsavedChanges}
          variant="outline"
          className="w-full"
          size="sm"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Sections List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Sections</h3>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6"
              onClick={onAddSection}
              title="Add new section"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => onSectionClick(section.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group hover:bg-accent transition-colors",
                  activeSection === section.id && "bg-accent"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center text-xs",
                    activeSection === section.id ? "border-primary text-primary" : "border-muted-foreground text-muted-foreground"
                  )}>
                    <Eye className="w-3 h-3" />
                  </span>
                  <span>{section.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Click on any section to edit
        </p>
      </div>
    </div>
  );
}
