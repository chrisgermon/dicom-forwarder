import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Paperclip, Upload, X } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const baseTicketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  department_id: z.string().optional().nullable(),
  contact_name: z.string().optional(),
  contact_email: z.string().email('Please provide a valid email').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
});

const contactRequiredSchema = baseTicketSchema.extend({
  contact_name: z.string().min(1, 'Name is required'),
  contact_email: z.string().min(1, 'Email is required').email('Please provide a valid email'),
});

type TicketFormData = z.infer<typeof contactRequiredSchema>;

export interface SimpleTicketFormProps {
  /** Controls whether the card wrapper is rendered. */
  renderAsCard?: boolean;
  /** Optional heading shown at the top of the form. */
  title?: string;
  /** Optional description beneath the heading. */
  description?: string;
  /** Button label for the submit action. */
  submitLabel?: string;
  /** Button label for the cancel action. */
  cancelLabel?: string;
  /** Callback invoked when the cancel button is pressed. */
  onCancel?: () => void;
  /** Callback fired after the ticket is successfully created. */
  onSuccess?: (context: {
    ticket: { id: string; request_number: number };
    formData: TicketFormData;
    attachments: File[];
  }) => void | Promise<void>;
  /** Prevent automatic navigation to the ticket detail view. */
  disableAutoRedirect?: boolean;
  /** Optional path override for the success redirect. */
  redirectPath?: (ticket: { id: string; request_number: number }) => string;
  /** Pre-populated form defaults. */
  defaultValues?: Partial<TicketFormData>;
  /** Controls visibility of the department picker. */
  showDepartmentSelect?: boolean;
  /** Controls visibility of requester contact fields. */
  showContactFields?: boolean;
  /** Whether contact information fields are required. */
  requireContactFields?: boolean;
  /** Enables drag & drop attachments. */
  allowAttachments?: boolean;
  /** Optional className applied to the root element when not rendering as a card. */
  className?: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 10;

export function SimpleTicketForm({
  renderAsCard = true,
  title = 'Create New Ticket',
  description = "Submit a support ticket and we'll get back to you as soon as possible",
  submitLabel = 'Submit Ticket',
  cancelLabel = 'Cancel',
  onCancel,
  onSuccess,
  disableAutoRedirect = false,
  redirectPath,
  defaultValues,
  showDepartmentSelect = true,
  showContactFields = false,
  requireContactFields = false,
  allowAttachments = false,
  className,
}: SimpleTicketFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const formSchema = useMemo(
    () => (showContactFields && requireContactFields ? contactRequiredSchema : baseTicketSchema),
    [requireContactFields, showContactFields]
  );

  const form = useForm<TicketFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      department_id: null,
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (!showContactFields) return;
    if (!defaultValues?.contact_email && (profile?.email || user?.email)) {
      form.setValue('contact_email', profile?.email || user?.email || '');
    }
    if (!defaultValues?.contact_name && profile?.full_name) {
      form.setValue('contact_name', profile.full_name);
    }
  }, [defaultValues?.contact_email, defaultValues?.contact_name, form, profile, showContactFields, user?.email]);

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: showDepartmentSelect,
  });

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is too large (max 20MB)`;
    }
    return null;
  };

  const handleAttachments = (incoming: FileList | File[]) => {
    if (!allowAttachments) return;
    const files = Array.from(incoming);

    if (attachments.length + files.length > MAX_FILES) {
      toast({
        title: 'Too many files',
        description: `You can attach up to ${MAX_FILES} files`,
        variant: 'destructive',
      });
      return;
    }

    const valid: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        valid.push(file);
      }
    });

    if (errors.length) {
      toast({
        title: 'File validation errors',
        description: errors.join(', '),
        variant: 'destructive',
      });
    }

    if (valid.length) {
      setAttachments((current) => [...current, ...valid]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const uploadTicketAttachments = async (ticketId: string): Promise<string[]> => {
    const uploadedFiles: string[] = [];

    try {
      for (const file of attachments) {
        const extension = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
        const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const fileName = `${ticketId}/${uniqueSuffix}${extension}`;

        const { error: uploadError } = await supabase.storage
          .from('request-attachments')
          .upload(fileName, file);

        if (uploadError) {
          throw uploadError;
        }

        uploadedFiles.push(fileName);
      }

      return uploadedFiles;
    } catch (error) {
      if (uploadedFiles.length > 0) {
        await supabase.storage.from('request-attachments').remove(uploadedFiles);
      }
      throw error;
    }
  };

  const onSubmit = async (data: TicketFormData) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a ticket',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          title: data.title,
          description: data.description,
          priority: data.priority,
          department_id: data.department_id || null,
          user_id: user.id,
          status: 'inbox',
          metadata: {
            contact_name: data.contact_name || null,
            contact_email: data.contact_email || null,
            contact_phone: data.contact_phone || null,
          },
        })
        .select('id, request_number')
        .single();

      if (error || !ticket) throw error || new Error('Ticket not returned');

      let uploadedFiles: string[] = [];

      if (allowAttachments && attachments.length > 0) {
        try {
          uploadedFiles = await uploadTicketAttachments(ticket.id);

          const { error: attachmentUpdateError } = await supabase
            .from('tickets')
            .update({ attachments: uploadedFiles })
            .eq('id', ticket.id);

          if (attachmentUpdateError) {
            throw attachmentUpdateError;
          }
        } catch (attachmentError) {
          await supabase.from('tickets').delete().eq('id', ticket.id);
          throw attachmentError;
        }
      }

      await supabase.from('ticket_events').insert({
        ticket_id: ticket.id,
        type: 'created',
        actor_user_id: user.id,
        data: {
          contact_name: data.contact_name,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          attachments: uploadedFiles,
          attachment_names: attachments.map((file) => file.name),
        },
      });

      // Send notification email
      await supabase.functions.invoke('notify-ticket-event', {
        body: {
          requestId: ticket.id,
          requestType: 'hardware',
          eventType: 'created',
          actorId: user.id,
        },
      });

      if (onSuccess) {
        await onSuccess({ ticket, formData: data, attachments });
      }

      toast({
        title: 'Ticket submitted',
        description: 'Your ticket has been submitted successfully.',
      });

      if (!disableAutoRedirect) {
        const path = redirectPath
          ? redirectPath(ticket)
          : `/request/VRG-${String(ticket.request_number).padStart(5, '0')}`;
        navigate(path);
      }

      form.reset({
        title: '',
        description: '',
        priority: 'medium',
        department_id: null,
        contact_name: showContactFields ? data.contact_name || '' : '',
        contact_email: showContactFields ? data.contact_email || '' : '',
        contact_phone: showContactFields ? data.contact_phone || '' : '',
      });
      setAttachments([]);
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create ticket. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Brief summary of your issue" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide detailed information about your request..."
                  rows={showContactFields || allowAttachments ? 5 : 6}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {showContactFields && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name {requireContactFields && <span className="text-red-500">*</span>}</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email {requireContactFields && <span className="text-red-500">*</span>}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_phone"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Add a phone number for quicker follow up" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {showDepartmentSelect && (
            <FormField
              control={form.control}
              name="department_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department (optional)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value || null)}
                    value={field.value ?? ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No department</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {allowAttachments && (
          <div
            className={cn(
              'rounded-md border border-dashed p-4 transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleAttachments(event.dataTransfer.files);
            }}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Drag and drop files here</p>
                <p className="text-xs text-muted-foreground">or click below to browse (max {MAX_FILES} files, 20MB each)</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.onchange = (event) => {
                    const target = event.target as HTMLInputElement;
                    if (target.files) {
                      handleAttachments(target.files);
                    }
                  };
                  input.click();
                }}
              >
                Browse Files
              </Button>
            </div>

            {attachments.length > 0 && (
              <ScrollArea className="mt-4 max-h-48 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeAttachment(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {(onCancel || !disableAutoRedirect) && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (onCancel) {
                  onCancel();
                  return;
                }
                navigate('/requests');
              }}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (!renderAsCard) {
    return <div className={cn('space-y-6', className)}>{formContent}</div>;
  }

  return (
    <Card className={cn('max-w-2xl mx-auto', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
