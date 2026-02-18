import { useState, useEffect, useCallback } from "react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  MeasuringStrategy,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageModule, ModuleType, getDefaultContent, ColumnSpan, QuickLinksContent, LinkButtonsContent, QuickLink, LinkButton } from "./types";
import { ModuleCard } from "./ModuleCard";
import { AddModuleButton } from "./AddModuleButton";
import { Button } from "@/components/ui/button";
import { Save, X, Edit, ExternalLink, Printer, Undo2, Eye, EyeOff, Layout, GripVertical } from "lucide-react";
import { DraggableLinkItemData } from "./DraggableLinkItem";
import { GRADIENT_OPTIONS } from "./LinkButtonsModule";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ModuleEditorProps {
  pageId: string;
  /** Whether the current user can edit this page's modules */
  canEdit: boolean;
}

export function ModuleEditor({ pageId, canEdit }: ModuleEditorProps) {
  const [modules, setModules] = useState<PageModule[]>([]);
  const [originalModules, setOriginalModules] = useState<PageModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeItem, setActiveItem] = useState<DraggableLinkItemData | null>(null);
  const [activeModule, setActiveModule] = useState<PageModule | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Track unsaved changes
  useEffect(() => {
    if (editing) {
      const hasChanges = JSON.stringify(modules) !== JSON.stringify(originalModules);
      setHasUnsavedChanges(hasChanges);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [modules, originalModules, editing]);

  useEffect(() => {
    loadModules();
  }, [pageId]);

  const loadModules = async () => {
    try {
      const { data, error } = await supabase
        .from("page_modules")
        .select("*")
        .eq("page_id", pageId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      
      const typedModules = (data || []).map((m: any) => ({
        ...m,
        content: m.content as any,
        module_type: m.module_type as ModuleType,
        column_span: (m.column_span || 12) as ColumnSpan,
        row_index: m.row_index || 0,
      })) as PageModule[];
      setModules(typedModules);
      setOriginalModules(typedModules);
    } catch (error) {
      console.error("Error loading modules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const itemData = active.data.current?.item as DraggableLinkItemData | undefined;
    if (itemData) {
      setActiveItem(itemData);
    } else {
      // It's a module being dragged
      const draggedModule = modules.find(m => m.id === active.id);
      if (draggedModule) {
        setActiveModule(draggedModule);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !active.data.current?.item) return;

    const activeItem = active.data.current.item as DraggableLinkItemData;
    const overId = over.id as string;
    
    // Check if we're over a droppable module zone
    if (overId.startsWith('droppable-')) {
      const targetModuleId = overId.replace('droppable-', '');
      const sourceModuleId = activeItem.sourceModuleId;
      
      if (targetModuleId !== sourceModuleId) {
        // Moving to a different module - handled in dragEnd
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setActiveModule(null);

    if (!over) return;

    const activeItemData = active.data.current?.item as DraggableLinkItemData | undefined;
    
    // Handle module reordering (when dragging modules themselves)
    if (!activeItemData) {
      if (active.id !== over.id) {
        setModules((items) => {
          const oldIndex = items.findIndex((i) => i.id === active.id);
          const newIndex = items.findIndex((i) => i.id === over.id);
          if (oldIndex !== -1 && newIndex !== -1) {
            return arrayMove(items, oldIndex, newIndex);
          }
          return items;
        });
      }
      return;
    }

    // Handle link item dragging
    const overId = over.id as string;
    const sourceModuleId = activeItemData.sourceModuleId;
    
    // Check if dropping on a droppable zone (different module)
    if (overId.startsWith('droppable-')) {
      const targetModuleId = overId.replace('droppable-', '');
      
      if (targetModuleId !== sourceModuleId) {
        // Moving item to a different module
        moveItemBetweenModules(activeItemData, sourceModuleId, targetModuleId);
        return;
      }
    }

    // Check if dropping on another item (same or different module)
    const overItemData = over.data.current?.item as DraggableLinkItemData | undefined;
    if (overItemData) {
      const targetModuleId = overItemData.sourceModuleId;
      
      if (sourceModuleId === targetModuleId) {
        // Same module - reorder
        reorderItemsInModule(sourceModuleId, active.id as string, over.id as string);
      } else {
        // Different module - move item
        moveItemBetweenModules(activeItemData, sourceModuleId, targetModuleId, over.id as string);
      }
    }
  };

  const reorderItemsInModule = (moduleId: string, activeId: string, overId: string) => {
    setModules(prev => prev.map(mod => {
      if (mod.id !== moduleId) return mod;
      
      if (mod.module_type === 'quick_links') {
        const content = mod.content as QuickLinksContent;
        const oldIndex = content.links.findIndex(l => l.id === activeId);
        const newIndex = content.links.findIndex(l => l.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          return {
            ...mod,
            content: { links: arrayMove(content.links, oldIndex, newIndex) },
          };
        }
      } else if (mod.module_type === 'link_buttons') {
        const content = mod.content as LinkButtonsContent;
        const oldIndex = content.buttons.findIndex(b => b.id === activeId);
        const newIndex = content.buttons.findIndex(b => b.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          return {
            ...mod,
            content: { buttons: arrayMove(content.buttons, oldIndex, newIndex) },
          };
        }
      }
      return mod;
    }));
  };

  const moveItemBetweenModules = (
    item: DraggableLinkItemData, 
    sourceModuleId: string, 
    targetModuleId: string,
    insertBeforeId?: string
  ) => {
    setModules(prev => {
      const sourceModule = prev.find(m => m.id === sourceModuleId);
      const targetModule = prev.find(m => m.id === targetModuleId);
      
      if (!sourceModule || !targetModule) return prev;
      
      // Remove from source
      let updatedModules = prev.map(mod => {
        if (mod.id !== sourceModuleId) return mod;
        
        if (mod.module_type === 'quick_links') {
          const content = mod.content as QuickLinksContent;
          return {
            ...mod,
            content: { links: content.links.filter(l => l.id !== item.id) },
          };
        } else if (mod.module_type === 'link_buttons') {
          const content = mod.content as LinkButtonsContent;
          return {
            ...mod,
            content: { buttons: content.buttons.filter(b => b.id !== item.id) },
          };
        }
        return mod;
      });
      
      // Add to target (convert between types if needed)
      updatedModules = updatedModules.map(mod => {
        if (mod.id !== targetModuleId) return mod;
        
        if (mod.module_type === 'quick_links') {
          const content = mod.content as QuickLinksContent;
          const newLink: QuickLink = {
            id: item.id,
            title: item.title,
            url: item.url,
            description: item.description,
            icon: item.icon,
          };
          const links = [...content.links];
          if (insertBeforeId) {
            const insertIndex = links.findIndex(l => l.id === insertBeforeId);
            if (insertIndex !== -1) {
              links.splice(insertIndex, 0, newLink);
            } else {
              links.push(newLink);
            }
          } else {
            links.push(newLink);
          }
          return { ...mod, content: { links } };
        } else if (mod.module_type === 'link_buttons') {
          const content = mod.content as LinkButtonsContent;
          const newButton: LinkButton = {
            id: item.id,
            title: item.title,
            url: item.url,
            gradient: item.gradient || GRADIENT_OPTIONS[content.buttons.length % GRADIENT_OPTIONS.length].value,
          };
          const buttons = [...content.buttons];
          if (insertBeforeId) {
            const insertIndex = buttons.findIndex(b => b.id === insertBeforeId);
            if (insertIndex !== -1) {
              buttons.splice(insertIndex, 0, newButton);
            } else {
              buttons.push(newButton);
            }
          } else {
            buttons.push(newButton);
          }
          return { ...mod, content: { buttons } };
        }
        return mod;
      });
      
      return updatedModules;
    });
  };

  const addModule = (type: ModuleType) => {
    const newModule: PageModule = {
      id: crypto.randomUUID(),
      page_id: pageId,
      module_type: type,
      title: null,
      content: getDefaultContent(type),
      sort_order: modules.length,
      column_span: type === 'link_buttons' ? 6 : type === 'divider' ? 12 : 12,
      row_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setModules([...modules, newModule]);
  };

  const updateModule = (updatedModule: PageModule) => {
    setModules(modules.map((m) => (m.id === updatedModule.id ? updatedModule : m)));
  };

  const deleteModule = (id: string) => {
    setModules(modules.filter((m) => m.id !== id));
  };

  const duplicateModule = useCallback((module: PageModule) => {
    const duplicatedModule: PageModule = {
      ...module,
      id: crypto.randomUUID(),
      title: module.title ? `${module.title} (Copy)` : null,
      sort_order: modules.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content: JSON.parse(JSON.stringify(module.content)), // Deep copy
    };
    
    // Insert after the original
    const index = modules.findIndex(m => m.id === module.id);
    const newModules = [...modules];
    newModules.splice(index + 1, 0, duplicatedModule);
    setModules(newModules);
    toast.success("Module duplicated");
  }, [modules]);

  const moveModuleUp = useCallback((index: number) => {
    if (index <= 0) return;
    setModules(prev => arrayMove(prev, index, index - 1));
  }, []);

  const moveModuleDown = useCallback((index: number) => {
    if (index >= modules.length - 1) return;
    setModules(prev => arrayMove(prev, index, index + 1));
  }, [modules.length]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const removedIds = originalModules
        .filter((om) => !modules.find((m) => m.id === om.id))
        .map((m) => m.id);

      if (removedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("page_modules")
          .delete()
          .in("id", removedIds);
        if (deleteError) throw deleteError;
      }

      const modulesToUpsert = modules.map((m, index) => ({
        id: m.id,
        page_id: m.page_id,
        module_type: m.module_type as string,
        title: m.title,
        content: m.content as any,
        sort_order: index,
        column_span: m.column_span,
        row_index: m.row_index,
      }));

      if (modulesToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from("page_modules")
          .upsert(modulesToUpsert as any);
        if (upsertError) throw upsertError;
      }

      await loadModules();
      setEditing(false);
      toast.success("Modules saved successfully");
    } catch (error) {
      console.error("Error saving modules:", error);
      toast.error("Failed to save modules");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to discard them?");
      if (!confirmed) return;
    }
    setModules(originalModules);
    setEditing(false);
  };

  const handleUndo = () => {
    setModules(originalModules);
    toast.info("Changes reverted");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Editor Controls */}
      {canEdit && (
        <Card className="p-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Layout className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-sm">Page Modules</span>
              {editing && hasUnsavedChanges && (
                <span className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                  Unsaved changes
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {editing && (
                <>
                  {/* Preview Toggle */}
                  <div className="flex items-center gap-2 mr-2">
                    <Switch
                      id="preview-mode"
                      checked={showPreview}
                      onCheckedChange={setShowPreview}
                    />
                    <Label htmlFor="preview-mode" className="text-sm cursor-pointer flex items-center gap-1">
                      {showPreview ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      Preview
                    </Label>
                  </div>

                  {hasUnsavedChanges && (
                    <Button variant="outline" size="sm" onClick={handleUndo}>
                      <Undo2 className="h-4 w-4 mr-1" />
                      Undo
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving || !hasUnsavedChanges}>
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </>
              )}
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Modules
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Add Module Button - Top */}
      {editing && !showPreview && (
        <AddModuleButton onAdd={addModule} />
      )}

      {/* Modules List */}
      {modules.length === 0 && !editing ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No content modules yet.</p>
          {canEdit && (
            <p className="text-sm mt-2">Click "Edit Modules" to add content.</p>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
        >
          <SortableContext
            items={modules.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-12 gap-4">
              {modules.map((module, index) => (
                <div 
                  key={module.id}
                  className={`col-span-12 md:col-span-${module.column_span}`}
                  style={{ 
                    gridColumn: `span ${module.column_span} / span ${module.column_span}` 
                  }}
                >
                  <ModuleCard
                    module={module}
                    editing={editing && !showPreview}
                    onUpdate={updateModule}
                    onDelete={deleteModule}
                    onDuplicate={duplicateModule}
                    onMoveUp={() => moveModuleUp(index)}
                    onMoveDown={() => moveModuleDown(index)}
                    isFirst={index === 0}
                    isLast={index === modules.length - 1}
                  />
                </div>
              ))}
            </div>
          </SortableContext>

          {/* Drag Overlay for Items */}
          <DragOverlay dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}>
            {activeItem ? (
              <div className="opacity-90 transform scale-105 shadow-2xl">
                {activeItem.type === 'link_button' ? (
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-medium text-sm bg-gradient-to-r ${activeItem.gradient || 'from-blue-500 to-blue-600'} shadow-lg`}
                  >
                    <Printer className="h-4 w-4" />
                    {activeItem.title}
                  </div>
                ) : (
                  <div className="bg-card border rounded-lg p-4 shadow-lg">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ExternalLink className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{activeItem.title}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : activeModule ? (
              <Card className="opacity-90 shadow-2xl p-4 border-2 border-primary/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  {activeModule.title || activeModule.module_type}
                </div>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

    </div>
  );
}
