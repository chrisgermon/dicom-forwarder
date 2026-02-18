import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatAUDate, formatAUDateTimeFull } from '@/lib/dateUtils';
import { ArrowLeft, Loader2, Package, Calendar, CheckCircle } from 'lucide-react';
import { getDescriptionText } from '@/lib/requestUtils';

interface TonerRequest {
  id: string;
  user_id: string;
  brand_id: string | null;
  location_id: string | null;
  title: string;
  description: string | null;
  printer_model: string;
  toner_type: string | null;
  quantity: number;
  colors_required: string[];
  urgency: string;
  site: string | null;
  predicted_toner_models: string | null;
  eta_delivery: string | null;
  tracking_link: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TonerRequestDetailProps {
  requestId: string;
}

export function TonerRequestDetail({ requestId }: TonerRequestDetailProps) {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [request, setRequest] = useState<TonerRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [etaDelivery, setEtaDelivery] = useState('');
  const [trackingLink, setTrackingLink] = useState('');
  const [predictedModels, setPredictedModels] = useState('');

  const isManagerOrAdmin = ['manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  useEffect(() => {
    loadRequest();
  }, [requestId]);

  const loadRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('toner_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) throw error;
      setRequest(data);
      setEtaDelivery(data.eta_delivery || '');
      setTrackingLink(data.tracking_link || '');
      setPredictedModels(data.predicted_toner_models || '');
    } catch (error) {
      console.error('Error loading toner request:', error);
      toast.error('Failed to load toner request');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('toner_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Status updated successfully');
      loadRequest();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateDetails = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('toner_requests')
        .update({
          eta_delivery: etaDelivery || null,
          tracking_link: trackingLink || null,
          predicted_toner_models: predictedModels || null,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Details updated successfully');
      loadRequest();
    } catch (error) {
      console.error('Error updating details:', error);
      toast.error('Failed to update details');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      submitted: 'default',
      in_progress: 'default',
      ordered: 'default',
      completed: 'success',
      cancelled: 'destructive',
    };
    return colors[status] || 'default';
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
          Toner request not found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/requests')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{request.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Created {formatAUDateTimeFull(request.created_at)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last Updated {formatAUDateTimeFull(request.updated_at)}
                  </p>
                </div>
                <Badge variant={getStatusColor(request.status) as any}>
                  {request.status.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Printer Model</p>
                  <p className="text-sm">{request.printer_model}</p>
                </div>
                {request.toner_type && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Toner Type</p>
                    <p className="text-sm">{request.toner_type}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                  <p className="text-sm">{request.quantity}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Urgency</p>
                  <Badge variant={request.urgency === 'urgent' ? 'destructive' : 'default'}>
                    {request.urgency.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {request.colors_required && request.colors_required.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Colors Required</p>
                  <div className="flex gap-2">
                    {request.colors_required.map((color) => (
                      <Badge key={color} variant="outline">
                        {color}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {request.site && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Site/Location</p>
                  <p className="text-sm">{request.site}</p>
                </div>
              )}

{request.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{getDescriptionText(request.description)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {isManagerOrAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Fulfillment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="predicted_models">Predicted Toner Models</Label>
                  <Textarea
                    id="predicted_models"
                    value={predictedModels}
                    onChange={(e) => setPredictedModels(e.target.value)}
                    placeholder="Enter predicted toner model numbers..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="eta_delivery">ETA Delivery Date</Label>
                  <Input
                    id="eta_delivery"
                    type="date"
                    value={etaDelivery}
                    onChange={(e) => setEtaDelivery(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="tracking_link">Tracking Link</Label>
                  <Input
                    id="tracking_link"
                    type="url"
                    value={trackingLink}
                    onChange={(e) => setTrackingLink(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <Button onClick={handleUpdateDetails} disabled={updating} className="w-full">
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Details'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {isManagerOrAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={request.status}
                  onValueChange={handleUpdateStatus}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {request.eta_delivery && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Calendar className="w-4 h-4" />
                <CardTitle className="text-base">Estimated Delivery</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{formatAUDate(request.eta_delivery)}</p>
              </CardContent>
            </Card>
          )}

          {request.tracking_link && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Package className="w-4 h-4" />
                <CardTitle className="text-base">Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <a href={request.tracking_link} target="_blank" rel="noopener noreferrer">
                    Track Shipment
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {request.completed_at && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <CardTitle className="text-base">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{formatAUDateTimeFull(request.completed_at)}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
