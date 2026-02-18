import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateMloPipeline, useUpdateMloPipeline, type MloPipeline } from "@/hooks/useMloCrm";

const formSchema = z.object({
  opportunity_name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  stage: z.enum(['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']),
  expected_monthly_referrals: z.number().optional(),
  expected_revenue: z.number().optional(),
  probability: z.number().min(0).max(100).optional(),
  expected_close_date: z.string().optional(),
  next_action: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MloPipelineFormProps {
  opportunity?: MloPipeline;
  onSuccess: () => void;
}

export function MloPipelineForm({ opportunity, onSuccess }: MloPipelineFormProps) {
  const createPipeline = useCreateMloPipeline();
  const updatePipeline = useUpdateMloPipeline();
  const isEditing = !!opportunity;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      opportunity_name: opportunity?.opportunity_name || '',
      description: opportunity?.description || '',
      stage: opportunity?.stage || 'prospecting',
      expected_monthly_referrals: opportunity?.expected_monthly_referrals || undefined,
      expected_revenue: opportunity?.expected_revenue || undefined,
      probability: opportunity?.probability || 20,
      expected_close_date: opportunity?.expected_close_date || '',
      next_action: opportunity?.next_action || '',
    },
  });

  const onSubmit = async (data: FormData) => {
    if (isEditing) {
      await updatePipeline.mutateAsync({ id: opportunity.id, ...data });
    } else {
      await createPipeline.mutateAsync({
        opportunity_name: data.opportunity_name,
        stage: data.stage,
        description: data.description || null,
        expected_monthly_referrals: data.expected_monthly_referrals || null,
        expected_revenue: data.expected_revenue || null,
        probability: data.probability || null,
        expected_close_date: data.expected_close_date || null,
        next_action: data.next_action || null,
        clinic_key: null,
        referrer_key: null,
        contact_id: null,
        actual_close_date: null,
        win_reason: null,
        loss_reason: null,
        competitor: null,
        next_action_date: null,
        tags: null,
      });
    }
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="opportunity_name" render={({ field }) => (
          <FormItem>
            <FormLabel>Opportunity Name *</FormLabel>
            <FormControl><Input {...field} placeholder="e.g. ABC Clinic Partnership" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl><Textarea {...field} rows={2} /></FormControl>
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="stage" render={({ field }) => (
            <FormItem>
              <FormLabel>Stage *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="prospecting">Prospecting</SelectItem>
                  <SelectItem value="qualification">Qualification</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="probability" render={({ field }) => (
            <FormItem>
              <FormLabel>Probability (%)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={0} 
                  max={100} 
                  {...field} 
                  value={field.value ?? ''} 
                  onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)} 
                />
              </FormControl>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="expected_revenue" render={({ field }) => (
            <FormItem>
              <FormLabel>Expected Revenue ($)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  value={field.value ?? ''} 
                  onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)} 
                />
              </FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="expected_close_date" render={({ field }) => (
            <FormItem>
              <FormLabel>Expected Close Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="next_action" render={({ field }) => (
          <FormItem>
            <FormLabel>Next Action</FormLabel>
            <FormControl><Input {...field} placeholder="What's the next step?" /></FormControl>
          </FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={createPipeline.isPending || updatePipeline.isPending}>
            {(createPipeline.isPending || updatePipeline.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {createPipeline.isPending || updatePipeline.isPending
              ? 'Saving...'
              : isEditing ? 'Update Opportunity' : 'Create Opportunity'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
