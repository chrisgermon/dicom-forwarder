import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { CCEmailsInput } from '@/components/requests/CCEmailsInput';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function EditRequest() {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [businessJustification, setBusinessJustification] = useState('');

  const { data: request, isLoading } = useQuery({
    queryKey: ['request', identifier],
    queryFn: async () => {
      // Try tickets table first
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', identifier)
        .single();

      if (!ticketError && ticketData) return ticketData;

      // Fallback to hardware_requests
      const { data: hwData, error: hwError } = await supabase
        .from('hardware_requests')
        .select('*')
        .eq('id', identifier)
        .single();

      if (hwError) throw hwError;
      return hwData;
    },
  });

  useEffect(() => {
    if (request) {
      setTitle(request.title || '');
      setDescription(request.description || '');
      setPriority(request.priority || 'medium');
      setCcEmails(request.cc_emails || []);
      setBusinessJustification(request.business_justification || '');
    }
  }, [request]);

  const updateRequest = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      priority: string;
      cc_emails: string[];
      business_justification?: string;
    }) => {
      // Try tickets table first
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({
          title: data.title,
          description: data.description,
          priority: data.priority,
          cc_emails: data.cc_emails,
          business_justification: data.business_justification,
          updated_at: new Date().toISOString(),
        })
        .eq('id', identifier);

      if (ticketError) {
        // Fallback to hardware_requests
        const { error: hwError } = await supabase
          .from('hardware_requests')
          .update({
            title: data.title,
            description: data.description,
            priority: data.priority,
            cc_emails: data.cc_emails,
            business_justification: data.business_justification,
            updated_at: new Date().toISOString(),
          })
          .eq('id', identifier);

        if (hwError) throw hwError;
      }
    },
    onSuccess: () => {
      toast.success('Request updated successfully');
      navigate(-1);
    },
    onError: (error: any) => {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateRequest.mutate({
      title,
      description,
      priority,
      cc_emails: ccEmails,
      business_justification: businessJustification,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Edit Request</h1>
        <p className="text-muted-foreground mt-2">
          Update the details of your request below
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>Basic information about the request</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Request title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Provide a detailed description of your request..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification">Business Justification</Label>
              <RichTextEditor
                value={businessJustification}
                onChange={setBusinessJustification}
                placeholder="Explain why this request is needed..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <CCEmailsInput
              emails={ccEmails}
              onChange={setCcEmails}
              disabled={updateRequest.isPending}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={updateRequest.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={updateRequest.isPending}>
            {updateRequest.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
