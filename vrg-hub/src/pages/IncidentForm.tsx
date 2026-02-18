import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { BrandLocationSelect } from '@/components/ui/brand-location-select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

const incidentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  incident_involves: z.enum(['Staff', 'Visitor', 'Patient', 'Contractor', 'Other'], {
    required_error: 'Please select who the incident involves',
  }),
  persons_involved: z.string().min(10, 'Please provide more detail about persons involved').max(2000, 'Details are too long'),
  brand_id: z.string().min(1, 'Please select a company'),
  location_id: z.string().min(1, 'Please select a location'),
  modality_area: z.enum(['XRAY CT Mammo', 'MRI', 'Ultrasound', 'Clinic'], {
    required_error: 'Please select a modality/area',
  }),
  incident_date: z.string().min(1, 'Please select the incident date'),
  incident_time: z.string().min(1, 'Please enter the incident time'),
  incident_type: z.enum(['Adverse reaction', 'Cardiac arrest', 'Extravasation', 'Fainting', 'Incorrect imaging', 'Needle stick injury', 'Patient aggression', 'Workplace injury', 'Other'], {
    required_error: 'Please select an incident type',
  }),
  incident_description: z.string().min(20, 'Please provide a more detailed description (at least 20 characters)').max(5000, 'Description is too long'),
  further_comments: z.string().max(2000, 'Comments are too long').optional(),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

export default function IncidentForm() {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      name: '',
      persons_involved: '',
      brand_id: '',
      location_id: '',
      incident_date: '',
      incident_time: '',
      incident_description: '',
      further_comments: '',
    },
  });

  const { isBlocked, confirmNavigation, cancelNavigation } = useUnsavedChanges({
    hasChanges: form.formState.isDirty,
  });

  const onSubmit = async (data: IncidentFormData) => {
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to submit an incident report',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      const { error: requestError } = await supabase
        .from('incidents')
        .insert({
          user_id: user.id,
          reporter_name: data.name,
          incident_involves: data.incident_involves,
          persons_involved: data.persons_involved,
          brand_id: data.brand_id,
          location_id: data.location_id,
          modality_area: data.modality_area,
          incident_date: data.incident_date,
          incident_time: data.incident_time,
          incident_type: data.incident_type,
          incident_description: data.incident_description,
          further_comments: data.further_comments || null,
          status: 'submitted',
        });

      if (requestError) throw requestError;

      toast({
        title: 'Success',
        description: 'Your incident report has been submitted and will be forwarded to your manager.',
      });

      form.reset();
      navigate('/');
    } catch (error) {
      logger.error('Error submitting incident report', error);
      toast({
        title: 'Error',
        description: 'Failed to submit incident report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Vision Radiology Online Incident Form</CardTitle>
          <CardDescription>
            HR & Employee Assistance Program - Report workplace incidents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What is your name? *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Who does the incident involve */}
              <FormField
                control={form.control}
                name="incident_involves"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Who does the incident involve? *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="space-y-2"
                      >
                        {['Staff', 'Visitor', 'Patient', 'Contractor', 'Other'].map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`involves-${option}`} />
                            <FormLabel htmlFor={`involves-${option}`} className="font-normal cursor-pointer">
                              {option}
                            </FormLabel>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Details of persons involved */}
              <FormField
                control={form.control}
                name="persons_involved"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Details of all person/s involved *</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company and Location */}
              <BrandLocationSelect
                selectedBrandId={form.watch('brand_id')}
                selectedLocationId={form.watch('location_id')}
                onBrandChange={(brandId) => form.setValue('brand_id', brandId, { shouldDirty: true })}
                onLocationChange={(locationId) => form.setValue('location_id', locationId, { shouldDirty: true })}
                required
              />
              {form.formState.errors.brand_id && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.brand_id.message}</p>
              )}
              {form.formState.errors.location_id && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.location_id.message}</p>
              )}

              {/* Modality / Area */}
              <FormField
                control={form.control}
                name="modality_area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modality / Area *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="min-h-[44px]">
                          <SelectValue placeholder="Select modality/area" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['XRAY CT Mammo', 'MRI', 'Ultrasound', 'Clinic'].map((modality) => (
                          <SelectItem key={modality} value={modality}>{modality}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date and Time of incident */}
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="incident_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of incident *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="min-h-[44px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incident_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time of incident *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} className="min-h-[44px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Type of Incident */}
              <FormField
                control={form.control}
                name="incident_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Incident *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="min-h-[44px]">
                          <SelectValue placeholder="Select incident type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['Adverse reaction', 'Cardiac arrest', 'Extravasation', 'Fainting', 'Incorrect imaging', 'Needle stick injury', 'Patient aggression', 'Workplace injury', 'Other'].map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="incident_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please provide a description of the incident *</FormLabel>
                    <FormControl>
                      <Textarea rows={5} {...field} />
                    </FormControl>
                    <FormDescription>
                      Include as much detail as possible about what happened.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Further comments */}
              <FormField
                control={form.control}
                name="further_comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Further comments (e.g., relevant notes added to Karisma in case of a reaction or patient aggression)
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormDescription>
                      This form will be forwarded to your manager. Thank you for your submission.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  disabled={submitting}
                  className="min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="min-h-[44px]">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Incident Report
                </Button>
              </div>
            </form>
          </Form>

          <UnsavedChangesDialog
            open={isBlocked}
            onConfirm={confirmNavigation}
            onCancel={cancelNavigation}
          />
        </CardContent>
      </Card>
    </div>
  );
}
