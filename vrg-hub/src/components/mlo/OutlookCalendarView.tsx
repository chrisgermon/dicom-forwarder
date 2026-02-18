import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, ExternalLink, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMloOutlookEvents, type MloOutlookEvent } from "@/hooks/useMloOutlookEvents";
import { useHasOffice365Connection } from "@/hooks/useMloCalendarSync";
import { cn } from "@/lib/utils";

export function OutlookCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<MloOutlookEvent[]>([]);
  
  const { data: events, isLoading } = useMloOutlookEvents();
  const { data: isConnected } = useHasOffice365Connection();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const eventsByDate = useMemo(() => {
    if (!events) return new Map<string, MloOutlookEvent[]>();
    
    const map = new Map<string, MloOutlookEvent[]>();
    events.forEach((event) => {
      const dateKey = format(parseISO(event.start_datetime), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      existing.push(event);
      map.set(dateKey, existing);
    });
    return map;
  }, [events]);

  const getEventsForDate = (date: Date): MloOutlookEvent[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate.get(dateKey) || [];
  };

  const handleDateClick = (date: Date, dayEvents: MloOutlookEvent[]) => {
    if (dayEvents.length > 0) {
      setSelectedDate(date);
      setSelectedEvents(dayEvents);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Outlook Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Connect your Outlook calendar to view events</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Outlook Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Loading calendar...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Weekday headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-center font-medium text-sm text-muted-foreground p-2"
                >
                  {day}
                </div>
              ))}

              {/* Empty cells for days before month starts */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] border rounded-lg bg-muted/20" />
              ))}

              {/* Calendar days */}
              {daysInMonth.map((date) => {
                const dayEvents = getEventsForDate(date);
                const hasEvents = dayEvents.length > 0;
                const isToday = isSameDay(date, new Date());

                return (
                  <div
                    key={date.toString()}
                    className={cn(
                      "min-h-[100px] border rounded-lg p-2 transition-colors",
                      !isSameMonth(date, currentDate) ? 'bg-muted/20' : 'bg-background',
                      hasEvents && 'cursor-pointer hover:border-primary',
                      isToday && 'border-primary border-2'
                    )}
                    onClick={() => hasEvents && handleDateClick(date, dayEvents)}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      isToday && "text-primary"
                    )}>
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => {
                        const startTime = parseISO(event.start_datetime);
                        const isAllDay = format(startTime, 'HH:mm') === '00:00';
                        
                        return (
                          <Tooltip key={event.id}>
                            <TooltipTrigger asChild>
                              <div
                                className="text-xs p-1 rounded truncate bg-primary/10 text-primary flex items-center gap-1"
                              >
                                {!isAllDay && (
                                  <span className="font-medium">
                                    {format(startTime, 'h:mma')}
                                  </span>
                                )}
                                <span className="truncate">{event.subject || 'No subject'}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{event.subject || 'No subject'}</p>
                              {!isAllDay && (
                                <p className="text-xs text-muted-foreground">
                                  {format(startTime, 'h:mm a')}
                                </p>
                              )}
                              {event.location && (
                                <p className="text-xs text-muted-foreground">
                                  📍 {event.location}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {selectedEvents.map((event) => {
              const startTime = parseISO(event.start_datetime);
              const endTime = parseISO(event.end_datetime);
              const isAllDay = format(startTime, 'HH:mm') === '00:00';

              return (
                <div
                  key={event.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{event.subject || 'No subject'}</h4>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {isAllDay ? (
                          <Badge variant="secondary" className="text-xs">All day</Badge>
                        ) : (
                          <span>
                            {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                          </span>
                        )}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      {event.body_preview && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {event.body_preview}
                        </p>
                      )}
                    </div>
                    {event.web_link && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="shrink-0"
                      >
                        <a
                          href={event.web_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open in Outlook
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
