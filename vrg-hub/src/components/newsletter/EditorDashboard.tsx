import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger } from '@/components/ui/underline-tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Users, Calendar, Eye, Download } from 'lucide-react';
import { CycleManagement } from './CycleManagement';
import { SubmissionPreview } from './SubmissionPreview';
import { exportNewsletterToWord } from '@/lib/exportToWord';
import { toast } from 'sonner';

export function EditorDashboard() {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const handleExportSubmission = async (submissionId: string) => {
    try {
      // Fetch submission data
      const { data: submissionData, error: submissionError } = await supabase
        .from('newsletter_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (submissionError) throw submissionError;

      // Fetch contributor profile
      const { data: contributor } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', submissionData.contributor_id)
        .single();

      // Fetch department template
      const { data: departmentTemplate } = await supabase
        .from('department_section_templates')
        .select('*')
        .eq('department_name', submissionData.department)
        .single();

      const departmentSections = (departmentTemplate?.sections as any[]) || [];
      const sectionsData = (submissionData.sections_data || []) as any[];

      await exportNewsletterToWord(
        submissionData.title,
        submissionData.department,
        contributor?.full_name || 'Unknown',
        sectionsData,
        departmentSections,
        submissionData.no_update_this_month
      );
      
      toast.success('Newsletter exported to Word document');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export newsletter');
    }
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: async () => {
      const [cycles, assignments, submissions] = await Promise.all([
        supabase.from('newsletter_cycles').select('id', { count: 'exact', head: true }),
        supabase.from('newsletter_assignments').select('id', { count: 'exact', head: true }),
        supabase.from('newsletter_submissions').select('id, status').eq('status', 'submitted'),
      ]);

      return {
        totalCycles: cycles.count || 0,
        totalAssignments: assignments.count || 0,
        pendingReview: submissions.data?.length || 0,
      };
    },
  });

  const { data: recentSubmissions = [] } = useQuery({
    queryKey: ['newsletter-submissions-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_submissions')
        .select(`
          id, 
          title, 
          department, 
          status, 
          submitted_at, 
          contributor_id,
          brand_id,
          location_id
        `)
        .order('submitted_at', { ascending: false })
        .limit(10);
      if (error) throw error;

      // Fetch contributor names separately
      const contributorIds = [...new Set(data?.map(s => s.contributor_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', contributorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Fetch brands and locations
      const brandIds = [...new Set(data?.map(s => s.brand_id).filter(Boolean))];
      const locationIds = [...new Set(data?.map(s => s.location_id).filter(Boolean))];
      
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name')
        .in('id', brandIds);
      
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
        .in('id', locationIds);

      const brandMap = new Map(brands?.map(b => [b.id, b.name]) || []);
      const locationMap = new Map(locations?.map(l => [l.id, l.name]) || []);

      return data?.map(s => ({
        ...s,
        contributor_name: profileMap.get(s.contributor_id) || 'Unknown',
        brand_name: s.brand_id ? brandMap.get(s.brand_id) : null,
        location_name: s.location_id ? locationMap.get(s.location_id) : null,
      })) || [];
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (selectedSubmissionId) {
    return (
      <SubmissionPreview 
        submissionId={selectedSubmissionId} 
        onClose={() => setSelectedSubmissionId(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cycles</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCycles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAssignments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingReview}</div>
            {stats?.pendingReview && stats.pendingReview > 0 && (
              <Badge variant="destructive" className="mt-2">
                Needs Attention
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <UnderlineTabs defaultValue="cycles" className="w-full">
        <UnderlineTabsList>
          <UnderlineTabsTrigger value="cycles">Cycles</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="submissions">Recent Submissions</UnderlineTabsTrigger>
        </UnderlineTabsList>

        <TabsContent value="cycles">
          <CycleManagement onCycleCreated={() => {}} />
        </TabsContent>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSubmissions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No submissions yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Contributor</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Company/Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSubmissions.map((submission: any) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">{submission.title}</TableCell>
                        <TableCell>{submission.contributor_name}</TableCell>
                        <TableCell>{submission.department}</TableCell>
                        <TableCell>
                          {submission.brand_name ? (
                            <span className="text-sm">
                              {submission.brand_name}
                              {submission.location_name && <span className="text-muted-foreground"> • {submission.location_name}</span>}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              submission.status === 'approved'
                                ? 'default'
                                : submission.status === 'submitted'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {submission.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {submission.submitted_at
                            ? new Date(submission.submitted_at).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExportSubmission(submission.id)}
                              title="Export to Word"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedSubmissionId(submission.id)}
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
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
        </TabsContent>
      </UnderlineTabs>
    </div>
  );
}
