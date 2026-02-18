import { useEffect } from "react";
import { useMailMessage, useMarkAsRead } from "@/hooks/useOutlookMail";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { 
  Mail, 
  Loader2, 
  ExternalLink, 
  Paperclip,
  User,
  Calendar
} from "lucide-react";
import DOMPurify from "dompurify";

interface EmailReaderProps {
  messageId: string | null;
}

export function EmailReader({ messageId }: EmailReaderProps) {
  const { data: message, isLoading, error } = useMailMessage(messageId);
  const markAsRead = useMarkAsRead();

  useEffect(() => {
    if (message && !message.isRead) {
      markAsRead.mutate(message.id);
    }
  }, [message?.id, message?.isRead]);

  if (!messageId) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Select an email to read</p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (error || !message) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Failed to load email</p>
        </div>
      </Card>
    );
  }

  const sanitizedBody = message.body?.content 
    ? DOMPurify.sanitize(message.body.content, {
        ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'img', 'hr', 'blockquote', 'pre', 'code'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'class', 'target', 'width', 'height'],
      })
    : message.bodyPreview;

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        {/* Subject & Actions */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold flex-1">
            {message.subject || "(No subject)"}
          </h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" asChild>
              <a href={message.webLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                Open in Outlook
              </a>
            </Button>
          </div>
        </div>

        {/* From */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {message.from?.emailAddress?.name || message.from?.emailAddress?.address}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {message.from?.emailAddress?.address}
            </p>
          </div>
        </div>

        {/* Recipients */}
        {message.toRecipients && message.toRecipients.length > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">To: </span>
            <span>
              {message.toRecipients.map(r => r.emailAddress.name || r.emailAddress.address).join(", ")}
            </span>
          </div>
        )}

        {message.ccRecipients && message.ccRecipients.length > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Cc: </span>
            <span>
              {message.ccRecipients.map(r => r.emailAddress.name || r.emailAddress.address).join(", ")}
            </span>
          </div>
        )}

        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {format(new Date(message.receivedDateTime), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </span>
        </div>

        {/* Attachments */}
        {message.hasAttachments && message.attachments && message.attachments.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            {message.attachments.map((att: any, idx: number) => (
              <span key={idx} className="text-sm bg-muted px-2 py-0.5 rounded">
                {att.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {message.body?.contentType === "html" ? (
            <div 
              className="prose prose-sm dark:prose-invert max-w-none email-content"
              dangerouslySetInnerHTML={{ __html: sanitizedBody }}
            />
          ) : (
            <div className="whitespace-pre-wrap text-sm">
              {sanitizedBody}
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
