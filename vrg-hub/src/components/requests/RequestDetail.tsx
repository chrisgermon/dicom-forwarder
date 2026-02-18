import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, X, StickyNote, UserCog, Trash2 } from 'lucide-react';
// formatAUDateTimeFull not currently used - using format from date-fns
import { RequestStatus } from '@/types/request';
import { RequestComments } from './RequestComments';
import { formatRequestId, getDescriptionText } from '@/lib/requestUtils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { CloseRequestDialog } from './CloseRequestDialog';
import { PrivateNoteDialog } from './PrivateNoteDialog';
import { ReassignDialog } from './ReassignDialog';
import { RequestStatusChanger } from './RequestStatusChanger';
import { AssignToMeButton } from './AssignToMeButton';

interface Request {
  id: string;
  request_number?: number;
  user_id: string;
  title: string;
  description?: string;
  business_justification: string;
  status: RequestStatus;
  priority: string;
  brand_id?: string;
  location_id?: string;
  total_amount?: number;
  currency: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  assigned_group_id?: string;
  category?: string;
  brands?: { display_name: string };
  locations?: { name: string };
  assigned_profile?: { full_name: string; email: string };
  assigned_group?: { name: string };
  request_types?: { name: string };
  request_categories?: { name: string };
}

interface RequestDetailProps {
  requestId?: string;
}

