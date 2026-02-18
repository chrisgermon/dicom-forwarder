import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, X, UserCog, Edit, Reply } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { formatRequestId, getDescriptionText } from '@/lib/requestUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { RequestActivityFeed } from '@/components/requests/RequestActivityFeed';
import { RequestUpdateForm } from '@/components/requests/RequestUpdateForm';
import { AssignToMeButton } from '@/components/requests/AssignToMeButton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { CloseRequestDialog } from '@/components/requests/CloseRequestDialog';
import { ReassignDialog } from '@/components/requests/ReassignDialog';
import { useAuth } from '@/hooks/useAuth';
import { useAuditLog } from '@/hooks/useAuditLog';
import { CCEmailsManager } from '@/components/requests/CCEmailsManager';
import { RequestStatusChanger } from '@/components/requests/RequestStatusChanger';
import { RequestPriorityChanger } from '@/components/requests/RequestPriorityChanger';
import { RequestTypeChanger } from '@/components/requests/RequestTypeChanger';
import { RequestCategoryChanger } from '@/components/requests/RequestCategoryChanger';
import DOMPurify from 'dompurify';

type UnifiedRequest = {
  id: string;
  request_number?: number;
  title?: string;
  description?: string;
  status: string;
  priority?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  assigned_to?: string | null;
  assigned_group_id?: string | null;
  department?: string;
  form_data?: Record<string, any>;
  business_justification?: string;
  clinic_name?: string;
  total_amount?: number;
  currency?: string;
  expected_delivery_date?: string;
  manager_approved_at?: string;
  manager_approval_notes?: string;
  admin_approved_at?: string;
  admin_approval_notes?: string;
  declined_at?: string;
  decline_reason?: string;
  locations?: { name: string };
  brands?: { display_name: string };
  profile?: { full_name: string; email: string };
  type: 'hardware' | 'department';
  cc_emails?: string[];
};

