import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Mail, Phone, Bell, Edit, Trash2 } from "lucide-react";
import { formatAUDateLong, formatAUDateTimeFull } from "@/lib/dateUtils";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { ReminderAttachments } from "@/components/reminders/ReminderAttachments";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLog } from "@/hooks/useAuditLog";

export default function ReminderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { userRole } = useAuth();
  const isSuperAdmin = userRole === 'super_admin';
  const { logView, logDelete, logComplete } = useAuditLog();

  const { data: reminder, isLoading } = useQuery({
    queryKey: ['reminder', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Reminder not found');
      return data;
    },
    enabled: !!id,
  });

  // Log view when reminder is loaded
  useEffect(() => {
    if (reminder && id) {
      logView('reminders', id, { title: reminder.title });
    }
  }, [reminder, id, logView]);

  const { data: notifications } = useQuery({
    queryKey: ['reminder-notifications', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_notifications')
        .select('*')
        .eq('reminder_id', id)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logDelete('reminders', id!, { title: reminder?.title });
      toast.success('Reminder deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      navigate('/reminders');
    } catch (error: any) {
      toast.error('Failed to delete reminder: ' + error.message);
    }
  };

  const handleMarkCompleted = async () => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      await logComplete('reminders', id!, { title: reminder?.title });
      toast.success('Reminder marked as completed');
      queryClient.invalidateQueries({ queryKey: ['reminder', id] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    } catch (error: any) {
      toast.error('Failed to update reminder: ' + error.message);
    }
  };

  const handleSendNow = () => {
    if (!id) return;
    
    // Show immediate feedback
    toast.info('Sending reminder...');
    
    // Execute in background - don't await
    supabase.functions.invoke('send-reminder-now', {
      body: { reminderId: id },
    }).then(({ data, error }) => {
      if (error) {
        toast.error('Send now failed: ' + error.message);
      } else {
        console.log('send-reminder-now result:', data);
        toast.success('Reminder sent successfully');
        queryClient.invalidateQueries({ queryKey: ['reminder-notifications', id] });
      }
    }).catch((e: any) => {
      toast.error('Send now failed: ' + e.message);
    });
  };

  if (isLoading) {
    return (
      <div className="container-responsive py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reminders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!reminder) {
    return (
      <div className="container-responsive py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reminders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-muted-foreground">Reminder not found</div>
        </div>
      </div>
    );
  }

  const getDaysUntil = () => {
    const today = new Date();
    const reminderDate = new Date(reminder.reminder_date);
    const diffTime = reminderDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntil();
  const channels = reminder.notification_channels as { email?: boolean; sms?: boolean; in_app?: boolean };

  return (
    <div className="container-responsive py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/reminders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold truncate">{reminder.title}</h1>
            <p className="text-sm text-muted-foreground">
              {reminder.reminder_type.replace('_', ' ').charAt(0).toUpperCase() + 
               reminder.reminder_type.replace('_', ' ').slice(1)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap ml-10 sm:ml-0">
          {reminder.status === 'active' && (
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleMarkCompleted}>
              Mark Complete
            </Button>
          )}
          {isSuperAdmin && (
            <Button variant="default" size="sm" className="flex-1 sm:flex-none" onClick={handleSendNow}>
              <Bell className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Send now</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/reminders/edit/${id}`)}>
            <Edit className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Main Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Reminder Details</CardTitle>
            <div className="flex gap-2">
              <Badge variant={reminder.status === 'active' ? 'default' : 'secondary'}>
                {reminder.status}
              </Badge>
              {reminder.is_recurring && (
                <Badge variant="outline">Recurring</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {reminder.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{reminder.description}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Reminder Date & Time</p>
                <p className="font-medium text-sm sm:text-base truncate">{formatAUDateTimeFull(reminder.reminder_date)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Time Until</p>
                <p className="font-medium text-sm sm:text-base">
                  {daysUntil === 0 ? 'Today' : 
                   daysUntil === 1 ? 'Tomorrow' :
                   daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` :
                   `${daysUntil} days`}
                </p>
              </div>
            </div>
          </div>

          {reminder.is_recurring && (
            <div>
              <h3 className="font-semibold mb-2">Recurrence</h3>
              <p className="text-muted-foreground">
                {reminder.recurrence_pattern?.charAt(0).toUpperCase() + 
                 reminder.recurrence_pattern?.slice(1)} - Every {reminder.recurrence_interval || 1}{' '}
                {reminder.recurrence_pattern === 'daily' ? 'day(s)' :
                 reminder.recurrence_pattern === 'weekly' ? 'week(s)' :
                 reminder.recurrence_pattern === 'fortnightly' ? 'fortnight(s)' :
                 reminder.recurrence_pattern === 'monthly' ? 'month(s)' :
                 reminder.recurrence_pattern === 'quarterly' ? 'quarter(s)' :
                 'year(s)'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>How you'll be notified about this reminder</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3">Channels</h3>
            <div className="flex flex-wrap gap-2">
              {channels.email && (
                <Badge variant="outline" className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  Email {reminder.email ? `(${reminder.email})` : ''}
                </Badge>
              )}
              {channels.sms && (
                <Badge variant="outline" className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  SMS {reminder.phone_number ? `(${reminder.phone_number})` : ''}
                </Badge>
              )}
              {channels.in_app && (
                <Badge variant="outline" className="flex items-center gap-2">
                  <Bell className="h-3 w-3" />
                  In-App
                </Badge>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Advance Notice</h3>
            <p className="text-muted-foreground">
              Notifications will be sent{' '}
              {reminder.advance_notice_days && reminder.advance_notice_days.length > 0 ? (
                <>
                  {reminder.advance_notice_days.map((days: number) => 
                    days === 365 ? '1 year' : 
                    days === 1 ? '1 day' : 
                    `${days} days`
                  ).join(', ')} before the reminder date
                </>
              ) : (
                'on the reminder date'
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Attachments */}
      {reminder && <ReminderAttachments reminderId={reminder.id} canEdit={false} />}

      {/* Notification History */}
      {notifications && notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Notification History</CardTitle>
            <CardDescription>Recent notifications sent for this reminder</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {notification.notification_type === 'email' ? (
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium capitalize text-sm">{notification.notification_type}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.recipient} • {notification.days_before || 0}d before
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 ml-7 sm:ml-0">
                    <Badge variant={notification.status === 'sent' ? 'default' : 'destructive'} className="text-xs">
                      {notification.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {formatAUDateLong(notification.sent_at || '')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this reminder and all its notification history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
