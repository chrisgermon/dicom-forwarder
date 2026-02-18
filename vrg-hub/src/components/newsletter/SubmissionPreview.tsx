import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, CheckCircle, XCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
// getDepartmentSections not currently used - using database templates instead
import { exportNewsletterToWord } from '@/lib/exportToWord';
import { sanitizeRichHtml } from '@/lib/sanitizer';

interface SectionData {
  section: string;
  content: string;
  isRequired: boolean;
}

export function SubmissionPreview({
  submissionId,
  onClose,
}: {
  submissionId: string;
  onClose: () => void;
}) {
  const [reviewNotes, setReviewNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: submission, isLoading } = useQuery({
    queryKey: ['newsletter-submission', submissionId],
    queryFn: async () => {
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

      // Fetch reviewer profile if exists
      let reviewer = null;
      if (submissionData.reviewed_by) {
        const { data: reviewerData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', submissionData.reviewed_by)
          .single();
        reviewer = reviewerData;
      }

      return {
        ...submissionData,
        contributor,
        reviewer
      };
    },
  });

  // Fetch department template to get section names (must be before early returns)
  const { data: departmentTemplate } = useQuery({
    queryKey: ['department-template', submission?.department],
    queryFn: async () => {
      if (!submission?.department) return null;
      const { data, error } = await supabase
        .from('department_section_templates')
        .select('*')
        .eq('department_name', submission.department)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!submission?.department,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: 'approved' | 'rejected') => {
      const { error } = await supabase
        .from('newsletter_submissions')
        .update({
          status,
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', submissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-submission', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-submissions'] });
      toast.success('Submission status updated');
      onClose();
    },
    onError: () => toast.error('Failed to update submission'),
  });

  const handleExportToWord = async () => {
    try {
      const departmentSections = (departmentTemplate?.sections as any[]) || [];
      await exportNewsletterToWord(
        submission.title,
        submission.department,
        submission.contributor?.full_name || 'Unknown',
        sectionsData,
        departmentSections,
        submission.no_update_this_month
      );
      toast.success('Newsletter exported to Word document');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export to Word document');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!submission) return <div>Submission not found</div>;

  const sectionsData = (submission.sections_data || []) as unknown as SectionData[];

  const departmentSections = (departmentTemplate?.sections as any[]) || [];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle>{submission.title}</CardTitle>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <span>{submission.contributor?.full_name}</span>
              <span>•</span>
              <span>{submission.department}</span>
              <Badge variant={
                submission.status === 'approved' ? 'default' :
                submission.status === 'rejected' ? 'destructive' :
                'secondary'
              }>
                {submission.status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportToWord}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export to Word
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {submission.no_update_this_month ? (
          <div className="bg-muted/30 p-4 rounded-lg text-center">
            <p className="text-muted-foreground">No updates this month</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sectionsData.map((sectionData) => {
              const section = departmentSections.find((s: any) => s.key === sectionData.section);
              if (!section || !sectionData.content) return null;

              return (
                <div key={sectionData.section} className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    {section.name}
                    {section.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                  </h3>
                  <div 
                    className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(sectionData.content) }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {submission.status === 'submitted' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="review_notes">Review Notes (Optional)</Label>
              <Textarea
                id="review_notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add feedback or notes for the contributor..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => updateStatus.mutate('rejected')}
                disabled={updateStatus.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Request Changes
              </Button>
              <Button
                onClick={() => updateStatus.mutate('approved')}
                disabled={updateStatus.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </div>
          </>
        )}

        {submission.status === 'rejected' && submission.review_notes && (
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
            <h4 className="font-semibold text-destructive mb-2">Review Notes</h4>
            <p className="text-sm">{submission.review_notes}</p>
          </div>
        )}

        {submission.status === 'approved' && submission.review_notes && (
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 p-4 rounded-lg">
            <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">Review Notes</h4>
            <p className="text-sm">{submission.review_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
