import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Send, MessageSquare, UserCheck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { RequestStatus } from '@/types/request';

interface RequestActivityProps {
  requestId: string;
  requestType: 'hardware' | 'department';
}

interface ActivityItem {
  id: string;
  activity_type: string;
  old_value: string | null;
  new_value: string | null;
  comment: string | null;
  is_internal: boolean;
  created_at: string;
  user_id: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface AssignableUser {
  id: string;
  full_name: string;
  email: string;
}

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Complete' },
];

export function RequestActivity({ requestId, requestType }: RequestActivityProps) {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isManagerOrAdmin = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  // Fetch current request details
  const { data: request } = useQuery({
    queryKey: ['request-detail', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hardware_requests')
        .select('status, assigned_to, user_id')
        .eq('id', requestId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch activity feed
  const { data: activities, isLoading } = useQuery({
    queryKey: ['request-activity', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('request_activity')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = data?.map(a => a.user_id).filter(Boolean) || [];
      const uniqueUserIds = [...new Set(userIds)];
      
      let profilesMap: Record<string, { full_name: string; email: string }> = {};
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', uniqueUserIds);
        
        if (profiles) {
          profilesMap = Object.fromEntries(
            profiles.map(p => [p.id, { full_name: p.full_name || '', email: p.email || '' }])
          );
        }
      }

      // Combine activity with profiles
      return data?.map(activity => ({
        ...activity,
        profiles: activity.user_id ? profilesMap[activity.user_id] : undefined
      })) as ActivityItem[];
    },
  });

  // Fetch assignable users
  const { data: assignableUsers } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data as AssignableUser[];
    },
    enabled: isManagerOrAdmin,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (newComment: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('request_activity')
        .insert({
          request_id: requestId,
          request_type: requestType,
          user_id: user.id,
          activity_type: 'comment',
          comment: newComment,
          is_internal: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-activity', requestId] });
      setComment('');
      toast.success('Comment added');
    },
    onError: (error: any) => {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: RequestStatus) => {
      const { error } = await supabase
        .from('hardware_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-detail', requestId] });
      queryClient.invalidateQueries({ queryKey: ['request-activity', requestId] });
      toast.success('Status updated');
    },
    onError: (error: any) => {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    },
  });

  // Assign user mutation
  const assignUserMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      const { error } = await supabase
        .from('hardware_requests')
        .update({ assigned_to: userId })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-detail', requestId] });
      queryClient.invalidateQueries({ queryKey: ['request-activity', requestId] });
      toast.success('Assignment updated');
    },
    onError: (error: any) => {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    },
  });

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      await addCommentMutation.mutateAsync(comment);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <AlertCircle className="h-4 w-4" />;
      case 'assignment_change':
        return <UserCheck className="h-4 w-4" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const formatActivityMessage = (activity: ActivityItem) => {
    switch (activity.activity_type) {
      case 'status_change':
        return `changed status from ${activity.old_value} to ${activity.new_value}`;
      case 'assignment_change':
        if (!activity.old_value && activity.new_value) {
          return 'assigned this request';
        } else if (activity.old_value && !activity.new_value) {
          return 'unassigned this request';
        }
        return 'changed assignment';
      case 'comment':
        return activity.comment || '';
      default:
        return activity.comment || 'performed an action';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Activity & Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Management Controls */}
        {isManagerOrAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={request?.status}
                onValueChange={(value) => updateStatusMutation.mutate(value as RequestStatus)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select
                value={request?.assigned_to || 'unassigned'}
                onValueChange={(value) =>
                  assignUserMutation.mutate(value === 'unassigned' ? null : value)
                }
                disabled={assignUserMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignableUsers?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Activity Feed */}
        <div className="space-y-4">
          {activities && activities.length > 0 ? (
            activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {activity.profiles?.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getActivityIcon(activity.activity_type)}
                      <p className="text-sm">
                        <span className="font-semibold">
                          {activity.profiles?.full_name || 'Unknown user'}
                        </span>{' '}
                        {formatActivityMessage(activity)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(activity.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No activity yet
            </p>
          )}
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleSubmitComment} className="space-y-4 pt-4 border-t">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment or update..."
            className="min-h-[100px]"
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!comment.trim() || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Add Comment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
