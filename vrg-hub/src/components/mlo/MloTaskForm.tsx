import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateMloTask, useUpdateMloTask, type MloTask } from "@/hooks/useMloCrm";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  task_type: z.enum(['follow_up', 'meeting', 'call', 'email', 'research', 'presentation', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MloTaskFormProps {
  task?: MloTask;
  onSuccess: () => void;
}

export function MloTaskForm({ task, onSuccess }: MloTaskFormProps) {
  const createTask = useCreateMloTask();
  const updateTask = useUpdateMloTask();
  const isEditing = !!task;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      task_type: task?.task_type || 'follow_up',
      priority: task?.priority || 'medium',
      due_date: task?.due_date || '',
      due_time: task?.due_time || '',
    },
  });

  const onSubmit = async (data: FormData) => {
    if (isEditing) {
      await updateTask.mutateAsync({ id: task.id, ...data });
    } else {
      await createTask.mutateAsync({
        title: data.title,
        task_type: data.task_type,
        priority: data.priority,
        description: data.description || null,
        due_date: data.due_date || null,
        due_time: data.due_time || null,
        status: 'pending',
        assigned_to: null,
        contact_id: null,
        clinic_key: null,
        referrer_key: null,
        completed_at: null,
        reminder_date: null,
        recurrence: null,
        tags: null,
      });
    }
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Title *</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl><Textarea {...field} rows={3} /></FormControl>
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="task_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="priority" render={({ field }) => (
            <FormItem>
              <FormLabel>Priority *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="due_date" render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="due_time" render={({ field }) => (
            <FormItem>
              <FormLabel>Due Time</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
            {(createTask.isPending || updateTask.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {createTask.isPending || updateTask.isPending
              ? 'Saving...'
              : isEditing ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
