import { useMailMessages } from "@/hooks/useOutlookMail";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { Search, Loader2, Mail, Paperclip, AlertCircle } from "lucide-react";

interface EmailListProps {
  folderId: string;
  selectedMessageId: string | null;
  onSelectMessage: (messageId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function formatEmailDate(dateString: string): string {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return format(date, "h:mm a");
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  if (isThisWeek(date)) {
    return format(date, "EEE");
  }
  return format(date, "MMM d");
}

export function EmailList({ 
  folderId, 
  selectedMessageId, 
  onSelectMessage,
  searchQuery,
  onSearchChange 
}: EmailListProps) {
  const { data: messages, isLoading, error } = useMailMessages(folderId, searchQuery || undefined);

  return (
    <Card className="h-full flex flex-col">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load emails</p>
          </div>
        ) : messages && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Mail className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No emails found</p>
          </div>
        ) : (
          <div className="divide-y">
            {messages?.map((message) => (
              <button
                key={message.id}
                onClick={() => onSelectMessage(message.id)}
                className={cn(
                  "w-full text-left p-3 transition-colors hover:bg-muted/50",
                  selectedMessageId === message.id && "bg-primary/5",
                  !message.isRead && "bg-primary/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Sender & Date */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={cn(
                        "text-sm truncate",
                        !message.isRead && "font-semibold"
                      )}>
                        {message.from?.emailAddress?.name || message.from?.emailAddress?.address || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatEmailDate(message.receivedDateTime)}
                      </span>
                    </div>

                    {/* Subject */}
                    <div className={cn(
                      "text-sm truncate mb-1",
                      !message.isRead ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {message.subject || "(No subject)"}
                    </div>

                    {/* Preview */}
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {message.bodyPreview}
                    </div>

                    {/* Indicators */}
                    <div className="flex items-center gap-2 mt-1.5">
                      {message.hasAttachments && (
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                      )}
                      {message.importance === "high" && (
                        <span className="text-xs text-destructive font-medium">!</span>
                      )}
                      {!message.isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
