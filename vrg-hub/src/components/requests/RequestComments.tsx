import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Send, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { sanitizeHtml } from '@/lib/sanitizer';

interface RequestCommentsProps {
  requestId: string;
  requestType: string;
}

interface Comment {
  id: string;
  author_name: string;
  author_email: string;
  content: string;
  content_html: string | null;
  is_internal: boolean;
  created_at: string;
  user_id: string | null;
  attachments?: string[] | null;
}

export function RequestComments({ requestId }: RequestCommentsProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});

  // Fetch comments
  const { data: comments, isLoading } = useQuery({
    queryKey: ['request-comments', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('request_comments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Generate signed URLs for all attachments
      const urls: Record<string, string> = {};
      for (const comment of (data as Comment[])) {
        if (comment.attachments) {
          for (const attachment of comment.attachments) {
            const { data: urlData } = await supabase.storage
              .from('request-attachments')
              .createSignedUrl(attachment, 3600);
            if (urlData?.signedUrl) {
              urls[attachment] = urlData.signedUrl;
            }
          }
        }
      }
      setAttachmentUrls(urls);
      
      return data as Comment[];
    },
  });

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async (newContent: string) => {
      if (!user || !profile) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('request_comments')
        .insert({
          request_id: requestId,
          user_id: user.id,
          author_name: profile.full_name || profile.email,
          author_email: profile.email,
          content: newContent,
          content_html: newContent,
          is_internal: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification via edge function
      await supabase.functions.invoke('notify-comment', {
        body: {
          requestId,
          commentId: data.id,
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-comments', requestId] });
      setContent('');
      toast.success('Comment added successfully');
    },
    onError: (error: any) => {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await addComment.mutateAsync(content);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">Activity & Updates</h3>

        {/* Comments list */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {comments && comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="group cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors">
                <div className="flex gap-2 items-start">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {comment.author_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{comment.author_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <div
                      className="text-sm text-muted-foreground line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(comment.content_html || comment.content) }}
                    />
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {comment.attachments.map((attachment, idx) => {
                          const fileName = attachment.split('/').pop() || attachment;
                          const url = attachmentUrls[attachment];
                          return (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs gap-1"
                              asChild
                              disabled={!url}
                            >
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                <Paperclip className="h-3 w-3" />
                                {fileName}
                              </a>
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              No activity yet
            </p>
          )}
        </div>

        {/* Add comment form */}
        <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Add a comment or update..."
            className="min-h-[120px]"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || content === '<p><br></p>' || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Add Update
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