export default function RequestDetail() {
  const { requestNumber, id, identifier } = useParams<{ requestNumber?: string; id?: string; identifier?: string }>();
  const navigate = useNavigate();
  const requestParam = identifier || requestNumber || id;
  
  const { user, userRole } = useAuth();
  const { logView } = useAuditLog();
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);

  const isManagerOrAdmin = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  // Query to find request by the formatted ID or UUID
  const { data: request, isLoading, error, refetch } = useQuery<UnifiedRequest | null>({
    queryKey: ['request-by-identifier', requestParam],
    queryFn: async (): Promise<UnifiedRequest | null> => {
      if (!requestParam) return null;

      // Check if it's a UUID (starts with a hex pattern)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestParam);

      // Extract numeric part from identifiers like VRG-23, vrg-00023, etc.
      const numberMatch = requestParam.match(/(\d+)/);
      const targetNumber = numberMatch ? parseInt(numberMatch[1], 10) : NaN;
      
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          profile:profiles!user_id(full_name, email),
          assigned_profile:profiles!assigned_to(full_name, email),
          request_type:request_types(name),
          category:request_categories(name),
          brands:brands(display_name),
          locations:locations(name)
        `)
        .eq(isUUID ? 'id' : 'request_number', isUUID ? requestParam : targetNumber)
        .maybeSingle();

      if (ticketError) throw ticketError;
      if (ticket) {
        const t = ticket as any;
        return {
          ...ticket,
          type: 'department' as const,
          profile: t.profile || undefined,
          assigned_profile: t.assigned_profile || undefined,
          request_type: t.request_type || undefined,
          category: t.category || undefined,
          brands: t.brands ? { display_name: t.brands.display_name } : undefined,
          locations: t.locations ? { name: t.locations.name } : undefined,
        } as any;
      }

      // Fallback to old hardware_requests table
      if (isUUID) {
        const { data: hwRequest } = await supabase
          .from('hardware_requests')
          .select(`
            *,
            request_number,
            brands:brand_id(display_name),
            locations:location_id(name)
          `)
          .eq('id', requestParam)
          .maybeSingle();

        if (hwRequest) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', hwRequest.user_id)
            .maybeSingle();

          let assignedProfile: { full_name: string; email: string } | null = null;
          if (hwRequest.assigned_to) {
            const { data: ap } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', hwRequest.assigned_to)
              .maybeSingle();
            assignedProfile = ap;
          }
          
          return ({ 
            ...hwRequest, 
            type: 'hardware' as const, 
            profile: profile || undefined,
            assigned_profile: assignedProfile || undefined,
          } as any);
        }
      } else {
        const { data: hwRequest } = await supabase
          .from('hardware_requests')
          .select(`
            *,
            request_number,
            brands:brand_id(display_name),
            locations:location_id(name)
          `)
          .eq('request_number', targetNumber)
          .maybeSingle();

        if (hwRequest) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', hwRequest.user_id)
            .maybeSingle();

          let assignedProfile: { full_name: string; email: string } | null = null;
          if (hwRequest.assigned_to) {
            const { data: ap } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', hwRequest.assigned_to)
              .maybeSingle();
            assignedProfile = ap;
          }
          
          return ({ 
            ...hwRequest, 
            type: 'hardware' as const, 
            profile: profile || undefined,
            assigned_profile: assignedProfile || undefined,
          } as any);
        }
      }

      return null;
    },
    enabled: !!requestParam,
  });

  // Redirect UUID-based URLs to pretty request-number URLs when available
  useEffect(() => {
    if (!request || !requestParam) return;
    const hasNum = (request as any).request_number;
    const isUuidPath = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestParam);
    if (hasNum && isUuidPath) {
      const pretty = `/request/${formatRequestId((request as any).request_number).toLowerCase()}`;
      navigate(pretty, { replace: true });
    }
  }, [request, requestParam, navigate]);

  // Log view when request is loaded
  useEffect(() => {
    if (request?.id) {
      logView('tickets', request.id, { 
        title: request.title, 
        request_number: (request as any).request_number 
      });
    }
  }, [request?.id, logView]);

  const canEdit = isManagerOrAdmin || user?.id === request?.user_id;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      inbox: 'default',
      open: 'default',
      draft: 'secondary',
      submitted: 'default',
      manager_approved: 'default',
      approved: 'success',
      ordered: 'default',
      delivered: 'success',
      declined: 'destructive',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/requests')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Request {requestParam} not found. It may have been deleted or you may not have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isDepartmentRequest = request.type === 'department';

  // Helper to detect if content is HTML
  const isHTML = (str: string) => /<[a-z][\s\S]*>/i.test(str);

  // Parse form data from business_justification if it's JSON
  const parseFormData = () => {
    if (!request.business_justification) return null;
    try {
      const parsed = JSON.parse(request.business_justification);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch (e) {
      // Not JSON
    }
    return null;
  };

  const formData = isDepartmentRequest ? parseFormData() : null;

  // Check if this request came from email
  const isFromEmail = (request as any).source === 'email' || 
                      (request as any).metadata?.email_message_id;

  // Get the primary content to display (prefer description, avoid duplicates)
  const getPrimaryContent = () => {
    // Helper to extract a primary description from an object
    const extractFromObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return null;
      const primary = (obj as any).field_description ?? (obj as any).description ?? (obj as any).details ?? null;
      if (primary == null) return null;
      if (Array.isArray(primary)) return primary.join(', ');
      const str = String(primary).trim();
      return str.length ? str : null;
    };

    // 1) Prefer description from structured form data (business_justification JSON)
    if (formData) {
      const fromForm = extractFromObject(formData);
      if (fromForm) return fromForm;
    }

    // 2) Try parsing request.description as JSON and extract common fields
    if (request.description) {
      try {
        const raw: any = request.description as any;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const fromParsed = extractFromObject(parsed);
        if (fromParsed) return fromParsed;
      } catch (e) {
        // not JSON, fall through
      }
    }

    // 3) Fallback to plain text values and avoid duplicates vs justification
    const desc = (request.description ? String(request.description) : '').trim();

    // If justification is JSON, try to extract text for comparison
    let justText = (request.business_justification || '').trim();
    if (justText) {
      try {
        const jp = JSON.parse(justText);
        const ex = extractFromObject(jp);
        if (ex) justText = ex;
      } catch {
        // not JSON, keep as-is
      }
    }

    if (desc && justText) {
      const descStripped = desc.replace(/<[^>]*>/g, '').trim();
      const justStripped = justText.replace(/<[^>]*>/g, '').trim();
      if (descStripped === justStripped) {
        return isHTML(desc) ? desc : (isHTML(justText) ? justText : desc);
      }
    }

    return desc || justText || '';
  };

  const rawContent = getPrimaryContent();
  // Apply email cleaning using the utility function
  const primaryContent = getDescriptionText(rawContent, isFromEmail);
  const shouldRenderAsHTML = isHTML(primaryContent);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header with Back Button */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/requests')}
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requests
          </Button>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <AssignToMeButton
              requestId={request.id}
              table={isDepartmentRequest ? 'tickets' : 'hardware_requests'}
              currentAssignee={request.assigned_to ?? null}
              assignedGroupId={request.assigned_group_id ?? null}
              onSuccess={() => refetch()}
              variant="outline"
              size="sm"
            />
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/requests/${request.id}/edit`)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Request
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                document.getElementById('update-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              <Reply className="w-4 h-4 mr-2" />
              Reply
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCloseDialogOpen(true)}>
              <X className="w-4 h-4 mr-2" />
              Close with Response
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReassignDialogOpen(true)}>
              <UserCog className="w-4 h-4 mr-2" />
              Re-Assign
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CloseRequestDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        requestId={request.id}
        requestType={request.type}
      />
      
      <ReassignDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        requestId={request.id}
        requestType={request.type}
        onSuccess={() => {
          // Query will be invalidated by the dialog itself
        }}
      />

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Email-style Message View */}
          <div className="lg:col-span-2 space-y-4">
            {/* Ticket Header */}
            <Card className="shadow-sm border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {request.profile?.full_name?.substring(0, 2).toUpperCase() || 'VR'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <h3 className="font-semibold text-lg">{request.profile?.full_name || 'Unknown User'}</h3>
                        <p className="text-sm text-muted-foreground">First User Email</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(request.created_at), 'dd/MM/yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-medium text-muted-foreground">To:</span>
                      <span className="text-sm">{request.profile?.email || 'support@crowdit.com.au'}</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Ticket Content */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold">{request.title}</h2>
                  </div>

                  {primaryContent && (
                    <div className="bg-muted/30 p-5 rounded-lg border border-border/50">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Description</h3>
                      {shouldRenderAsHTML ? (
                        <div 
                          className="text-sm prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ 
                            __html: DOMPurify.sanitize(primaryContent) 
                          }}
                        />
                      ) : (
                        <div className="text-sm whitespace-pre-wrap">
                          {primaryContent}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Display form data fields for department requests */}
                  {formData && (
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">Additional Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(formData).map(([key, value]) => {
                          // Skip empty values and description/title fields already rendered above
                          if (!value || value === '' || ['description', 'details', 'field_description', 'field_title'].includes(key)) return null;
                          
                          return (
                            <div key={key}>
                              <p className="text-xs font-medium text-muted-foreground capitalize">
                                {key.replace(/_/g, ' ')}
                              </p>
                              <p className="text-sm mt-0.5">
                                {Array.isArray(value) ? value.join(', ') : String(value)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Show company and location for all request types */}
                  {(request.brands?.display_name || request.locations?.name) && (
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
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Update Form */}
            <Card className="shadow-sm" id="update-form">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-1 bg-primary rounded-full" />
                  <h3 className="font-semibold text-lg">Add Update</h3>
                </div>
                <RequestUpdateForm requestId={request.id} />
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar: Ticket Information */}
          <div className="space-y-4">
            {/* Ticket Information */}
            <Card className="border-primary/20 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-1 bg-primary rounded-full" />
                  <h3 className="font-semibold text-lg">Request Information</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Request ID</p>
                    <p className="text-base font-mono font-semibold text-primary">{request.request_number ? formatRequestId(request.request_number) : 'N/A'}</p>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Date Reported</p>
                    <p className="text-sm">{format(new Date(request.created_at), 'dd/MM/yyyy h:mm a')}</p>
                  </div>

                  {(request.brands?.display_name || request.locations?.name) && (
                    <>
                      <Separator />
                      
                      {request.brands?.display_name && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Company</p>
                          <p className="text-sm font-medium">{request.brands.display_name}</p>
                        </div>
                      )}

                      {request.locations?.name && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Location</p>
                          <p className="text-sm font-medium">{request.locations.name}</p>
                        </div>
                      )}
                    </>
                  )}

                  <Separator />

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Request Type</p>
                    {request.type === 'department' ? (
                      <RequestTypeChanger
                        requestId={request.id}
                        currentTypeId={(request as any).request_type_id}
                        requestUserId={request.user_id}
                        onTypeChanged={() => {
                          window.location.reload();
                        }}
                      />
                    ) : (
                      <p className="text-sm">{(request as any).request_type?.name || 'General Request'}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Category</p>
                    {request.type === 'department' ? (
                      <RequestCategoryChanger
                        requestId={request.id}
                        currentCategoryId={(request as any).category_id}
                        requestUserId={request.user_id}
                        onCategoryChanged={() => {
                          window.location.reload();
                        }}
                      />
                    ) : (
                      <p className="text-sm">{(request as any).category?.name || 'N/A'}</p>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Status</p>
                    {request.type === 'department' ? (
                      <RequestStatusChanger
                        requestId={request.id}
                        currentStatus={request.status as any}
                        requestUserId={request.user_id}
                        onStatusChanged={() => {
                          window.location.reload();
                        }}
                      />
                    ) : (
                      <Badge variant={getStatusColor(request.status) as any} className="text-xs px-3 py-1">
                        {getStatusLabel(request.status)}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Priority</p>
                    <RequestPriorityChanger
                      requestId={request.id}
                      currentPriority={request.priority as any}
                      requestUserId={request.user_id}
                      requestType={request.type}
                      onPriorityChanged={() => {
                        window.location.reload();
                      }}
                    />
                  </div>

                  {request.total_amount && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Amount</p>
                        <p className="text-lg font-semibold text-primary">{request.currency} {request.total_amount.toLocaleString()}</p>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned To</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setReassignDialogOpen(true)}
                      >
                        <UserCog className="w-3 h-3 mr-1" />
                        Change
                      </Button>
                    </div>
                    {(request as any).assigned_profile ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-purple-500 text-white">
                            {(request as any).assigned_profile.full_name?.substring(0, 2).toUpperCase() || 'NA'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{(request as any).assigned_profile.full_name || 'Assigned'}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Unassigned</p>
                    )}
                  </div>

                  <Separator />

                  <CCEmailsManager
                    requestId={request.id}
                    requestType={request.type}
                    currentEmails={request.cc_emails || []}
                  />
                </div>
              </CardContent>
            </Card>

            {/* End-User Details */}
            <Card className="border-primary/20 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-1 bg-primary rounded-full" />
                  <h3 className="font-semibold text-lg">End-User Details</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Client</p>
                    <p className="text-sm font-medium text-primary">{request.profile?.full_name || 'Unknown'}</p>
                  </div>

                  {!isDepartmentRequest && request.brands?.display_name && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Site</p>
                      <p className="text-sm font-medium text-primary">{request.brands.display_name}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Email Address</p>
                    <p className="text-sm">{request.profile?.email || 'N/A'}</p>
                  </div>
                </div>

                {!isDepartmentRequest && request.locations?.name && (
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Address</p>
                    <p className="text-sm">{request.locations.name}</p>
                  </div>
                )}

                {/* Client Notes removed to avoid duplication with main description */}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <RequestActivityFeed requestId={request.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
