import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { X, Plus, Mail } from 'lucide-react';

interface CCEmailsManagerProps {
  requestId: string;
  requestType: 'hardware' | 'department';
  currentEmails: string[];
}

export function CCEmailsManager({ requestId, requestType, currentEmails }: CCEmailsManagerProps) {
  const [newEmail, setNewEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  const tableName = requestType === 'hardware' ? 'hardware_requests' : 'tickets';

  const updateCCEmails = useMutation({
    mutationFn: async (emails: string[]) => {
      const { error } = await supabase
        .from(tableName)
        .update({ cc_emails: emails })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-by-identifier'] });
      queryClient.invalidateQueries({ queryKey: ['hardware-request', requestId] });
      toast.success('CC emails updated');
    },
    onError: (error: any) => {
      console.error('Error updating CC emails:', error);
      toast.error('Failed to update CC emails');
    },
  });

  const handleAddEmail = () => {
    const email = newEmail.trim().toLowerCase();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (currentEmails.includes(email)) {
      toast.error('Email already in CC list');
      return;
    }

    const updatedEmails = [...currentEmails, email];
    updateCCEmails.mutate(updatedEmails);
    setNewEmail('');
    setIsAdding(false);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    const updatedEmails = currentEmails.filter(email => email !== emailToRemove);
    updateCCEmails.mutate(updatedEmails);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">CC Notifications</p>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-6 px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="flex gap-2 mb-2">
          <Input
            type="email"
            placeholder="email@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddEmail();
              } else if (e.key === 'Escape') {
                setIsAdding(false);
                setNewEmail('');
              }
            }}
            className="h-8 text-xs"
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleAddEmail}
            disabled={!newEmail.trim()}
            className="h-8"
          >
            <Mail className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAdding(false);
              setNewEmail('');
            }}
            className="h-8"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {currentEmails.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {currentEmails.map((email: string) => (
            <Badge key={email} variant="secondary" className="text-xs gap-1 pr-1">
              {email}
              <button
                onClick={() => handleRemoveEmail(email)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No CC emails added</p>
      )}
    </div>
  );
}
