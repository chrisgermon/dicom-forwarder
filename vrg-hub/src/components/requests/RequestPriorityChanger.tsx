import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RequestPriority } from '@/types/request';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RequestPriorityChangerProps {
  requestId: string;
  currentPriority: RequestPriority;
  requestUserId: string;
  requestType: 'hardware' | 'department';
  onPriorityChanged: () => void;
}

export function RequestPriorityChanger({
  requestId,
  currentPriority,
  requestUserId,
  requestType,
  onPriorityChanged,
}: RequestPriorityChangerProps) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  const isCreator = user?.id === requestUserId;
  const isManager = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  // Show read-only if user cannot change priority
  if (!isManager && !isCreator) {
    return <p className="text-sm uppercase">{currentPriority}</p>;
  }

  const handlePriorityChange = async (newPriority: RequestPriority) => {
    if (newPriority === currentPriority) return;

    setUpdating(true);
    try {
      const tableName = requestType === 'hardware' ? 'hardware_requests' : 'tickets';
      
      const { error } = await supabase
        .from(tableName)
        .update({ 
          priority: newPriority,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Priority Updated',
        description: `Request priority changed to ${newPriority}`,
      });

      onPriorityChanged();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: 'Error',
        description: 'Failed to update request priority',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Select
      value={currentPriority}
      onValueChange={(value) => handlePriorityChange(value as RequestPriority)}
      disabled={updating}
    >
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
  );
}
