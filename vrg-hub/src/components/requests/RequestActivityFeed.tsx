import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Paperclip, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { sanitizeHtml } from '@/lib/sanitizer';

interface RequestActivityFeedProps {
  requestId: string;
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

export function RequestActivityFeed({ requestId }: RequestActivityFeedProps) {
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [newCommentIds, setNewCommentIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Set up real-time subscription for new comments
  useEffect(() => {
    const channel = supabase
      .channel('request-comments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_comments',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          console.log('New comment received:', payload);
          
          // Mark as new
          const commentId = payload.new.id;
          setNewCommentIds(prev => new Set(prev).add(commentId));
          
          // Show toast notification
          toast.info('New update received', {
            description: `New comment from ${payload.new.author_name}`,
            icon: <Mail className="h-4 w-4" />,
          });
          
          // Refetch comments
          queryClient.invalidateQueries({ queryKey: ['request-comments', requestId] });
          
          // Remove "new" indicator after 10 seconds
          setTimeout(() => {
            setNewCommentIds(prev => {
              const updated = new Set(prev);
              updated.delete(commentId);
              return updated;
            });
          }, 10000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, queryClient]);

  // Fetch comments
  const { data: comments, isLoading } = useQuery({
    queryKey: ['request-comments', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('request_comments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

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
    <>
      <Card className="p-4">
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Activity & Updates</h3>

          {/* Comments list - preview only */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {comments && comments.length > 0 ? (
              comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className="group cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                  onClick={() => setSelectedComment(comment)}
                >
                  <div className="flex gap-2 items-start">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {comment.author_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{comment.author_name}</span>
                          {newCommentIds.has(comment.id) && (
                            <Badge variant="default" className="h-5 text-xs">
                              <Mail className="h-3 w-3 mr-1" />
                              New
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
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
                            return (
                              <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Paperclip className="h-3 w-3" />
                                <span>{fileName}</span>
                              </div>
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
        </div>
      </Card>

      {/* Full Activity Dialog */}
      <Dialog open={!!selectedComment} onOpenChange={() => setSelectedComment(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
          </DialogHeader>
          
          {selectedComment && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {selectedComment.author_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{selectedComment.author_name}</span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(selectedComment.created_at), 'PPpp')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedComment.author_email}</p>
                </div>
              </div>

              <Separator />

              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedComment.content_html || selectedComment.content) }}
              />

              {selectedComment.attachments && selectedComment.attachments.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Attachments</h4>
                    <div className="grid gap-2">
                      {selectedComment.attachments.map((attachment, idx) => {
                        const fileName = attachment.split('/').pop() || attachment;
                        const url = attachmentUrls[attachment];
                        return (
                          <Button
                            key={idx}
                            variant="outline"
                            className="justify-start gap-2"
                            asChild
                            disabled={!url}
                          >
                            <a href={url} target="_blank" rel="noopener noreferrer" download>
                              <Paperclip className="h-4 w-4" />
                              {fileName}
                            </a>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
