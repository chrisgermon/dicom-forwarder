import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageContainer } from '@/components/ui/page-container';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog';
import { Loader2, LifeBuoy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const helpTicketSchema = z.object({
  summary: z
    .string()
    .min(5, 'Summary must be at least 5 characters')
    .max(200, 'Summary must be less than 200 characters'),
  details: z
    .string()
    .min(20, 'Please provide more detail (at least 20 characters)')
    .max(5000, 'Details must be less than 5000 characters'),
  priority: z.enum(['1', '2', '3', '4']),
  category_id: z.enum(['1', '2', '3', '4', '5', '6']),
});

type HelpTicketFormData = z.infer<typeof helpTicketSchema>;

export default function HelpTicket() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketNumber] = useState<string>('');

  const form = useForm<HelpTicketFormData>({
    resolver: zodResolver(helpTicketSchema),
    defaultValues: {
      summary: '',
      details: '',
      priority: '2',
      category_id: '1',
    },
  });

  // Warn about unsaved changes
  const { isBlocked, confirmNavigation, cancelNavigation } = useUnsavedChanges({
    hasChanges: form.formState.isDirty && !success,
  });

  const onSubmit = async () => {
    setLoading(true);
    setSuccess(false);

    try {
      // HaloPSA Integration - Temporarily disabled
      // Keeping code for future use if re-enabled

      /* Original HaloPSA code:
      logger.debug('Submitting help ticket to HaloPSA...');

      const { data: response, error } = await supabase.functions.invoke('create-halo-ticket', {
        body: {
          summary: data.summary,
          details: data.details,
          priority: parseInt(data.priority),
          category_id: parseInt(data.category_id),
        },
      });

      if (error) {
        logger.error('Error creating ticket', error);
        throw error;
      }

      logger.debug('Ticket created successfully', response);

      setSuccess(true);
      setTicketNumber(response.ticket_id || 'N/A');
      */

      // Temporary: Show message that HaloPSA is disabled
      toast.info('HaloPSA integration is currently disabled. Please contact IT support directly.');

      // Reset form
      form.reset();

      // Redirect after a delay
      setTimeout(() => {
        navigate('/home');
      }, 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to submit help ticket. Please try again.';
      logger.error('Failed to create help ticket', error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PageContainer maxWidth="md">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <CardTitle className="text-green-900">Ticket Submitted Successfully!</CardTitle>
                <CardDescription className="text-green-700">
                  Your help ticket has been created and submitted to IT support.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-300 bg-green-100">
              <AlertDescription className="text-green-900">
                <strong>Ticket Number:</strong> {ticketNumber}
                <br />
                Our IT team will review your request and get back to you shortly.
              </AlertDescription>
            </Alert>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/home')} className="flex-1">
                Return to Home
              </Button>
              <Button onClick={() => setSuccess(false)} variant="outline">
                Submit Another Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="md">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <LifeBuoy className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Submit IT Help Ticket</CardTitle>
              <CardDescription>
                Need technical assistance? Submit a help ticket and our IT team will assist you.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Issue Summary <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description of your issue"
                        maxLength={200}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a short, clear title for your issue
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Detailed Description <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please provide as much detail as possible about your issue..."
                        rows={8}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include steps to reproduce, error messages, and any relevant information
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="min-h-[44px]">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Low - Minor issue</SelectItem>
                          <SelectItem value="2">Medium - Normal support</SelectItem>
                          <SelectItem value="3">High - Affecting work</SelectItem>
                          <SelectItem value="4">Critical - System down</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="min-h-[44px]">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">General Support</SelectItem>
                          <SelectItem value="2">Hardware Issue</SelectItem>
                          <SelectItem value="3">Software Issue</SelectItem>
                          <SelectItem value="4">Network/Connectivity</SelectItem>
                          <SelectItem value="5">Access/Permissions</SelectItem>
                          <SelectItem value="6">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Submitting as:</strong> {profile?.full_name || 'Unknown User'} ({profile?.email || 'No email'})
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 min-h-[44px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting Ticket...
                    </>
                  ) : (
                    <>
                      <LifeBuoy className="w-4 h-4 mr-2" />
                      Submit Help Ticket
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/home')}
                  disabled={loading}
                  className="min-h-[44px]"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <UnsavedChangesDialog
        open={isBlocked}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
    </PageContainer>
  );
}
