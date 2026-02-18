import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger } from '@/components/ui/underline-tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Users, Calendar, Eye, Download, Layout, Bell, Loader2, Shield } from 'lucide-react';
import { CycleManagement } from './CycleManagement';
import { AssignmentManagement } from './AssignmentManagement';
import { DepartmentTemplateEditor } from './DepartmentTemplateEditor';
import { SubmissionPreview } from './SubmissionPreview';
import { NewsletterAdminManager } from './NewsletterAdminManager';
import { exportNewsletterToWord } from '@/lib/exportToWord';
import { toast } from 'sonner';

export function AdminDashboard() {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  const handleSendManualReminders = async () => {
    if (!selectedCycleId) {
      toast.error('Please select a newsletter first');
      return;
    }

    const selectedCycle = cycles.find(c => c.id === selectedCycleId);
    if (!selectedCycle) return;

    setIsSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-newsletter-reminders-manual', {
        body: { cycleId: selectedCycleId, sendOwnerSummary: true },
      });

      if (error) throw error;

      const sentCount = data.results?.contributorReminders?.filter((r: any) => r.status === 'sent').length || 0;
      const pendingCount = data.results?.pendingCount || 0;

      if (pendingCount === 0) {
        toast.success('All contributors have already submitted!');
      } else {
        toast.success(`Sent reminders to ${sentCount} contributor(s). Owner summary also sent.`);
      }
    } catch (error: any) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders: ' + error.message);
    } finally {
      setIsSendingReminders(false);
    }
  };

  const handleExportSubmission = async (submissionId: string) => {
    try {
      const { data: submissionData, error: submissionError } = await supabase
        .from('newsletter_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (submissionError) throw submissionError;

      const { data: contributor } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', submissionData.contributor_id)
        .single();

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
        totalEditions: cycles.count || 0,
        totalContributors: assignments.count || 0,
        pendingReview: submissions.data?.length || 0,
      };
    },
  });

  // Fetch all newsletter cycles for the filter dropdown
  const { data: cycles = [] } = useQuery({
    queryKey: ['newsletter-cycles-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_cycles')
        .select('id, name, status, due_date')
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Set the default selected cycle to the active one
  useEffect(() => {
    if (cycles.length > 0 && !selectedCycleId) {
      const activeCycle = cycles.find(c => c.status === 'active');
      setSelectedCycleId(activeCycle?.id || cycles[0].id);
    }
  }, [cycles, selectedCycleId]);

  const { data: submissions = [] } = useQuery({
    queryKey: ['newsletter-submissions', selectedCycleId],
    queryFn: async () => {
      let query = supabase
        .from('newsletter_submissions')
        .select(`
          id, 
          title, 
          department, 
          status, 
          submitted_at, 
          contributor_id,
          brand_id,
          location_id,
          cycle_id
        `)
        .order('submitted_at', { ascending: false });

      // Filter by selected cycle if one is selected
      if (selectedCycleId) {
        query = query.eq('cycle_id', selectedCycleId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const contributorIds = [...new Set(data?.map(s => s.contributor_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', contributorIds.length > 0 ? contributorIds : ['00000000-0000-0000-0000-000000000000']);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      const brandIds = [...new Set(data?.map(s => s.brand_id).filter(Boolean))];
      const locationIds = [...new Set(data?.map(s => s.location_id).filter(Boolean))];
      
      const { data: brands } = brandIds.length > 0 ? await supabase
        .from('brands')
        .select('id, name')
        .in('id', brandIds) : { data: [] };
      
      const { data: locations } = locationIds.length > 0 ? await supabase
        .from('locations')
        .select('id, name')
        .in('id', locationIds) : { data: [] };

      const brandMap = new Map<string, string>(brands?.map(b => [b.id, b.name] as [string, string]) || []);
      const locationMap = new Map<string, string>(locations?.map(l => [l.id, l.name] as [string, string]) || []);

      return data?.map(s => ({
        ...s,
        contributor_name: profileMap.get(s.contributor_id) || 'Unknown',
        brand_name: s.brand_id ? brandMap.get(s.brand_id) : null,
        location_name: s.location_id ? locationMap.get(s.location_id) : null,
      })) || [];
    },
    enabled: !!selectedCycleId || cycles.length > 0,
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
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
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Newsletter Editions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEditions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contributors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalContributors}</div>
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

      {/* Main Admin Tabs */}
      <UnderlineTabs defaultValue="editions" className="w-full">
        <UnderlineTabsList>
          <UnderlineTabsTrigger value="editions">
            <Calendar className="h-4 w-4 mr-2" />
            Editions
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="submissions">
            <FileText className="h-4 w-4 mr-2" />
            Submissions
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="contributors">
            <Users className="h-4 w-4 mr-2" />
            Contributors
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="templates">
            <Layout className="h-4 w-4 mr-2" />
            Templates
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="admins">
            <Shield className="h-4 w-4 mr-2" />
            Admins
          </UnderlineTabsTrigger>
        </UnderlineTabsList>

        <TabsContent value="editions" className="mt-4">
          <CycleManagement onCycleCreated={() => {}} />
        </TabsContent>

        <TabsContent value="submissions" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Submissions</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendManualReminders}
                  disabled={isSendingReminders || !selectedCycleId}
                >
                  {isSendingReminders ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  Send Reminders
                </Button>
                <Select value={selectedCycleId || ''} onValueChange={setSelectedCycleId}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select newsletter..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        <div className="flex items-center gap-2">
                          <span>{cycle.name}</span>
                          {cycle.status === 'active' && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No submissions for this newsletter
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
                    {submissions.map((submission: any) => (
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

        <TabsContent value="contributors" className="mt-4">
          <AssignmentManagement />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <DepartmentTemplateEditor />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="admins" className="mt-4">
          <NewsletterAdminManager />
        </TabsContent>
      </UnderlineTabs>
    </div>
  );
}
