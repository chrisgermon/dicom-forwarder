import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, ExternalLink, Newspaper, FileText, ShoppingCart, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

function getNotificationIcon(type?: string | null) {
  switch (type) {
    case "news_article":
      return <Newspaper className="h-4 w-4 text-blue-500" />;
    case "hardware_request":
      return <ShoppingCart className="h-4 w-4 text-green-500" />;
    case "marketing_request":
      return <FileText className="h-4 w-4 text-purple-500" />;
    case "user_account_request":
      return <UserPlus className="h-4 w-4 text-orange-500" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getNotificationBadgeClass(type?: string | null) {
  switch (type) {
    case "news_article":
      return "bg-blue-500/10 text-blue-500";
    case "hardware_request":
      return "bg-green-500/10 text-green-500";
    case "marketing_request":
      return "bg-purple-500/10 text-purple-500";
    case "user_account_request":
      return "bg-orange-500/10 text-orange-500";
    default:
      return "bg-muted";
  }
}

function getNotificationLabel(type?: string | null) {
  const labels: Record<string, string> = {
    news_article: "News",
    hardware_request: "Request",
    marketing_request: "Marketing",
    user_account_request: "User Account",
    helpdesk_ticket: "Support",
  };

  if (!type) return "Notification";
  return labels[type] || "Notification";
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['notifications-list', user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to load notifications', error);
        toast.error('Unable to load notifications');
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to mark notification as read', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: () => {
      toast.error('Failed to mark notification as read');
    },
  });

  const markAsUnreadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: false })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to mark notification as unread', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: () => {
      toast.error('Failed to mark notification as unread');
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Failed to mark all notifications as read', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      toast.success('All notifications marked as read');
    },
    onError: () => {
      toast.error('Failed to mark all notifications as read');
    },
  });

  const handleNavigate = (notification: Notification) => {
    if (!notification.reference_url) return;

    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    navigate(notification.reference_url);
  };

  const errorMessage = error instanceof Error ? error.message : 'Something went wrong while loading notifications.';

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="Notifications"
        description="Stay on top of updates that matter to you"
        actions={
          notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending || unreadCount === 0}
            >
              <Check className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent notifications</CardTitle>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-16 rounded-full" />
                          <Skeleton className="h-3 w-24 ml-auto" />
                        </div>
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-full max-w-md" />
                        <div className="flex gap-2 pt-2">
                          <Skeleton className="h-8 w-28" />
                          <Skeleton className="h-8 w-24" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load notifications</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={<Bell />}
              title="No notifications yet"
              description="We will let you know when something needs your attention."
            />
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const type = notification.type;
                const createdAt = notification.created_at
                  ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
                  : null;

                return (
                  <Card
                    key={notification.id}
                    className={`transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${
                      notification.is_read ? '' : 'border-l-4 border-l-primary bg-accent/5'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${getNotificationBadgeClass(type)}`}>
                          {getNotificationIcon(type)}
                        </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{getNotificationLabel(type)}</Badge>
                            {!notification.is_read && <span className="text-xs font-medium text-primary">New</span>}
                          </div>
                          {createdAt && (
                            <span className="text-xs text-muted-foreground">{createdAt}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-base font-semibold leading-tight">{notification.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {notification.reference_url && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleNavigate(notification)}
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View details
                            </Button>
                          )}
                          {!notification.is_read ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                              disabled={markAsReadMutation.isPending}
                            >
                              Mark as read
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsUnreadMutation.mutate(notification.id)}
                              disabled={markAsUnreadMutation.isPending}
                            >
                              Mark as unread
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
