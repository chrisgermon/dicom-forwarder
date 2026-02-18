import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { toast } from 'sonner';
import { Send, CheckCircle } from 'lucide-react';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { useDepartmentTemplate } from '@/lib/newsletterDepartments';
// Select components not currently used
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

interface SectionData {
  section: string;
  content: string;
  isRequired: boolean;
}

export function NewsletterSubmissionForm({ 
  assignmentId, 
  cycleId, 
  department,
  brandId,
  locationId,
  brandName,
  locationName,
  onSuccess,
  onCancel: _onCancel
}: { 
  assignmentId: string; 
  cycleId: string; 
  department: string;
  brandId?: string | null;
  locationId?: string | null;
  brandName?: string | null;
  locationName?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sectionsData, setSectionsData] = useState<SectionData[]>([]);
  const [noUpdateThisMonth, setNoUpdateThisMonth] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brandId || '');
  const [selectedLocationId, setSelectedLocationId] = useState<string>(locationId || '');
  const [_isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch department template sections from database
  const { data: departmentTemplate, isLoading: templateLoading } = useDepartmentTemplate(department);

  // Fetch brands and locations for Technical Partners when not pre-assigned
  const { data: brands = [] } = useQuery({
    queryKey: ['active-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: departmentTemplate?.requires_brand_location && !brandId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['active-locations', selectedBrandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, brand_id')
        .eq('is_active', true)
        .eq('brand_id', selectedBrandId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: departmentTemplate?.requires_brand_location && !brandId && !!selectedBrandId,
  });

  // Initialize sections data from template
  useEffect(() => {
    if (departmentTemplate?.sections) {
      const sections = departmentTemplate.sections as any[];
      const initialSections = sections.map(section => ({
        section: section.key,
        content: '',
        isRequired: section.isRequired,
      }));
      setSectionsData(initialSections);
    }
  }, [departmentTemplate]);

  const { data: assignment } = useQuery({
    queryKey: ['newsletter-assignment', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_assignments')
        .select('*, cycle:newsletter_cycles(*)')
        .eq('id', assignmentId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Check if we're before the deadline
  const isBeforeDeadline = () => {
    if (!assignment?.cycle?.due_date) return true;
    const dueDate = new Date(assignment.cycle.due_date);
    const now = new Date();
    return now <= dueDate;
  };

  const { data: existingSubmission, isLoading } = useQuery({
    queryKey: ['newsletter-submission', assignmentId],
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

  useEffect(() => {
    if (existingSubmission) {
      setNoUpdateThisMonth(existingSubmission.no_update_this_month || false);
      
      if (existingSubmission.sections_data) {
        setSectionsData(existingSubmission.sections_data as unknown as SectionData[]);
      }
    }
  }, [existingSubmission]);

  const saveSubmission = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      if (!user?.id) {
        throw new Error('You must be signed in to submit');
      }

      // Validate brand/location for Technical Partners if required
      if (departmentTemplate?.requires_brand_location && !brandId) {
        if (!selectedBrandId || !selectedLocationId) {
          throw new Error('Please select a brand and location');
        }
      }

      // Generate default title from department and cycle
      const defaultTitle = assignment?.cycle?.name 
        ? `${department} - ${assignment.cycle.name}`
        : `${department} Submission`;

      const submissionData = {
        assignment_id: assignmentId,
        cycle_id: cycleId,
        contributor_id: user.id,
        department,
        brand_id: brandId || selectedBrandId || null,
        location_id: locationId || selectedLocationId || null,
        title: defaultTitle,
        content: '', // Keep for backward compatibility
        sections_data: sectionsData as any,
        no_update_this_month: noUpdateThisMonth,
        status,
        submitted_at: status === 'submitted' ? new Date().toISOString() : null,
      };

      if (existingSubmission) {
        const { error } = await supabase
          .from('newsletter_submissions')
          .update(submissionData)
          .eq('id', existingSubmission.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('newsletter_submissions')
          .insert(submissionData);
        if (error) throw error;
      }

      if (status === 'submitted') {
        await supabase
          .from('newsletter_assignments')
          .update({ 
            status: 'submitted',
            submitted_at: new Date().toISOString()
          })
          .eq('id', assignmentId);

        // Notify cycle owner of submission (don't await - run in background)
        try {
          const { data: submission } = await supabase
            .from('newsletter_submissions')
            .select('id')
            .eq('assignment_id', assignmentId)
            .single();

          if (submission?.id) {
            supabase.functions.invoke('notify-newsletter-owner-submission', {
              body: { 
                submissionId: submission.id,
                cycleId: cycleId 
              }
            }).catch(err => console.error('Failed to notify owner:', err));
          }
        } catch (err) {
          console.error('Failed to trigger owner notification:', err);
        }
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-submission', assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-assignments'] });
      setLastSaved(new Date());
      toast.success(status === 'submitted' ? 'Submission sent!' : 'Draft saved');
      if (status === 'submitted' && onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Auto-save functionality
  const performAutoSave = useCallback(async () => {
    if (!user?.id || noUpdateThisMonth) return;
    
    setIsSaving(true);
    try {
      const defaultTitle = `${department} - ${assignment?.cycle?.name || "Newsletter"}`;
      const submissionData = {
        assignment_id: assignmentId,
        cycle_id: cycleId,
        contributor_id: user.id,
        department,
        brand_id: brandId || selectedBrandId || null,
        location_id: locationId || selectedLocationId || null,
        title: defaultTitle,
        content: '',
        sections_data: sectionsData as any,
        no_update_this_month: false,
        status: existingSubmission?.status || 'draft',
      };

      // Save to localStorage as backup
      localStorage.setItem(`newsletter_draft_${assignmentId}`, JSON.stringify({
        sectionsData,
        selectedBrandId,
        selectedLocationId,
        timestamp: new Date().toISOString()
      }));

      if (existingSubmission) {
        await supabase
          .from('newsletter_submissions')
          .update(submissionData)
          .eq('id', existingSubmission.id);
      } else {
        await supabase
          .from('newsletter_submissions')
          .insert(submissionData);
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['newsletter-submission', assignmentId] });
    } catch (error: any) {
      console.error('Auto-save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, assignmentId, cycleId, department, brandId, selectedBrandId, selectedLocationId, sectionsData, assignment?.cycle?.name, noUpdateThisMonth, existingSubmission, queryClient]);

  // Debounced auto-save
  useEffect(() => {
    if (hasUnsavedChanges && !noUpdateThisMonth && sectionsData.length > 0) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        performAutoSave();
      }, 2500);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, noUpdateThisMonth, performAutoSave, sectionsData.length]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(`newsletter_draft_${assignmentId}`);
    if (savedDraft && !existingSubmission && sectionsData.length > 0) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.sectionsData && draft.sectionsData.length > 0) {
          setSectionsData(draft.sectionsData);
          setSelectedBrandId(draft.selectedBrandId || '');
          setSelectedLocationId(draft.selectedLocationId || '');
          toast.info('Restored unsaved draft from local storage');
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, [assignmentId, existingSubmission, sectionsData.length]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSectionChange = (sectionKey: string, content: string) => {
    setSectionsData(prev => 
      prev.map(section => 
        section.section === sectionKey 
          ? { ...section, content }
          : section
      )
    );
    setHasUnsavedChanges(true);
    
    // Clear validation error for this field
    if (validationErrors[sectionKey]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[sectionKey];
        return newErrors;
      });
    }
  };

  const handleSaveDraft = () => {
    performAutoSave();
    toast.success("Draft saved successfully");
  };

  const handleSubmit = () => {
    // Validate brand/location for Technical Partners
    if (departmentTemplate?.requires_brand_location && !brandId) {
      if (!selectedBrandId) {
        toast.error('Please select a brand');
        return;
      }
      if (!selectedLocationId) {
        toast.error('Please select a location');
        return;
      }
    }

    const requiredSections = sectionsData.filter(s => s.isRequired);
    const missingRequired = requiredSections.filter(s => !s.content.trim());
    
    if (missingRequired.length > 0 && !noUpdateThisMonth) {
      const sectionNames = missingRequired
        .map(s => departmentSections.find(ds => ds.key === s.section)?.name)
        .join(', ');
      toast.error(`Please fill in required sections: ${sectionNames}`);
      return;
    }

    const isResubmit = existingSubmission?.status === 'submitted';
    const confirmMessage = isResubmit
      ? 'Re-submit your updated contribution?'
      : 'Submit your contribution? You can edit until the deadline.';
    
    if (confirm(confirmMessage)) {
      saveSubmission.mutate({ status: 'submitted' });
    }
  };

  if (isLoading || templateLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!departmentTemplate) {
    return <div className="text-center py-8">Department template not found</div>;
  }

  const departmentSections = (departmentTemplate.sections as any[]) || [];

  // Show "completed" view only if submitted AND past deadline
  if (existingSubmission?.status === 'submitted' && !isBeforeDeadline()) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Submission Complete</h3>
          <p className="text-muted-foreground">
            Your contribution has been submitted and the deadline has passed.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isAlreadySubmitted = existingSubmission?.status === 'submitted';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Newsletter Submission - {department}
                {brandName && (
                  <span className="text-primary"> • {brandName}{locationName && ` - ${locationName}`}</span>
                )}
              </CardTitle>
              {isAlreadySubmitted && isBeforeDeadline() && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  ⚠️ This submission has been sent. You can edit until the deadline ({new Date(assignment?.cycle?.due_date || '').toLocaleDateString()}).
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <AutoSaveIndicator 
                isSaving={_isSaving} 
                lastSaved={lastSaved} 
                hasUnsavedChanges={hasUnsavedChanges} 
              />
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={saveSubmission.isPending}
              >
                Save Draft
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saveSubmission.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {isAlreadySubmitted ? 'Re-submit' : 'Submit'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {departmentTemplate?.requires_brand_location && !brandId && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand *</Label>
                <select
                  id="brand"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={selectedBrandId}
                  onChange={(e) => {
                    setSelectedBrandId(e.target.value);
                    setSelectedLocationId('');
                  }}
                >
                  <option value="">Select a brand...</option>
                  {brands.map((brand: any) => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </div>
              {selectedBrandId && (
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <select
                    id="location"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                  >
                    <option value="">Select a location...</option>
                    {locations.map((location: any) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="no-update"
              checked={noUpdateThisMonth}
              onCheckedChange={(checked) => setNoUpdateThisMonth(checked as boolean)}
            />
            <label
              htmlFor="no-update"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              No updates this month
            </label>
          </div>

          {!noUpdateThisMonth && (
            <div className="space-y-6">
              {departmentSections.map((section: any) => {
                const sectionData = sectionsData.find(s => s.section === section.key);
                return (
                  <div key={section.key} className="space-y-2">
                    <Label htmlFor={section.key}>
                      {section.name} {section.isRequired && <span className="text-destructive">*</span>}
                    </Label>
                    <RichTextEditor
                      value={sectionData?.content || ''}
                      onChange={(content) => handleSectionChange(section.key, content)}
                      placeholder={`Enter ${section.name.toLowerCase()}...`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
