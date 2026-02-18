import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export function useRequestDelete() {
  const { user, userRole } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const isManagerOrAdmin = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  const deleteRequests = async (requestIds: string[]) => {
    if (!isManagerOrAdmin) {
      toast.error('You do not have permission to delete requests');
      return false;
    }

    setIsDeleting(true);
    try {
      // Fetch the requests before deletion for audit logging
      const { data: requestsToDelete, error: fetchError } = await supabase
        .from('tickets')
        .select('*')
        .in('id', requestIds);

      if (fetchError) throw fetchError;

      // Delete the requests
      const { error: deleteError } = await supabase
        .from('tickets')
        .delete()
        .in('id', requestIds);

      if (deleteError) throw deleteError;

      // Create audit log entries for each deleted request
      const auditLogs = requestsToDelete?.map(request => ({
        user_id: user?.id,
        user_email: user?.email,
        action: 'DELETE',
        table_name: 'tickets',
        record_id: request.id,
        old_data: request,
        new_data: null,
      })) || [];

      if (auditLogs.length > 0) {
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert(auditLogs);

        if (auditError) {
          logger.error('Error creating audit log', auditError);
        }
      }

      toast.success(`Successfully deleted ${requestIds.length} request${requestIds.length > 1 ? 's' : ''}`);
      return true;
    } catch (error) {
      logger.error('Error deleting requests', error);
      toast.error('Failed to delete requests');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteRequests,
    isDeleting,
    canDelete: isManagerOrAdmin,
  };
}
