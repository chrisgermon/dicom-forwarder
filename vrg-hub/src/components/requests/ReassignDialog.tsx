import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  requestType: 'hardware' | 'department' | 'ticket';
  currentAssignee?: string;
  onSuccess?: () => void;
}

export function ReassignDialog({ 
  open, 
  onOpenChange, 
  requestId,
  requestType,
  currentAssignee,
  onSuccess 
}: ReassignDialogProps) {
  const [assignee, setAssignee] = useState<string>(currentAssignee || '');
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!assignee) {
      toast({
        title: 'Error',
        description: 'Please select a user to assign',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();

      // Try updating tickets table first (unified system)
      let updateError = null;
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({ assigned_to: assignee })
        .eq('id', requestId);

      if (ticketError) {
        // Fallback to old tables
        const tableName = requestType === 'hardware' ? 'hardware_requests' : 'department_requests';
        const { error: legacyError } = await supabase
          .from(tableName as any)
          .update({ assigned_to: assignee })
          .eq('id', requestId);
        updateError = legacyError;
      }

      if (updateError) throw updateError;

      // Add comment about reassignment
      const assignedUser = users.find(u => u.id === assignee);
      const { error: commentError } = await supabase
        .from('request_comments')
        .insert({
          request_id: requestId,
          user_id: user?.id,
          author_name: profile?.full_name || 'System',
          author_email: profile?.email || 'system@example.com',
          content: `Request reassigned to ${assignedUser?.full_name || 'user'}`,
          content_html: `Request reassigned to ${assignedUser?.full_name || 'user'}`,
          is_internal: true,
        });

      if (commentError) throw commentError;

      // Send notification via notify-ticket-event (fire-and-forget, don't await)
      const oldAssigneeName = users.find(u => u.id === currentAssignee)?.full_name || 'Unassigned';
      const newAssigneeName = assignedUser?.full_name || 'Unknown';
      
      (async () => {
        try {
          const { data: requestData } = await supabase
            .from('tickets')
            .select('request_type_id')
            .eq('id', requestId)
            .single();
          
          await supabase.functions.invoke('notify-ticket-event', {
            body: {
              requestId: requestId,
              requestType: requestData?.request_type_id || 'ticket',
              eventType: currentAssignee ? 'reassigned' : 'assigned',
              actorId: user?.id,
              oldValue: oldAssigneeName,
              newValue: newAssigneeName,
            },
          });
        } catch (err) {
          console.error('Error sending reassignment notification:', err);
        }
      })();

      toast({
        title: 'Request Reassigned',
        description: `Request has been assigned to ${assignedUser?.full_name}`,
      });

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['request-by-identifier'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['hardware-request'] });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error reassigning request:', error);
      toast({
        title: 'Error',
        description: 'Failed to reassign request',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reassign Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Assign To</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  disabled={loading}
                  className="w-full justify-between"
                >
                  {assignee
                    ? users.find((user) => user.id === assignee)?.full_name || 
                      users.find((user) => user.id === assignee)?.email
                    : "Select a user..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name or email..." />
                  <CommandEmpty>No user found.</CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {users.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={`${user.full_name} ${user.email}`}
                        onSelect={() => {
                          setAssignee(user.id);
                          setPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            assignee === user.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{user.full_name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReassign} disabled={saving || loading}>
            {saving ? 'Reassigning...' : 'Reassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
