import { format, parseISO } from "date-fns";
import { Calendar, Clock, ExternalLink, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUpcomingOutlookEvents } from "@/hooks/useMloOutlookEvents";
import { useHasOffice365Connection } from "@/hooks/useMloCalendarSync";

export function OutlookEventsCard() {
  const { data: events, isLoading } = useUpcomingOutlookEvents(5);
  const { data: isConnected } = useHasOffice365Connection();

  if (!isConnected) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Outlook Events
        </CardTitle>
        <CardDescription>Synced from your Outlook calendar</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Loading events...
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => {
              const startDate = parseISO(event.start_datetime);
              const endDate = parseISO(event.end_datetime);
              const isMultiDay = format(startDate, 'yyyy-MM-dd') !== format(endDate, 'yyyy-MM-dd');
              const isAllDay = format(startDate, 'HH:mm') === '00:00' && format(endDate, 'HH:mm') === '00:00';

              return (
                <div
                  key={event.id}
                  className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {event.subject || 'No subject'}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {isAllDay ? (
                        <span>
                          {format(startDate, 'PPP')}
                          {isMultiDay && ` - ${format(endDate, 'PPP')}`}
                          <Badge variant="secondary" className="ml-2 text-xs">All day</Badge>
                        </span>
                      ) : (
                        <span>
                          {format(startDate, 'PPP')} at {format(startDate, 'p')} - {format(endDate, 'p')}
                        </span>
                      )}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                  {event.web_link && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="shrink-0 ml-2"
                    >
                      <a
                        href={event.web_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in Outlook"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No upcoming events</p>
            <p className="text-xs mt-1">Click the sync button to import events from Outlook</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
