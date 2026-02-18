import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

type RequestTable = 'tickets' | 'hardware_requests' | 'marketing_requests' | 'incidents';

interface UseAssignToMeOptions {
  onSuccess?: () => void;
}

export function useAssignToMe(options?: UseAssignToMeOptions) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const assignToMe = async (requestId: string, table: RequestTable = 'tickets') => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to assign requests',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from(table)
        .update({ assigned_to: user.id })
        .eq('id', requestId);

      if (error) throw error;

      // Log the assignment in ticket_events if it's a ticket
      if (table === 'tickets') {
        await supabase.from('ticket_events').insert({
          ticket_id: requestId,
          type: 'assigned',
          actor_user_id: user.id,
          data: { assigned_to: user.id, self_assigned: true },
        });
      }

      toast({
        title: 'Assigned to You',
        description: 'This request has been assigned to you',
      });

      options?.onSuccess?.();
      return true;
    } catch (error) {
      logger.error('Error assigning request', error);
      toast({
        title: 'Error',
        description: 'Failed to assign request',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const canAssignToMe = async (requestId: string, table: RequestTable = 'tickets'): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Check if user is in the handler group for this request
      const { data: request } = await supabase
        .from(table)
        .select('assigned_to, assigned_group_id')
        .eq('id', requestId)
        .single();

      if (!request) return false;

      // Already assigned to someone
      if (request.assigned_to) return false;

      // If there's no group assignment, admins/managers can claim
      if (!request.assigned_group_id) return true;

      // Check if user is in the assigned group
      const { data: membership } = await supabase
        .from('request_handler_group_members')
        .select('id')
        .eq('group_id', request.assigned_group_id)
        .eq('user_id', user.id)
        .maybeSingle();

      return !!membership;
    } catch (error) {
      logger.error('Error checking assignment eligibility', error);
      return false;
    }
  };

  return {
    assignToMe,
    canAssignToMe,
    loading,
  };
}
