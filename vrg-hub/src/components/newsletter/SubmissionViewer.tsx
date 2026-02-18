import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Calendar, Building, MapPin } from 'lucide-react';
import { useDepartmentTemplate } from '@/lib/newsletterDepartments';
import DOMPurify from 'dompurify';

interface SectionData {
  section: string;
  content: string;
  isRequired: boolean;
}

interface SubmissionViewerProps {
  assignmentId: string;
  cycleName?: string;
  department: string;
  brandName?: string | null;
  locationName?: string | null;
  onBack: () => void;
}

export function SubmissionViewer({
  assignmentId,
  cycleName,
  department,
  brandName,
  locationName,
  onBack,
}: SubmissionViewerProps) {
  const { data: submission, isLoading } = useQuery({
    queryKey: ['newsletter-submission-view', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: departmentTemplate, isLoading: templateLoading } = useDepartmentTemplate(department);

  if (isLoading || templateLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading submission...</p>
        </CardContent>
      </Card>
    );
  }

  if (!submission) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">Submission not found</p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sectionsData = (submission.sections_data as unknown as SectionData[]) || [];
  const templateSections = (departmentTemplate?.sections as any[]) || [];

  // Create a map for easy lookup of section names
  const sectionNameMap = templateSections.reduce((acc, section) => {
    acc[section.key] = section.name;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Button onClick={onBack} variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Tasks
                </Button>
              </div>
              <CardTitle className="text-xl">
                {cycleName || 'Newsletter Submission'}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {department}
                </span>
                {brandName && (
                  <span className="flex items-center gap-1">
                    <Badge variant="outline">{brandName}</Badge>
                  </span>
                )}
                {locationName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {locationName}
                  </span>
                )}
                {submission.submitted_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Submitted
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* No Update Notice */}
      {submission.no_update_this_month && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="py-4">
            <p className="text-amber-700 dark:text-amber-400 font-medium">
              No update submitted for this edition
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sections Content */}
      {!submission.no_update_this_month && sectionsData.length > 0 && (() => {
        // Check if any section has actual content
        const sectionsWithContent = sectionsData.filter((section) => {
          const content = section.content?.trim() || '';
          return content !== '' && content !== '<p><br></p>' && content !== '<p></p>';
        });

        if (sectionsWithContent.length === 0) {
          return (
            <Card className="border-muted">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  This submission was marked as complete but no content was provided in any section.
                </p>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="space-y-4">
            {sectionsData.map((section) => {
              const sectionName = sectionNameMap[section.section] || section.section;
              const content = section.content?.trim() || '';
              const hasContent = content !== '' && content !== '<p><br></p>' && content !== '<p></p>';
              
              if (!hasContent) return null;

              return (
                <Card key={section.section}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">
                      {sectionName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: DOMPurify.sanitize(section.content) 
                      }}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* Legacy content fallback */}
      {!submission.no_update_this_month && sectionsData.length === 0 && submission.content && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(submission.content) 
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Back button at bottom */}
      <div className="flex justify-center">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Tasks
        </Button>
      </div>
    </div>
  );
}
