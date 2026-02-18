import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2 } from 'lucide-react';
import { useAssignToMe } from '@/hooks/useAssignToMe';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type RequestTable = 'tickets' | 'hardware_requests' | 'marketing_requests' | 'incidents';

interface AssignToMeButtonProps {
  requestId: string;
  table?: RequestTable;
  currentAssignee?: string | null;
  assignedGroupId?: string | null;
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showIcon?: boolean;
  className?: string;
}

export function AssignToMeButton({
  requestId,
  table = 'tickets',
  currentAssignee,
  assignedGroupId,
  onSuccess,
  variant = 'outline',
  size = 'sm',
  showIcon = true,
  className,
}: AssignToMeButtonProps) {
  const { assignToMe, loading } = useAssignToMe({ onSuccess });
  const { user, userRole } = useAuth();
  const [canAssign, setCanAssign] = useState(false);
  const [checking, setChecking] = useState(true);

  const isManagerOrAdmin = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  useEffect(() => {
    checkCanAssign();
  }, [requestId, currentAssignee, assignedGroupId, user?.id, isManagerOrAdmin]);

  const checkCanAssign = async () => {
    setChecking(true);
    
    // Already assigned to current user
    if (currentAssignee === user?.id) {
      setCanAssign(false);
      setChecking(false);
      return;
    }

    // Already assigned to someone else
    // Regular users can't take it; managers/admins can take ownership.
    if (currentAssignee && currentAssignee !== user?.id) {
      setCanAssign(isManagerOrAdmin);
      setChecking(false);
      return;
    }

    // Not assigned to anyone - admins and managers can always assign
    if (isManagerOrAdmin) {
      setCanAssign(true);
      setChecking(false);
      return;
    }

    // For regular users, check group membership if there's an assigned group
    if (assignedGroupId) {
      try {
        const { data: membership } = await supabase
          .from('request_handler_group_members')
          .select('id')
          .eq('group_id', assignedGroupId)
          .eq('user_id', user?.id)
          .maybeSingle();

        setCanAssign(!!membership);
      } catch (error) {
        console.error('Error checking group membership:', error);
        setCanAssign(false);
      }
    } else {
      // No group assigned and not admin - can't assign
      setCanAssign(false);
    }
    
    setChecking(false);
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await assignToMe(requestId, table);
  };

  // Don't show button if already assigned to current user or still checking
  if (currentAssignee === user?.id || checking) {
    return null;
  }

  // If can't assign, don't show
  if (!canAssign) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {showIcon && <UserPlus className="w-4 h-4 mr-2" />}
          Assign to Me
        </>
      )}
    </Button>
  );
}
