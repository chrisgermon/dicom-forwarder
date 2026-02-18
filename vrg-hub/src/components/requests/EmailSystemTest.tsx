import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';

export function EmailSystemTest() {
  const { toast } = useToast();
  const [testingRequestId, setTestingRequestId] = useState<string | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['test-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hardware_requests')
        .select('id, request_number, title, status, assigned_to, profiles:user_id(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  const sendTestNotification = async (requestId: string, requestNumber: number) => {
    setTestingRequestId(requestId);
    try {
      const { error } = await supabase.functions.invoke('notify-ticket-event', {
        body: {
          requestId,
          requestType: 'hardware',
          eventType: 'commented',
          commentText: 'This is a test comment to verify email notifications are working correctly.'
        }
      });

      if (error) throw error;

      toast({
        title: 'Test email sent!',
        description: `Check the inbox for notification with Reply-To: reply+VRG-${String(requestNumber).padStart(5, '0')}@hub.visionradiology.com.au`,
      });
    } catch (error: any) {
      toast({
        title: 'Error sending test email',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTestingRequestId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email System Test
        </CardTitle>
        <CardDescription>
          Test the bidirectional email system with Mailgun integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
          <h3 className="font-semibold text-sm">Testing Instructions:</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Click "Send Test Email" on any request below</li>
            <li>Check your inbox for the notification email</li>
            <li>Reply to the email with one of these keywords:</li>
            <ul className="list-disc list-inside ml-6 text-xs text-muted-foreground">
              <li><code>approved</code> - Changes status to approved</li>
              <li><code>completed</code> - Changes status to completed</li>
              <li><code>on hold</code> - Changes status to on_hold</li>
              <li><code>in progress</code> - Changes status to in_progress</li>
            </ul>
            <li>Your reply will appear as a comment on the request</li>
            <li>If you're the assigned user, the status will update automatically</li>
          </ol>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Recent Requests:</h3>
          {requests && requests.length > 0 ? (
            requests.map((request: any) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">
                          VRG-{String(request.request_number).padStart(5, '0')}
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm">{request.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Requester: {request.profiles?.full_name || request.profiles?.email || 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Reply-To: <code>reply+VRG-{String(request.request_number).padStart(5, '0')}@hub.visionradiology.com.au</code>
                      </div>
                    </div>
                    <Button
                      onClick={() => sendTestNotification(request.id, request.request_number)}
                      disabled={testingRequestId === request.id}
                      size="sm"
                    >
                      {testingRequestId === request.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Test Email
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No requests found. Create a request first to test the email system.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <h3 className="font-semibold text-sm">What to Verify:</h3>
          </div>
          <ul className="text-sm space-y-1 list-disc list-inside text-green-700 dark:text-green-300">
            <li>Email arrives with proper Reply-To header</li>
            <li>Email threading works (Message-ID, In-Reply-To)</li>
            <li>Reply creates comment in request activity</li>
            <li>Status keywords update request status</li>
            <li>Notifications sent to requester and watchers</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}