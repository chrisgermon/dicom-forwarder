import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Loader2, CheckCircle, AlertCircle, Clock, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export default function EmailTestingDashboard() {
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  // Fetch recent requests for testing
  const { data: recentRequests } = useQuery({
    queryKey: ['recent-requests-for-testing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, request_number, title, status')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent email logs
  const { data: emailLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['email-logs-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const sendBasicTest = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading('basic');
    try {
      const { error } = await supabase.functions.invoke('send-test-email', {
        body: { recipientEmail: testEmail }
      });

      if (error) throw error;

      toast.success('Test email sent successfully!');
      refetchLogs();
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const sendRequestNotificationTest = async (requestId: string) => {
    setLoading(`request-${requestId}`);
    try {
      const { error } = await supabase.functions.invoke('notify-ticket-event', {
        body: {
          ticketId: requestId,
          event: 'created',
          testMode: true,
          testEmail: testEmail || undefined
        }
      });

      if (error) throw error;

      toast.success('Request notification test sent!');
      refetchLogs();
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const sendSampleEmails = async () => {
    setLoading('samples');
    try {
      const { error } = await supabase.functions.invoke('send-sample-emails', {
        body: { recipientEmail: testEmail || 'chris@crowdit.com.au' }
      });

      if (error) throw error;

      toast.success('Sample emails sent successfully!');
      refetchLogs();
    } catch (error: any) {
      console.error('Error sending samples:', error);
      toast.error('Failed to send samples: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Mail className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Testing Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Test and monitor all email notifications in the system
          </p>
        </div>

        <Tabs defaultValue="quick-test" className="space-y-6">
          <TabsList>
            <TabsTrigger value="quick-test">Quick Tests</TabsTrigger>
            <TabsTrigger value="request-notifications">Request Notifications</TabsTrigger>
            <TabsTrigger value="logs">Email Logs</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
          </TabsList>

          {/* Quick Tests Tab */}
          <TabsContent value="quick-test" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Email Address</CardTitle>
                <CardDescription>
                  Set the email address where test emails should be sent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your-email@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button variant="outline" onClick={() => setTestEmail('')}>
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Basic Test Email
                  </CardTitle>
                  <CardDescription>
                    Send a simple test email to verify email system is working
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={sendBasicTest}
                    disabled={!testEmail || loading === 'basic'}
                    className="w-full"
                  >
                    {loading === 'basic' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Test Email
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Sample Notification Emails
                  </CardTitle>
                  <CardDescription>
                    Send sample emails for different notification types
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={sendSampleEmails}
                    disabled={loading === 'samples'}
                    variant="outline"
                    className="w-full"
                  >
                    {loading === 'samples' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Sample Emails
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Request Notifications Tab */}
          <TabsContent value="request-notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Request Notifications</CardTitle>
                <CardDescription>
                  Send test notifications for recent requests to verify notification workflows
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!testEmail && (
                  <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Set a test email address in the "Quick Tests" tab first
                    </p>
                  </div>
                )}
                
                <div className="space-y-3">
                  {recentRequests?.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          Request #{request.request_number} - {request.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Status: {request.status}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => sendRequestNotificationTest(request.id)}
                        disabled={!testEmail || loading === `request-${request.id}`}
                      >
                        {loading === `request-${request.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Test Notification'
                        )}
                      </Button>
                    </div>
                  ))}
                  
                  {!recentRequests?.length && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No recent requests found. Create a request first to test notifications.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Email Logs</CardTitle>
                <CardDescription>
                  View the most recent email notifications sent by the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {emailLogs?.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-4 border rounded-lg"
                      >
                        <div className="mt-1">{getStatusIcon(log.status)}</div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{log.subject}</div>
                            <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                              {log.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            To: {log.recipient_email}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Type: {log.email_type} | Sent: {new Date(log.sent_at).toLocaleString()}
                          </div>
                          {log.error_message && (
                            <div className="text-sm text-red-500 mt-2">
                              Error: {log.error_message}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {!emailLogs?.length && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No email logs found. Send a test email to see logs appear here.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration Guide</CardTitle>
                <CardDescription>
                  How to configure email notifications for your forms and requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">1. Form Template Notifications</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Configure who receives notifications when forms are submitted:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                      <li>Go to Form Templates page</li>
                      <li>Edit a form template</li>
                      <li>Add notification recipients in the Notification Settings section</li>
                      <li>Choose notification level (all events, new only, or updates only)</li>
                      <li>Enable SMS notifications if needed</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">2. Approval Workflows</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Set up approval notifications for forms that require approval:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                      <li>In Form Template editor, enable "Requires Approval"</li>
                      <li>Select an approver from the user list</li>
                      <li>Approver will receive email when form is submitted</li>
                      <li>Submitter receives email when request is approved/declined</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">3. Newsletter Notifications</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Newsletter contributors and editors receive automated reminders:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                      <li>Assign contributors in Newsletter Assignments</li>
                      <li>Set reminder schedules in Newsletter Cycles</li>
                      <li>Automated emails sent based on deadline dates</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">4. User Account Requests</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Configure notifications for user account creation and offboarding:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                      <li>Set up notification rules in Request Types Manager</li>
                      <li>Assign team members to receive notifications</li>
                      <li>Configure routing rules for automatic assignment</li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-2">Testing Checklist</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" />
                        Send basic test email
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" />
                        Test form submission notification
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" />
                        Test approval workflow emails
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" />
                        Test status change notifications
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" />
                        Test newsletter reminder emails
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" />
                        Verify email logs are being created
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
