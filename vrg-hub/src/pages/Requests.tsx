import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TabsContent } from '@/components/ui/tabs';
import { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger } from '@/components/ui/underline-tabs';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { RequestsList } from '@/components/requests/RequestsList';
import { useAuth } from '@/hooks/useAuth';
import { useRequestDelete } from '@/hooks/useRequestDelete';
import { DetailsPanel, DetailsSection, DetailsField } from '@/components/ui/details-panel';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatRequestId, getDescriptionText } from '@/lib/requestUtils';
import { getStatusVariant, formatStatusText } from '@/lib/ui-utils';
export default function Requests() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(id || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { deleteRequests, isDeleting, canDelete } = useRequestDelete();

  const isManagerOrAdmin = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  // Fetch selected request details
  const { data: selectedRequest } = useQuery({
    queryKey: ['request', selectedRequestId],
    queryFn: async () => {
      if (!selectedRequestId) return null;
      
      // Fetch request
      const { data: request, error: requestError } = await supabase
        .from('tickets')
        .select('*, request_number')
        .eq('id', selectedRequestId)
        .single();
      
      if (requestError || !request) return null;
      
      // Fetch user profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', request.user_id)
        .single();
      
      return { ...request, profile };
    },
    enabled: !!selectedRequestId,
  });

  const handleRequestSelect = (requestId: string) => {
    setSelectedRequestId(requestId);
    navigate(`/requests/${requestId}`, { replace: true });
  };

  const handleCloseDetails = () => {
    setSelectedRequestId(null);
    navigate('/requests', { replace: true });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['request'] });
    // Give a small delay for visual feedback
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDelete = async () => {
    if (!selectedRequestId) return;
    
    const success = await deleteRequests([selectedRequestId]);
    if (success) {
      setShowDeleteDialog(false);
      handleCloseDetails();
      await queryClient.invalidateQueries({ queryKey: ['request'] });
    }
  };

  return (
    <div className="flex gap-0 -m-3 md:-m-6 max-w-screen-2xl mx-auto">
      <div className="flex-1 min-w-0 p-3 md:p-6">
        <div className="flex items-center justify-end gap-2 mb-6">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => navigate('/requests/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>

        <UnderlineTabs defaultValue="all" className="space-y-4">
          <UnderlineTabsList>
            <UnderlineTabsTrigger value="all">All Requests</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="my-requests">My Requests</UnderlineTabsTrigger>
            {isManagerOrAdmin && <UnderlineTabsTrigger value="pending">Pending Approval</UnderlineTabsTrigger>}
          </UnderlineTabsList>

          <TabsContent value="all" className="space-y-4">
            <RequestsList onRequestSelect={handleRequestSelect} selectedRequestId={selectedRequestId} filterType="all" />
          </TabsContent>

          <TabsContent value="my-requests" className="space-y-4">
            <RequestsList onRequestSelect={handleRequestSelect} selectedRequestId={selectedRequestId} filterType="my-requests" />
          </TabsContent>

          {isManagerOrAdmin && (
            <TabsContent value="pending" className="space-y-4">
              <RequestsList onRequestSelect={handleRequestSelect} selectedRequestId={selectedRequestId} filterType="pending" />
            </TabsContent>
          )}
        </UnderlineTabs>
      </div>

      <DetailsPanel
        isOpen={!!selectedRequestId && !!selectedRequest}
        onClose={handleCloseDetails}
        title="Request Details"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <DetailsSection title="Status">
              <Badge variant={getStatusVariant(selectedRequest.status)}>
                {formatStatusText(selectedRequest.status)}
              </Badge>
            </DetailsSection>

            <DetailsSection title="Information">
              <DetailsField 
                label="Request ID" 
                value={(selectedRequest as any).request_number ? formatRequestId((selectedRequest as any).request_number) : 'N/A'} 
              />
              <DetailsField label="Title" value={selectedRequest.title} />
              <DetailsField 
                label="Priority" 
                value={<Badge variant="outline">{selectedRequest.priority}</Badge>} 
              />
              <DetailsField 
                label="Total Amount" 
                value={(selectedRequest as any).total_amount ? `$${(selectedRequest as any).total_amount} ${(selectedRequest as any).currency || 'USD'}` : '-'} 
              />
            </DetailsSection>

            <DetailsSection title="Requester">
              <DetailsField 
                label="Name" 
                value={selectedRequest.profile?.full_name || 'Unknown'} 
              />
              <DetailsField 
                label="Email" 
                value={selectedRequest.profile?.email || '-'} 
              />
            </DetailsSection>

            <DetailsSection title="Dates">
              <DetailsField 
                label="Created" 
                value={format(new Date(selectedRequest.created_at), 'PPp')} 
              />
              {(selectedRequest as any).expected_delivery_date && (
                <DetailsField 
                  label="Expected Delivery" 
                  value={format(new Date((selectedRequest as any).expected_delivery_date), 'PP')} 
                />
              )}
            </DetailsSection>

{selectedRequest.description && (
              <DetailsSection title="Description">
                <p className="text-sm whitespace-pre-wrap">{getDescriptionText(selectedRequest.description)}</p>
              </DetailsSection>
            )}

            <div className="pt-4 space-y-2">
              <Button 
                onClick={() => {
                  const num = (selectedRequest as any)?.request_number;
                  if (num) {
                    navigate(`/request/${formatRequestId(num).toLowerCase()}`);
                  } else {
                    navigate(`/requests/${selectedRequestId}`);
                  }
                }} 
                className="w-full"
              >
                View Full Details
              </Button>
              {canDelete && (
                <Button 
                  onClick={() => setShowDeleteDialog(true)}
                  variant="destructive"
                  className="w-full"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Request
                </Button>
              )}
            </div>
          </div>
        )}
      </DetailsPanel>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this request? This action cannot be undone and will be logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