export function RequestDetail({ requestId: propRequestId }: RequestDetailProps) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propRequestId || paramId;
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const { toast } = useToast();
  const { userRole } = useAuth();
  const navigate = useNavigate();

  const isManagerOrAdmin = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  useEffect(() => {
    if (id) {
      loadRequest();
    }
  }, [id]);

  const loadRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          request_number,
          brands:brand_id(display_name),
          locations:location_id(name),
          assigned_group:assigned_group_id(name),
          request_types:request_type_id(name),
          request_categories:category_id(name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      // Fetch assigned profile separately if assigned_to exists
      let assignedProfile = null;
      if (data?.assigned_to) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', data.assigned_to)
          .maybeSingle();
        assignedProfile = profileData;
      }

      setRequest({
        ...data,
        assigned_profile: assignedProfile,
      } as any);
    } catch (error) {
      console.error('Error loading request:', error);
      toast({
        title: 'Error',
        description: 'Failed to load request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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

  const getStatusBadge = (status: RequestStatus) => {
    const variants: Record<string, { variant: any; label: string }> = {
      open: { variant: 'default', label: 'Open' },
      in_progress: { variant: 'warning', label: 'In Progress' },
      completed: { variant: 'success', label: 'Complete' },
    };

    const config = variants[status] || variants.open;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleDeleteRequest = async () => {
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', request!.id);

      if (error) throw error;

      toast({
        title: 'Request Deleted',
        description: 'The request has been permanently deleted',
      });

      navigate('/requests');
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete request',
        variant: 'destructive',
      });
    }
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
    <div className="min-h-screen bg-muted/30">
      {/* Action Buttons Bar */}
      <div className="border-b bg-background mb-4">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <AssignToMeButton
              requestId={request.id}
              table="tickets"
              currentAssignee={request.assigned_to}
              assignedGroupId={request.assigned_group_id}
              onSuccess={loadRequest}
              variant="default"
              size="sm"
            />
            <Button variant="outline" size="sm" onClick={() => setCloseDialogOpen(true)}>
              <X className="w-4 h-4 mr-2" />
              Close with Response
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNoteDialogOpen(true)}>
              <StickyNote className="w-4 h-4 mr-2" />
              Private Note
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReassignDialogOpen(true)}>
              <UserCog className="w-4 h-4 mr-2" />
              Re-Assign
            </Button>
            {isManagerOrAdmin && (
              <Button variant="outline" size="sm" onClick={handleDeleteRequest} className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CloseRequestDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        requestId={request.id}
        requestType="ticket"
        onSuccess={loadRequest}
      />
      
      <PrivateNoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        requestId={request.id}
        onSuccess={loadRequest}
      />
      
      <ReassignDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        requestId={request.id}
        requestType="ticket"
        onSuccess={loadRequest}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Email-style Message View */}
        <div className="lg:col-span-2 space-y-4">
          {/* Ticket Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    VR
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <h3 className="font-semibold text-lg">Requester</h3>
                      <p className="text-sm text-muted-foreground">First User Email</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.created_at), 'dd/MM/yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">To:</span>
                    <span className="text-sm">support@crowdit.com.au</span>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Request Number */}
              {request.request_number && (
                <div className="mb-4">
                  <span className="font-mono text-sm font-semibold">
                    [{formatRequestId(request.request_number)}]
                  </span>
                </div>
              )}

              {/* Ticket Content */}
              <div className="space-y-4">
              <div>
                  <h2 className="text-xl font-semibold mb-2">{request.title}</h2>
                  {request.description && (
                    <p className="text-muted-foreground whitespace-pre-wrap">{getDescriptionText(request.description)}</p>
                  )}
                </div>

                {request.business_justification && (() => {
                  try {
                    const parsed = JSON.parse(request.business_justification);
                    if (typeof parsed === 'object' && parsed !== null) {
                      return (
                        <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                          <h3 className="font-semibold text-sm text-muted-foreground mb-2">Request Details</h3>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(parsed).map(([key, value]) => (
                              <div key={key}>
                                <p className="text-xs font-medium text-muted-foreground capitalize">
                                  {key.replace(/_/g, ' ')}
                                </p>
                                <p className="text-sm mt-0.5">
                                  {Array.isArray(value) ? value.join(', ') : String(value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch (e) {
                    // Not JSON, display as text
                  }
                  return (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-sm whitespace-pre-wrap">
                        {request.business_justification}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-4 text-sm">
                  {request.brands?.display_name && (
                    <div>
                      <span className="font-medium">Company: </span>
                      <span>{request.brands.display_name}</span>
                    </div>
                  )}
                  {request.locations?.name && (
                    <div>
                      <span className="font-medium">Location: </span>
                      <span>{request.locations.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments/Activity Section */}
          <RequestComments requestId={request.id} requestType="ticket" />
        </div>

        {/* Right Sidebar: Ticket Information */}
        <div className="space-y-4">
          {/* Request Information */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">Request Information</h3>
              
              <div>
                <p className="text-xs text-muted-foreground">Date Reported</p>
                <p className="text-sm">{format(new Date(request.created_at), 'dd/MM/yyyy h:mm a')}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm">{format(new Date(request.updated_at), 'dd/MM/yyyy h:mm a')}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Request Type</p>
                <p className="text-sm">{request.request_types?.name || 'General Request'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                {getStatusBadge(request.status)}
              </div>

              {/* Status Changer */}
              <Separator />
              <RequestStatusChanger
                requestId={request.id}
                currentStatus={request.status}
                requestUserId={request.user_id}
                onStatusChanged={loadRequest}
              />

              <div>
                <p className="text-xs text-muted-foreground">Priority</p>
                {getPriorityBadge(request.priority)}
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="text-sm">{request.request_categories?.name || request.category || 'Uncategorized'}</p>
              </div>

              {request.total_amount && (
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-sm font-semibold">{request.currency} {request.total_amount.toFixed(2)}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground">Assigned Group</p>
                <p className="text-sm">{request.assigned_group?.name || 'No group assigned'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Assigned To</p>
                {request.assigned_profile ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {request.assigned_profile.full_name?.substring(0, 2).toUpperCase() || 'AA'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{request.assigned_profile.full_name || request.assigned_profile.email}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Unassigned</p>
                    <AssignToMeButton
                      requestId={request.id}
                      table="tickets"
                      currentAssignee={request.assigned_to}
                      assignedGroupId={request.assigned_group_id}
                      onSuccess={loadRequest}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* End-User Details */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">End-User Details</h3>
              
              {request.brands?.display_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Site</p>
                  <p className="text-sm text-primary">{request.brands.display_name}</p>
                </div>
              )}

              {request.locations?.name && (
                <div>
                  <p className="text-xs text-muted-foreground">Contact Address</p>
                  <p className="text-sm">{request.locations.name}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
