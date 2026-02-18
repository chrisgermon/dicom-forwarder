import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RequestStatus } from '@/types/request';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RequestStatusChangerProps {
  requestId: string;
  currentStatus: RequestStatus;
  requestUserId: string;
  onStatusChanged: () => void;
}

export function RequestStatusChanger({
  requestId,
  currentStatus,
  requestUserId,
  onStatusChanged,
}: RequestStatusChangerProps) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  const isCreator = user?.id === requestUserId;
  const isManager = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  // Determine available statuses based on permissions
  const getAvailableStatuses = (): RequestStatus[] => {
    if (isManager) {
      // Managers can set any status
      return ['open', 'in_progress', 'completed'];
    } else if (isCreator) {
      // Creators can only mark as completed
      return currentStatus === 'completed' ? [] : ['completed'];
    }
    return [];
  };

  const availableStatuses = getAvailableStatuses();

  // Show read-only if user has no permission to change status
  if (availableStatuses.length === 0) {
    return <p className="text-sm capitalize">{currentStatus.replace('_', ' ')}</p>;
  }

  const handleStatusChange = async (newStatus: RequestStatus) => {
    if (newStatus === currentStatus) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Request status changed to ${newStatus.replace('_', ' ')}`,
      });

      onStatusChanged();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update request status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Select
      value={currentStatus}
      onValueChange={(value) => handleStatusChange(value as RequestStatus)}
      disabled={updating}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {isManager ? (
          <>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Complete</SelectItem>
          </>
        ) : isCreator ? (
          <SelectItem value="completed">Complete</SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  );
}
