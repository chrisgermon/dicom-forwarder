import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { formatAUDate, formatAUDateTimeFull } from '@/lib/dateUtils';
import { getDescriptionText } from '@/lib/requestUtils';

interface MarketingRequest {
  id: string;
  user_id: string;
  title: string;
  request_type: string;
  description: string;
  target_audience?: string;
  deadline?: string;
  status: string;
  priority: string;
  assigned_to?: string;
  approved_by?: string;
  approved_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface MarketingRequestDetailProps {
  requestId?: string;
}

export function MarketingRequestDetail({ requestId: propRequestId }: MarketingRequestDetailProps) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propRequestId || paramId;
  const [request, setRequest] = useState<MarketingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { userRole } = useAuth();
  const navigate = useNavigate();

  const isMarketingManager = ['marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  useEffect(() => {
    if (id) {
      loadRequest();
    }
  }, [id]);

  const loadRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setRequest(data);
    } catch (error) {
      console.error('Error loading request:', error);
      toast({
        title: 'Error',
        description: 'Failed to load marketing request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!request) return;

    try {
      const { error } = await supabase
        .from('marketing_requests')
        .update({ status: newStatus })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Request status updated',
      });

      loadRequest();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update request status',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Request not found
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { variant: 'secondary', label: 'Draft' },
      submitted: { variant: 'default', label: 'Submitted' },
      in_progress: { variant: 'default', label: 'In Progress' },
      approved: { variant: 'success', label: 'Approved' },
      completed: { variant: 'success', label: 'Completed' },
      declined: { variant: 'destructive', label: 'Declined' },
    };

    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      low: 'secondary',
      medium: 'default',
      high: 'warning',
      urgent: 'destructive',
    };

    return <Badge variant={variants[priority] || 'default'}>{priority}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/requests')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-2">{request.title}</CardTitle>
              <div className="flex gap-2">
                {getStatusBadge(request.status)}
                {getPriorityBadge(request.priority)}
                <Badge variant="outline">{request.request_type.replace('_', ' ')}</Badge>
              </div>
            </div>
            {isMarketingManager && request.status === 'submitted' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate('in_progress')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Start Work
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate('declined')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{getDescriptionText(request.description)}</p>
          </div>

          {request.target_audience && (
            <div>
              <h3 className="font-semibold mb-2">Target Audience</h3>
              <p className="text-muted-foreground">{request.target_audience}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Created</h3>
              <p className="text-muted-foreground">
                {formatAUDateTimeFull(request.created_at)}
              </p>
            </div>

            {request.deadline && (
              <div>
                <h3 className="font-semibold mb-2">Deadline</h3>
                <p className="text-muted-foreground">
                  {formatAUDate(request.deadline)}
                </p>
              </div>
            )}
          </div>

          {isMarketingManager && request.status === 'in_progress' && (
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button onClick={() => handleStatusUpdate('completed')}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Completed
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
