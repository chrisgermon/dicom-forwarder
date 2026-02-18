import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

import { useDepartmentTemplates } from '@/lib/newsletterDepartments';

export function AssignmentManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: templates = [] } = useDepartmentTemplates();
  const DEPARTMENTS = templates.map(t => t.department_name);

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['department-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_assignments')
        .select('*')
        .order('department');
      if (error) throw error;
      return data || [];
    },
  });

  const addAssignee = useMutation({
    mutationFn: async ({ department, userId }: { department: string; userId: string }) => {
      // Find existing assignment
      const existing = assignments.find((a: any) => a.department === department);
      
      if (existing) {
        // Update existing with new assignee
        const newAssignees = [...(existing.assignee_ids || []), userId];
        const { error } = await supabase
          .from('department_assignments')
          .update({ assignee_ids: newAssignees })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('department_assignments')
          .insert({
            department,
            assignee_ids: [userId],
          });
        if (error) throw error;
      }

      // Send assignment notification email
      try {
        const { error: notifyError } = await supabase.functions.invoke(
          'notify-newsletter-assignment',
          { 
            body: { 
              userId,
              department,
            } 
          }
        );
        
        if (notifyError) {
          console.error('Failed to send assignment notification:', notifyError);
          // Don't throw error - assignment succeeded even if email failed
        }
      } catch (err) {
        console.error('Failed to invoke notification function:', err);
        // Don't throw error - assignment succeeded even if email failed
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-assignments'] });
      toast.success('Contributor added and notified via email');
      setDialogOpen(false);
      setSelectedDepartment('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add contributor: ${error.message}`);
    },
  });

  const removeAssignee = useMutation({
    mutationFn: async ({ department, userId }: { department: string; userId: string }) => {
      const existing = assignments.find((a: any) => a.department === department);
      if (!existing) return;

      const newAssignees = (existing.assignee_ids || []).filter((id: string) => id !== userId);
      
      if (newAssignees.length === 0) {
        // Delete the assignment if no assignees left
        const { error } = await supabase
          .from('department_assignments')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Update with remaining assignees
        const { error } = await supabase
          .from('department_assignments')
          .update({ assignee_ids: newAssignees })
          .eq('id', existing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-assignments'] });
      toast.success('Contributor removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove contributor: ${error.message}`);
    },
  });

  const getDepartmentAssignees = (department: string) => {
    const assignment = assignments.find((a: any) => a.department === department);
    if (!assignment || !assignment.assignee_ids) return [];

    return assignment.assignee_ids
      .map((userId: string) => profiles.find((p) => p.id === userId))
      .filter(Boolean);
  };

  const getAvailableProfiles = (department: string) => {
    const assignedIds = getDepartmentAssignees(department).map((p: any) => p.id);
    return profiles.filter((p) => !assignedIds.includes(p.id));
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading department contributors...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Department Contributors</h1>
          <p className="text-muted-foreground">
            Manage who can contribute to each department's newsletter section
          </p>
        </div>

        <div className="space-y-4">
          {DEPARTMENTS.map((department) => {
            const assignees = getDepartmentAssignees(department);

            return (
              <Card key={department} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-3">{department}</h3>
                    <div className="flex flex-wrap gap-2">
                      {assignees.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No contributors assigned</p>
                      ) : (
                        assignees.map((assignee: any) => (
                          <Badge
                            key={assignee.id}
                            variant="secondary"
                            className="gap-1 pr-1"
                          >
                            {assignee.full_name}
                            <button
                              onClick={() =>
                                removeAssignee.mutate({
                                  department,
                                  userId: assignee.id,
                                })
                              }
                              className="ml-1 rounded-full hover:bg-muted p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDepartment(department);
                      setDialogOpen(true);
                    }}
                    disabled={getAvailableProfiles(department).length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contributor
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contributor to {selectedDepartment}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const userId = formData.get('user_id') as string;
              if (userId) {
                addAssignee.mutate({ department: selectedDepartment, userId });
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <Select name="user_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableProfiles(selectedDepartment).map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name} ({profile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addAssignee.isPending}>
                Add Contributor
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
