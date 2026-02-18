import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, CheckCircle, Eye, History } from 'lucide-react';
import { useState } from 'react';
import { NewsletterSubmissionForm } from './NewsletterSubmissionForm';
import { SubmissionViewer } from './SubmissionViewer';

export function ContributorDashboard() {
  const { user } = useAuth();
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [viewingSubmission, setViewingSubmission] = useState<any>(null);
  const queryClient = useQueryClient();

  // Latest cycle (most recent by due date)
  const { data: latestCycle } = useQuery({
    queryKey: ['latest-newsletter-cycle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_cycles')
        .select('*')
        .order('due_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Department assignments for this user
  const { data: deptAssignments = [] } = useQuery({
    queryKey: ['my-department-assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_assignments')
        .select('*')
        .contains('assignee_ids', [user?.id]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // My newsletter assignments - all assignments for history
  const { data: allAssignments = [], isLoading } = useQuery({
    queryKey: ['my-newsletter-assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_assignments')
        .select(`
          *,
          cycle:newsletter_cycles(*),
          brand:brands(id, name),
          location:locations(id, name)
        `)
        .eq('contributor_id', user?.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Separate active tasks from past submissions
  const activeAssignments = allAssignments.filter((assignment: any) => {
    const cycleStatus = assignment.cycle?.status;
    
    // Active = edition not completed/archived
    if (cycleStatus === 'completed' || cycleStatus === 'archived') {
      return false; // Past editions go to history
    }
    
    return true;
  });

  const pastSubmissions = allAssignments.filter((assignment: any) => {
    const cycleStatus = assignment.cycle?.status;
    const assignmentStatus = assignment.status;
    
    // Past = edition completed/archived AND user submitted
    if (cycleStatus === 'completed' || cycleStatus === 'archived') {
      return assignmentStatus === 'submitted' || assignmentStatus === 'completed';
    }
    
    return false;
  });

  // Create missing assignment on demand
  const createAssignment = useMutation({
    mutationFn: async (department: string) => {
      if (!latestCycle?.id || !user?.id) throw new Error('No active cycle or user');
      const { data, error } = await supabase
        .from('newsletter_assignments')
        .insert({
          cycle_id: latestCycle.id,
          contributor_id: user.id,
          department,
          status: 'in_progress',
        })
        .select(`*, cycle:newsletter_cycles(*)`)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['my-newsletter-assignments', user?.id] });
      setSelectedAssignment(data);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading your tasks...</p>
        </CardContent>
      </Card>
    );
  }

  const potentialDepartments = latestCycle
    ? (deptAssignments as any[])
        .map((d: any) => d.department)
        .filter((dep: string) => {
          if (!dep || dep.length === 0) return false;
          return (activeAssignments as any[]).every(
            (a: any) => !(a.cycle_id === latestCycle.id && a.department === dep && !a.brand_id)
          );
        })
    : [];

  if (viewingSubmission) {
    return (
      <SubmissionViewer
        assignmentId={viewingSubmission.id}
        cycleName={viewingSubmission.cycle?.name}
        department={viewingSubmission.department}
        brandName={viewingSubmission.brand?.name}
        locationName={viewingSubmission.location?.name}
        onBack={() => setViewingSubmission(null)}
      />
    );
  }

  if (selectedAssignment) {
    return (
      <NewsletterSubmissionForm
        assignmentId={selectedAssignment.id}
        cycleId={selectedAssignment.cycle_id}
        department={selectedAssignment.department}
        brandId={selectedAssignment.brand_id}
        locationId={selectedAssignment.location_id}
        brandName={selectedAssignment.brand?.name}
        locationName={selectedAssignment.location?.name}
        onSuccess={() => setSelectedAssignment(null)}
        onCancel={() => setSelectedAssignment(null)}
      />
    );
  }

  const isSubmitted = (status: string) => status === 'submitted' || status === 'completed';

  const renderAssignmentCard = (assignment: any, isPast: boolean = false) => {
    const submitted = isSubmitted(assignment.status);
    
    return (
      <Card key={assignment.id} className={isPast ? 'bg-muted/30' : ''}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h3 className="font-semibold">{assignment.cycle?.name}</h3>
              <p className="text-sm text-muted-foreground">
                Department: {assignment.department}
              </p>
              {assignment.brand && (
                <p className="text-sm font-medium text-primary">
                  {assignment.brand.name}
                  {assignment.location && ` - ${assignment.location.name}`}
                </p>
              )}
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Due: {new Date(assignment.cycle?.due_date).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge
                variant={
                  submitted
                    ? 'success'
                    : assignment.status === 'in_progress'
                    ? 'default'
                    : 'secondary'
                }
              >
                {submitted && <CheckCircle className="h-3 w-3 mr-1" />}
                {assignment.status.replace('_', ' ')}
              </Badge>
              {isPast && submitted ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingSubmission(assignment)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
              ) : submitted ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedAssignment(assignment)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setSelectedAssignment(assignment)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {assignment.status === 'in_progress' ? 'Continue' : 'Start'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Active Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>My Newsletter Tasks</CardTitle>
          <CardDescription>
            Submit your contributions to the company newsletter
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(activeAssignments.length === 0 && potentialDepartments.length === 0) ? (
            <div className="text-center py-8 space-y-2">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">
                No active tasks
              </p>
              <p className="text-sm text-muted-foreground">
                You'll see your tasks here when a new edition is created
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAssignments.map((assignment: any) => renderAssignmentCard(assignment))}

              {latestCycle && potentialDepartments.map((dept: string) => (
                <Card key={`virtual-${dept}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{latestCycle.name}</h3>
                        <p className="text-sm text-muted-foreground">Department: {dept}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Due: {latestCycle?.due_date ? new Date(latestCycle.due_date as any).toLocaleDateString() : 'TBA'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary">not started</Badge>
                        <Button
                          size="sm"
                          onClick={() => createAssignment.mutate(dept)}
                          disabled={createAssignment.isPending}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Start
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Submissions */}
      {pastSubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Past Submissions
            </CardTitle>
            <CardDescription>
              Your completed newsletter contributions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pastSubmissions.map((assignment: any) => renderAssignmentCard(assignment, true))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
