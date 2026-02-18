import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const feedbackSchema = z.object({
  feedback_type: z.enum(['feedback', 'bug', 'feature_request'], {
    required_error: 'Please select a feedback type',
  }),
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000, 'Message must be less than 2000 characters'),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

export function BetaFeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
  });

  const feedbackType = watch('feedback_type');

  const onSubmit = async (data: FeedbackFormData) => {
    if (!user) {
      toast.error('You must be logged in to submit feedback');
      return;
    }

    try {
      setIsSubmitting(true);

      // Get browser info
      const browserInfo = navigator.userAgent;
      const pageUrl = window.location.href;

      // Save to database
        const { data: feedback, error: dbError } = await (supabase as any)
          .from('beta_feedback')
          .insert({
            user_id: user.id,
            user_email: user.email || 'unknown',
            user_name: user.user_metadata?.full_name || user.email || 'Unknown User',
            feedback_type: data.feedback_type,
            subject: data.subject,
            message: data.message,
            page_url: pageUrl,
            browser_info: browserInfo,
          })
        .select()
        .single();

      if (dbError) throw dbError;

      // Send email notification
      const { error: emailError } = await supabase.functions.invoke('send-beta-feedback', {
        body: {
          feedback_id: feedback.id,
          user_email: user.email,
          user_name: user.user_metadata?.full_name || user.email || 'Unknown User',
          feedback_type: data.feedback_type,
          subject: data.subject,
          message: data.message,
          page_url: pageUrl,
          browser_info: browserInfo,
        },
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        toast.warning('Feedback saved but email notification failed. We will still review your feedback.');
      } else {
        toast.success('Thank you! Your feedback has been submitted.');
      }

      reset();
      setOpen(false);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquare className="w-4 h-4 mr-2" />
          Beta Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Beta Feedback</DialogTitle>
          <DialogDescription>
            Help us improve CrowdHub by sharing your feedback, reporting bugs, or suggesting new features.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="feedback_type">Type *</Label>
            <Select
              value={feedbackType}
              onValueChange={(value) => setValue('feedback_type', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select feedback type" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="feedback">General Feedback</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="feature_request">Feature Request</SelectItem>
              </SelectContent>
            </Select>
            {errors.feedback_type && (
              <p className="text-sm text-destructive mt-1">{errors.feedback_type.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="Brief description of your feedback"
              {...register('subject')}
            />
            {errors.subject && (
              <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Please provide detailed information..."
              rows={6}
              {...register('message')}
            />
            {errors.message && (
              <p className="text-sm text-destructive mt-1">{errors.message.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {watch('message')?.length || 0} / 2000 characters
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Feedback
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
