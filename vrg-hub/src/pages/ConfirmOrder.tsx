import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDescriptionText } from '@/lib/requestUtils';

interface RequestData {
  id: string;
  title: string;
  description: string;
  total_amount: number;
  currency: string;
  status: string;
}

interface RequesterData {
  name: string;
  email: string;
}

export default function ConfirmOrder() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [valid, setValid] = useState(false);
  const [request, setRequest] = useState<RequestData | null>(null);
  const [requester, setRequester] = useState<RequesterData | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [etaDelivery, setEtaDelivery] = useState('');
  const [trackingLink, setTrackingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('confirm-order', {
        body: { token, method: 'GET' }
      });

      if (error) throw error;

      if (data?.valid) {
        setValid(true);
        setRequest(data.request);
        setRequester(data.requester);
      } else {
        toast.error(data?.error || 'Invalid or expired token');
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      toast.error('Failed to verify confirmation link');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adminEmail || !adminEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('confirm-order', {
        body: {
          token,
          eta_delivery: etaDelivery || null,
          tracking_link: trackingLink || null,
          notes: notes || null,
          admin_email: adminEmail,
        }
      });

      if (error) throw error;

      if (data) {
        setSuccess(true);
        toast.success('Order confirmed successfully!');
      } else {
        toast.error('Failed to confirm order');
      }
    } catch (error) {
      console.error('Error confirming order:', error);
      toast.error('Failed to confirm order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">Order Confirmed!</h2>
              <p className="text-muted-foreground">
                The order has been marked as confirmed and the requester has been notified via email.
              </p>
              <p className="text-sm text-muted-foreground">
                You can close this window now.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!valid || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
              <h2 className="text-2xl font-bold">Invalid Link</h2>
              <p className="text-muted-foreground">
                This confirmation link is invalid or has expired.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Confirm Hardware Order</CardTitle>
          <CardDescription>
            Mark this order as confirmed and notify the requester
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Request Details */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-lg">{request.title}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{getDescriptionText(request.description)}</p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm font-medium">Total Amount</p>
                  <p className="text-lg">{request.currency} {request.total_amount?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Requested By</p>
                  <p className="text-sm">{requester?.name}</p>
                  <p className="text-xs text-muted-foreground">{requester?.email}</p>
                </div>
              </div>
            </div>

            {/* Confirmation Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Your Email Address *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@crowdit.com.au"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Required for audit trail
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="etaDelivery">Estimated Delivery Date (Optional)</Label>
                <Input
                  id="etaDelivery"
                  type="date"
                  value={etaDelivery}
                  onChange={(e) => setEtaDelivery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trackingLink">Tracking Link (Optional)</Label>
                <Input
                  id="trackingLink"
                  type="url"
                  placeholder="https://..."
                  value={trackingLink}
                  onChange={(e) => setTrackingLink(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information about the order..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming Order...
                  </>
                ) : (
                  'Confirm Order & Notify Requester'
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
