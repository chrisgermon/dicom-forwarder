import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, CheckCircle2, XCircle, Clock, AlertCircle, RotateCcw } from "lucide-react";
import { formatAUDateTime } from "@/lib/dateUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SmsLogsViewer() {
  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['reminder-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_notifications')
        .select('*, reminders(title, description, reminder_date)')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      sent: { variant: 'default', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      failed: { variant: 'destructive', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
      pending: { variant: 'secondary', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    };
    const config = variants[status] || { variant: 'outline' };
    return (
      <Badge {...config} className={config.className}>
        {status}
      </Badge>
    );
  };

  const getDaysMessage = (daysBefore: number | null | undefined, reminderDate?: string) => {
    if (typeof daysBefore === 'number') {
      if (daysBefore === 0) return 'Today';
      if (daysBefore === 1) return 'Tomorrow';
      return `in ${daysBefore} days`;
    }
    if (reminderDate) {
      const today = new Date();
      const target = new Date(reminderDate);
      const diff = Math.ceil((target.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / (1000*60*60*24));
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      return `in ${diff} days`;
    }
    return '';
  };

  const buildRetryMessage = (reminder: any, daysBefore: number | null | undefined) => {
    const daysMsg = getDaysMessage(daysBefore, reminder?.reminder_date);
    const desc = reminder?.description ? ` - ${reminder.description}` : '';
    return `Reminder: ${reminder?.title || 'Reminder'}${desc} is ${daysMsg}!`;
  };

  const handleRetry = async (notification: any) => {
    try {
      if (!notification.recipient) {
        toast.error('Missing recipient phone number');
        return;
      }
      if (!notification.reminder_id) {
        toast.error('Missing reminder id');
        return;
      }
      const reminder = notification.reminders as any;
      const message = buildRetryMessage(reminder, notification.days_before);

      const { error } = await supabase.functions.invoke('send-sms-reminder', {
        body: {
          reminderId: notification.reminder_id,
          phoneNumber: notification.recipient,
          message,
        },
      });

      if (error) throw error;
      toast.success('Retry sent');
      await refetch();
    } catch (err: any) {
      console.error('Retry failed', err);
      toast.error(err?.message || 'Retry failed');
    }
  };

  const smsNotifications = notifications?.filter(n => n.notification_type === 'sms') || [];
  const emailNotifications = notifications?.filter(n => n.notification_type === 'email') || [];

  const renderNotificationTable = (notifs: any[], type: 'sms' | 'email') => {
    if (isLoading) {
      return <p className="text-center py-8 text-muted-foreground">Loading logs...</p>;
    }

    if (!notifs || notifs.length === 0) {
      return (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No {type} notifications sent yet</p>
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table storageKey="sms-logs">
          <TableHeader>
            <TableRow>
              <TableHead columnId="status">Status</TableHead>
              <TableHead columnId="reminder">Reminder</TableHead>
              <TableHead columnId="recipient">Recipient</TableHead>
              <TableHead columnId="sent">Sent At</TableHead>
              <TableHead columnId="days">Days Before</TableHead>
              <TableHead columnId="details">Details</TableHead>
              <TableHead columnId="actions">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifs.map((notification) => {
              const reminder = notification.reminders as any;
              return (
                <TableRow key={notification.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(notification.status)}
                      {getStatusBadge(notification.status)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {reminder?.title || 'Unknown'}
                  </TableCell>
                  <TableCell>{notification.recipient || 'N/A'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatAUDateTime(notification.sent_at)}
                  </TableCell>
                  <TableCell>
                    {notification.days_before !== null ? (
                      <Badge variant="outline">{notification.days_before} days</Badge>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {notification.error_message ? (
                      <span className="text-xs text-red-600">{notification.error_message}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Success</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {type === 'sms' && notification.status === 'failed' ? (
                      <Button variant="outline" size="sm" onClick={() => handleRetry(notification)}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Retry
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Notification Logs
        </CardTitle>
        <CardDescription>
          Track SMS and email delivery status for reminders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sms" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sms">
              SMS Logs ({smsNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="email">
              Email Logs ({emailNotifications.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sms" className="mt-4">
            {renderNotificationTable(smsNotifications, 'sms')}
          </TabsContent>
          <TabsContent value="email" className="mt-4">
            {renderNotificationTable(emailNotifications, 'email')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
