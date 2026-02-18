import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { exportCycleToWord, type CycleSubmission } from '@/lib/exportToWord';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATUS_OPTIONS = ['planning', 'active', 'in_review', 'completed', 'archived'];

export function CycleManagement({ onCycleCreated }: { onCycleCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ['newsletter-cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_cycles')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Save mutation
  const saveCycle = useMutation({
    mutationFn: async (cycleData: any) => {
      const editingId = typeof editing === 'object' ? editing?.id : editing;
      let cycleId = editingId;
      
      if (editingId) {
        const { error } = await supabase
          .from("newsletter_cycles")
          .update(cycleData)
          .eq("id", editingId);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("newsletter_cycles")
          .insert(cycleData)
          .select()
          .single();
        
        if (error) throw error;
        cycleId = data.id;

        // Fetch all department assignments
        const { data: deptAssignments, error: deptError } = await supabase
          .from('department_assignments')
          .select('*');

        if (deptError) {
          console.error('Failed to fetch department assignments:', deptError);
        } else if (deptAssignments && deptAssignments.length > 0) {
          // Fetch department templates to check which need brand/location
          const { data: templates } = await supabase
            .from('department_section_templates')
            .select('department_name, requires_brand_location');
          
          const templateMap = new Map(templates?.map(t => [t.department_name, t.requires_brand_location]) || []);

          // Fetch active brands and locations for Technical Partners
          const { data: brands } = await supabase
            .from('brands')
            .select('id, name')
            .eq('is_active', true)
            .order('name');

          const { data: locations } = await supabase
            .from('locations')
            .select('id, name, brand_id')
            .eq('is_active', true)
            .order('name');

          // Create newsletter_assignments for each department assignee
          const newsletterAssignments = [];
          for (const dept of deptAssignments) {
            if (dept.assignee_ids && dept.assignee_ids.length > 0) {
              const requiresBrandLocation = templateMap.get(dept.department) === true;
              
              for (const userId of dept.assignee_ids) {
                if (requiresBrandLocation && brands && brands.length > 0) {
                  // For Technical Partners: create one assignment per brand/location combination
                  for (const brand of brands) {
                    const brandLocations = locations?.filter(l => l.brand_id === brand.id) || [];
                    
                    if (brandLocations.length > 0) {
                      for (const location of brandLocations) {
                        newsletterAssignments.push({
                          cycle_id: cycleId,
                          contributor_id: userId,
                          department: dept.department,
                          brand_id: brand.id,
                          location_id: location.id,
                          status: 'pending',
                        });
                      }
                    } else {
                      // Brand without locations - create one assignment for the brand
                      newsletterAssignments.push({
                        cycle_id: cycleId,
                        contributor_id: userId,
                        department: dept.department,
                        brand_id: brand.id,
                        location_id: null,
                        status: 'pending',
                      });
                    }
                  }
                } else {
                  // Regular departments: one assignment per user
                  newsletterAssignments.push({
                    cycle_id: cycleId,
                    contributor_id: userId,
                    department: dept.department,
                    brand_id: null,
                    location_id: null,
                    status: 'pending',
                  });
                }
              }
            }
          }

          if (newsletterAssignments.length > 0) {
            const { error: assignError } = await supabase
              .from('newsletter_assignments')
              .insert(newsletterAssignments);
            
            if (assignError) {
              console.error('Failed to create newsletter assignments:', assignError);
            } else {
              // Send individual assignment notifications for any new assignments
              // Group by user to send one email per user with unique departments only
              const userDepartments = new Map<string, Set<string>>();
              for (const assignment of newsletterAssignments) {
                const userId = assignment.contributor_id;
                const dept = assignment.department;
                if (!userDepartments.has(userId)) {
                  userDepartments.set(userId, new Set());
                }
                userDepartments.get(userId)!.add(dept);
              }

              // Send notification for each user's unique departments
              for (const [userId, departmentsSet] of userDepartments.entries()) {
                for (const department of departmentsSet) {
                  try {
                    await supabase.functions.invoke('notify-newsletter-assignment', {
                      body: { userId, department }
                    });
                  } catch (notifyErr) {
                    console.error(`Failed to notify user ${userId} for ${department}:`, notifyErr);
                  }
                }
              }
            }
          }
        }
      }
      
      return cycleId;
    },
    onSuccess: () => {
      const editingId = typeof editing === 'object' ? editing?.id : editing;
      queryClient.invalidateQueries({ queryKey: ["newsletter-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["newsletter-assignments"] });
      toast.success(
        editingId 
          ? "Edition updated successfully."
          : "Edition created and contributors notified."
      );
      setOpen(false);
      setEditing(null);
      
      if (!editingId && onCycleCreated) {
        onCycleCreated();
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save cycle");
    },
  });

  const deleteCycle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('newsletter_cycles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-cycles'] });
      toast.success('Edition deleted');
    },
    onError: () => {
      toast.error('Failed to delete edition');
    },
  });

  const handleExportCycle = async (cycleId: string) => {
    try {
      // Fetch all submissions for this cycle
      const { data: submissions, error: submissionsError } = await supabase
        .from('newsletter_submissions')
        .select('*')
        .eq('cycle_id', cycleId)
        .order('department');

      if (submissionsError) throw submissionsError;

      if (!submissions || submissions.length === 0) {
        toast.error('No submissions found for this edition');
        return;
      }

      // Fetch all contributor profiles
      const contributorIds = [...new Set(submissions.map(s => s.contributor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', contributorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Fetch all department templates
      const departments = [...new Set(submissions.map(s => s.department))];
      const { data: templates } = await supabase
        .from('department_section_templates')
        .select('*')
        .in('department_name', departments);

      const templateMap = new Map(templates?.map(t => [t.department_name, t.sections]) || []);

      // Get cycle info
      const cycle = cycles.find(c => c.id === cycleId);
      const cycleName = cycle?.name || 'Newsletter';

      // Prepare submissions data
      const cycleSubmissions: CycleSubmission[] = submissions.map(submission => ({
        title: submission.title,
        department: submission.department,
        contributorName: profileMap.get(submission.contributor_id) || 'Unknown',
        sectionsData: (submission.sections_data || []) as any[],
        departmentSections: (templateMap.get(submission.department) as any[]) || [],
        noUpdateThisMonth: submission.no_update_this_month || false,
      }));

      // Export all submissions as one document
      await exportCycleToWord(cycleName, cycleSubmissions);

      toast.success('Edition exported to Word document');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export edition');
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cycleData = {
      name: formData.get('name') as string,
      month: parseInt(formData.get('month') as string),
      year: parseInt(formData.get('year') as string),
      due_date: formData.get('due_date') as string,
      status: formData.get('status') as string,
      notes: formData.get('notes') as string,
      created_by: user?.id,
    };
    saveCycle.mutate(cycleData);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Newsletter Editions</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4 mr-2" />
                New Edition
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit' : 'Create'} Newsletter Edition</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Edition Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={typeof editing === 'object' ? editing?.name : ''}
                    placeholder="e.g., January 2024 Newsletter"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="month">Month *</Label>
                    <Select name="month" defaultValue={typeof editing === 'object' ? editing?.month?.toString() : '1'} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, idx) => (
                          <SelectItem key={idx} value={(idx + 1).toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      name="year"
                      type="number"
                      defaultValue={typeof editing === 'object' ? editing?.year : new Date().getFullYear()}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    name="due_date"
                    type="date"
                    defaultValue={typeof editing === 'object' ? editing?.due_date : ''}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select name="status" defaultValue={typeof editing === 'object' ? editing?.status : 'planning'} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={typeof editing === 'object' ? editing?.notes : ''}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveCycle.isPending}>
                    Save
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {cycles.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No editions created yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((cycle: any) => (
                <TableRow key={cycle.id}>
                  <TableCell className="font-medium">{cycle.name}</TableCell>
                  <TableCell>
                    {MONTHS[cycle.month - 1]} {cycle.year}
                  </TableCell>
                  <TableCell>{new Date(cycle.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={cycle.status === 'active' ? 'default' : 'secondary'}>
                      {cycle.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportCycle(cycle.id)}
                        title="Export all submissions to Word"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(cycle);
                          setOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete cycle "${cycle.name}"?`)) {
                            deleteCycle.mutate(cycle.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
