import { useState } from 'react';
import { History, User, MessageSquare, Settings, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTickets, useTicketEvents } from '@/hooks/useTicketingSystem';
import { formatDistanceToNow } from 'date-fns';

const EVENT_ICONS = {
  created: AlertCircle,
  assigned: User,
  reassigned: User,
  commented: MessageSquare,
  status_changed: Settings,
  priority_changed: Settings,
  escalated: AlertCircle,
  closed: Settings,
};

const EVENT_COLORS = {
  created: 'bg-blue-100 text-blue-800',
  assigned: 'bg-green-100 text-green-800',
  reassigned: 'bg-yellow-100 text-yellow-800',
  commented: 'bg-purple-100 text-purple-800',
  status_changed: 'bg-orange-100 text-orange-800',
  priority_changed: 'bg-red-100 text-red-800',
  escalated: 'bg-red-200 text-red-900',
  closed: 'bg-gray-100 text-gray-800',
};

export function TicketAuditLog() {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const { data: tickets } = useTickets();
  const { data: events, isLoading } = useTicketEvents(selectedTicket || '');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Audit Log</h3>
        <p className="text-sm text-muted-foreground">View chronological history of ticket events</p>
      </div>

      <div className="flex gap-4">
        <Select value={selectedTicket || 'none'} onValueChange={(v) => setSelectedTicket(v === 'none' ? null : v)}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a ticket" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select a ticket</SelectItem>
            {tickets?.map((ticket) => (
              <SelectItem key={ticket.id} value={ticket.id}>
                VRG-{String(ticket.request_number).padStart(5, '0')} - {ticket.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTicket ? (
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Loading events...
              </CardContent>
            </Card>
          ) : events && events.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              {events.map((event) => {
                const Icon = EVENT_ICONS[event.type as keyof typeof EVENT_ICONS] || Settings;
                const colorClass = EVENT_COLORS[event.type as keyof typeof EVENT_COLORS] || 'bg-gray-100 text-gray-800';

                return (
                  <div key={event.id} className="relative pl-12 pb-8 last:pb-0">
                    {/* Timeline dot */}
                    <div className={`absolute left-2 top-0 h-4 w-4 rounded-full border-2 border-background ${colorClass}`} />

                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <Badge variant="outline" className={colorClass}>
                                {event.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                            </span>
                          </div>

                          {event.actor_user_id && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">By user: </span>
                              <span className="font-medium font-mono text-xs">{event.actor_user_id.slice(0, 8)}...</span>
                            </div>
                          )}

                          {event.data && (
                            <div className="text-sm space-y-1">
                              {Object.entries(event.data as Record<string, any>).map(([key, value]) => (
                                <div key={key}>
                                  <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}: </span>
                                  <span className="font-medium">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <History className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No events yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Events will appear here as the ticket progresses
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Select a ticket to view its audit log
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
