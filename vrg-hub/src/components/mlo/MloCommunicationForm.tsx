import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateMloCommunication } from "@/hooks/useMloCrm";

const formSchema = z.object({
  communication_type: z.enum(['email', 'phone_call', 'meeting', 'video_call', 'text', 'linkedin', 'other']),
  direction: z.enum(['inbound', 'outbound']),
  subject: z.string().optional(),
  summary: z.string().min(1, "Summary is required"),
  detailed_notes: z.string().optional(),
  outcome: z.enum(['positive', 'neutral', 'negative', 'follow_up_needed', 'no_response']).optional(),
  duration_minutes: z.number().optional(),
  follow_up_date: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MloCommunicationFormProps {
  contactId?: string;
  onSuccess: () => void;
}

export function MloCommunicationForm({ contactId, onSuccess }: MloCommunicationFormProps) {
  const createCommunication = useCreateMloCommunication();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      communication_type: 'phone_call',
      direction: 'outbound',
      subject: '',
      summary: '',
      detailed_notes: '',
      outcome: undefined,
      duration_minutes: undefined,
      follow_up_date: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    await createCommunication.mutateAsync({
      communication_type: data.communication_type,
      direction: data.direction,
      summary: data.summary,
      subject: data.subject || null,
      detailed_notes: data.detailed_notes || null,
      outcome: data.outcome || null,
      duration_minutes: data.duration_minutes || null,
      follow_up_date: data.follow_up_date || null,
      contact_id: contactId || null,
      follow_up_completed: false,
      attachments: null,
      clinic_key: null,
      referrer_key: null,
    });
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="communication_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="video_call">Video Call</SelectItem>
                  <SelectItem value="text">Text/SMS</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="direction" render={({ field }) => (
            <FormItem>
              <FormLabel>Direction *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="subject" render={({ field }) => (
          <FormItem>
            <FormLabel>Subject</FormLabel>
            <FormControl><Input {...field} /></FormControl>
          </FormItem>
        )} />

        <FormField control={form.control} name="summary" render={({ field }) => (
          <FormItem>
            <FormLabel>Summary *</FormLabel>
            <FormControl><Textarea {...field} rows={2} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="outcome" render={({ field }) => (
          <FormItem>
            <FormLabel>Outcome</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="follow_up_needed">Follow-up Needed</SelectItem>
                <SelectItem value="no_response">No Response</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={createCommunication.isPending}>
            {createCommunication.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {createCommunication.isPending ? 'Saving...' : 'Log Communication'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
