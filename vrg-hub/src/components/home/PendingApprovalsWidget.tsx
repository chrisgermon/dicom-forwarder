import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface PendingApprovalsWidgetProps {
  title?: string;
}

export function PendingApprovalsWidget({ title = "Pending Approvals" }: PendingApprovalsWidgetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-approvals-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('hardware_requests')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending_manager_approval', 'pending_admin_approval']);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          {pendingCount > 0 && (
            <Badge variant="destructive">{pendingCount}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingCount > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You have {pendingCount} request{pendingCount !== 1 ? 's' : ''} awaiting approval
            </p>
            <Button onClick={() => navigate('/approvals')} className="w-full">
              Review Approvals
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No pending approvals</p>
        )}
      </CardContent>
    </Card>
  );
}