import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDescriptionText } from '@/lib/requestUtils';

interface PendingApprovalsProps {
  refreshTrigger?: number;
}

export function PendingApprovals({ refreshTrigger }: PendingApprovalsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: pendingRequests = [], isLoading } = useQuery({
    queryKey: ['pending-approvals', user?.id, refreshTrigger],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('approval_status', 'pending')
        .or(`approver_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!requests) return [];

      // Fetch related data
      const userIds = [...new Set(requests.map(r => r.user_id))];
      const brandIds = [...new Set(requests.map(r => r.brand_id).filter(Boolean))];
      const locationIds = [...new Set(requests.map(r => r.location_id).filter(Boolean))];
      const requestTypeIds = [...new Set(requests.map(r => r.request_type_id).filter(Boolean))];

      const [profiles, brands, locations, requestTypes] = await Promise.all([
        userIds.length > 0 ? supabase.from('profiles').select('id, full_name, email').in('id', userIds) : { data: [] },
        brandIds.length > 0 ? supabase.from('brands').select('id, name').in('id', brandIds) : { data: [] },
        locationIds.length > 0 ? supabase.from('locations').select('id, name').in('id', locationIds) : { data: [] },
        requestTypeIds.length > 0 ? supabase.from('request_types').select('id, name').in('id', requestTypeIds) : { data: [] },
      ]);

      // Map the data
      return requests.map(request => ({
        ...request,
        requester: profiles.data?.find(p => p.id === request.user_id),
        brand: brands.data?.find(b => b.id === request.brand_id),
        location: locations.data?.find(l => l.id === request.location_id),
        request_type: requestTypes.data?.find(rt => rt.id === request.request_type_id),
      }));
    },
    enabled: !!user?.id,
  });

  const updateRequestStatus = useMutation({
    mutationFn: async ({ requestId, status, notes }: { requestId: string; status: string; notes?: string }) => {
      const updates: any = {
        status,
        approval_status: status === 'approved' ? 'approved' : 'declined',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (status === 'approved') {
        updates.approval_notes = notes || null;
      } else if (status === 'declined') {
        updates.declined_reason = notes || 'Declined by approver';
      }

      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      toast.success('Request updated');
    },
    onError: (error) => {
      toast.error('Failed to update request');
      console.error(error);
    },
  });

  const handleApprove = (requestId: string) => {
    updateRequestStatus.mutate({ requestId, status: 'approved' });
  };

  const handleDecline = (requestId: string) => {
    updateRequestStatus.mutate({ 
      requestId, 
      status: 'declined',
      notes: 'Request declined'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No pending approvals</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals ({pendingRequests.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium">{request.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Requested by: {request.requester?.full_name || request.requester?.email || 'Unknown'}
                  </p>
                  {request.request_type && (
                    <p className="text-sm text-muted-foreground">
                      Type: {request.request_type.name}
                    </p>
                  )}
                  {request.brand && (
                    <p className="text-sm text-muted-foreground">
                      Company: {request.brand.name}
                    </p>
                  )}
                  {request.location && (
                    <p className="text-sm text-muted-foreground">
                      Location: {request.location.name}
                    </p>
                  )}
                </div>
                <Badge variant={request.priority === 'high' ? 'destructive' : 'secondary'}>
                  {request.priority}
                </Badge>
              </div>

{request.description && (
                <p className="text-sm whitespace-pre-wrap">{getDescriptionText(request.description)}</p>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(request.id)}
                  disabled={updateRequestStatus.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDecline(request.id)}
                  disabled={updateRequestStatus.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/request/${request.request_number}`)}
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}