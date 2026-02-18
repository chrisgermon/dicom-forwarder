import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, GripVertical, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Section {
  name: string;
  key: string;
  isRequired: boolean;
}

function SortableSection({ 
  section, 
  onEdit, 
  onDelete 
}: { 
  section: Section; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{section.name}</span>
          {section.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
        </div>
        <span className="text-xs text-muted-foreground">{section.key}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function DepartmentTemplateEditor() {
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['department-section-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_section_templates')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, sections }: { id: string; sections: Section[] }) => {
      const { error } = await supabase
        .from('department_section_templates')
        .update({ sections: sections as any })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-section-templates'] });
      toast.success('Template updated');
    },
    onError: () => toast.error('Failed to update template'),
  });

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || !selectedDepartment) return;

    const sections = selectedDepartment.sections as unknown as Section[];
    const oldIndex = sections.findIndex((s: Section) => s.key === active.id);
    const newIndex = sections.findIndex((s: Section) => s.key === over.id);

    if (oldIndex !== newIndex) {
      const newSections = arrayMove(sections, oldIndex, newIndex);
      updateTemplate.mutate({ id: selectedDepartment.id, sections: newSections });
      setSelectedDepartment({ ...selectedDepartment, sections: newSections });
    }
  };

  const handleAddSection = (sectionData: Section) => {
    if (!selectedDepartment) return;
    const sections = (selectedDepartment.sections as unknown as Section[]) || [];
    const newSections = [...sections, sectionData];
    updateTemplate.mutate({ id: selectedDepartment.id, sections: newSections });
    setSelectedDepartment({ ...selectedDepartment, sections: newSections });
    setSectionDialogOpen(false);
    setEditingSection(null);
  };

  const handleEditSection = (sectionData: Section) => {
    if (!selectedDepartment || !editingSection) return;
    const sections = selectedDepartment.sections as unknown as Section[];
    const newSections = sections.map((s: Section) => 
      s.key === editingSection.key ? sectionData : s
    );
    updateTemplate.mutate({ id: selectedDepartment.id, sections: newSections });
    setSelectedDepartment({ ...selectedDepartment, sections: newSections });
    setSectionDialogOpen(false);
    setEditingSection(null);
  };

  const handleDeleteSection = (sectionKey: string) => {
    if (!selectedDepartment) return;
    if (!confirm('Delete this section?')) return;
    const sections = selectedDepartment.sections as unknown as Section[];
    const newSections = sections.filter((s: Section) => s.key !== sectionKey);
    updateTemplate.mutate({ id: selectedDepartment.id, sections: newSections });
    setSelectedDepartment({ ...selectedDepartment, sections: newSections });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Department Section Templates</h2>
        <p className="text-muted-foreground">
          Configure the sections for each department's newsletter submissions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className={`cursor-pointer transition-colors ${
              selectedDepartment?.id === template.id ? 'border-primary' : ''
            }`}
            onClick={() => setSelectedDepartment(template)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{template.department_name}</span>
                <Badge variant="secondary">
                  {((template.sections as unknown as Section[]) || []).length} sections
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {selectedDepartment && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedDepartment.department_name} - Sections</CardTitle>
              <Button 
                onClick={() => {
                  setEditingSection(null);
                  setSectionDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={(selectedDepartment.sections as unknown as Section[]).map((s: Section) => s.key)}
                strategy={verticalListSortingStrategy}
              >
                {((selectedDepartment.sections as unknown as Section[]) || []).map((section: Section) => (
                  <SortableSection
                    key={section.key}
                    section={section}
                    onEdit={() => {
                      setEditingSection(section);
                      setSectionDialogOpen(true);
                    }}
                    onDelete={() => handleDeleteSection(section.key)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      )}

      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? 'Edit' : 'Add'} Section</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const sectionData: Section = {
                name: formData.get('name') as string,
                key: formData.get('key') as string,
                isRequired: formData.get('isRequired') === 'on',
              };
              if (editingSection) {
                handleEditSection(sectionData);
              } else {
                handleAddSection(sectionData);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Section Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingSection?.name}
                placeholder="e.g., System performance"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key">Section Key * (no spaces, lowercase)</Label>
              <Input
                id="key"
                name="key"
                defaultValue={editingSection?.key}
                placeholder="e.g., system_performance"
                pattern="[a-z_]+"
                disabled={!!editingSection}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRequired"
                name="isRequired"
                defaultChecked={editingSection?.isRequired}
              />
              <Label htmlFor="isRequired">Required section</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setSectionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSection ? 'Update' : 'Add'} Section
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
