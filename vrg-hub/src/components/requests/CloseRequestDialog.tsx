import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CloseRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  requestType: 'hardware' | 'department' | 'ticket';
  onSuccess?: () => void;
}

export function CloseRequestDialog({ 
  open, 
  onOpenChange, 
  requestId,
  requestType,
  onSuccess 
}: CloseRequestDialogProps) {
  const [response, setResponse] = useState('');
  const [closing, setClosing] = useState(false);
  const { toast } = useToast();

  const handleClose = async () => {
    if (!response.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a closing response',
        variant: 'destructive',
      });
      return;
    }

    setClosing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .maybeSingle();

      // Determine which table to update
      const tableName = requestType === 'hardware' ? 'hardware_requests' : 'tickets';
      
      // Update request status to completed
      const { error: updateError } = await supabase
        .from(tableName as any)
        .update({ status: 'completed' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Add the response as an update/comment
      const { data: commentData, error: commentError } = await supabase
        .from('request_comments')
        .insert({
          request_id: requestId,
          user_id: user?.id,
          author_name: profile?.full_name || profile?.email || 'Unknown',
          author_email: profile?.email || '',
          content: response,
          content_html: response,
          is_internal: false,
        })
        .select()
        .single();

      if (commentError) throw commentError;

      // Send email notification about the closing response
      await supabase.functions.invoke('notify-comment', {
        body: {
          requestId,
          commentId: commentData.id,
        },
      });

      toast({
        title: 'Request Closed',
        description: 'The request has been marked as completed with your response',
      });

      onOpenChange(false);
      setResponse('');
      onSuccess?.();
    } catch (error) {
      console.error('Error closing request:', error);
      toast({
        title: 'Error',
        description: 'Failed to close request',
        variant: 'destructive',
      });
    } finally {
      setClosing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Close Request with Response</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="response">Closing Response</Label>
            <Textarea 
              id="response"
              rows={8}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Enter your closing response to the user..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleClose} disabled={closing}>
            {closing ? 'Closing...' : 'Close Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
