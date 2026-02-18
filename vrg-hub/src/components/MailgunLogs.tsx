import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Mail, RefreshCw, CheckCircle, XCircle, AlertTriangle, Eye, MousePointer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface MailgunEvent {
  id: string;
  timestamp: number;
  event: string;
  recipient: string;
  subject: string;
  messageId: string;
  from: string;
  deliveryStatus: {
    code?: number;
    message?: string;
    description?: string;
    attemptNo?: number;
  } | null;
  severity: string | null;
  reason: string | null;
  tags: string[];
  userVariables: Record<string, any>;
  geolocation: {
    city?: string;
    region?: string;
    country?: string;
  } | null;
  ip: string | null;
  clientInfo: {
    clientName?: string;
    clientOs?: string;
    deviceType?: string;
    userAgent?: string;
  } | null;
  campaigns: string[];
  flags: Record<string, boolean>;
}

export function MailgunLogs() {
  const { userRole } = useAuth();
  const [events, setEvents] = useState<MailgunEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<MailgunEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<MailgunEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (userRole === 'super_admin') {
      fetchMailgunLogs();
    }
  }, [userRole]);

  useEffect(() => {
    applyFilters();
  }, [events, searchQuery, eventFilter]);

  const fetchMailgunLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-mailgun-logs', {
        body: {},
      });

      if (error) {
        console.error('Error fetching Mailgun logs:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch logs');
      }

      setEvents(data.events || []);
    } catch (error: any) {
      console.error('Error fetching Mailgun logs:', error);
      toast.error(error.message || 'Failed to load Mailgun logs');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.recipient?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.from?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (eventFilter !== 'all') {
      filtered = filtered.filter(event => event.event === eventFilter);
    }

    setFilteredEvents(filtered);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'failed':
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'opened':
        return <Eye className="w-4 h-4 text-blue-600" />;
      case 'clicked':
        return <MousePointer className="w-4 h-4 text-purple-600" />;
      case 'complained':
      case 'unsubscribed':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Mail className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getEventBadge = (eventType: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      delivered: { className: 'bg-emerald-500', label: 'Delivered' },
      accepted: { className: 'bg-blue-500', label: 'Accepted' },
      failed: { className: 'bg-red-500', label: 'Failed' },
      rejected: { className: 'bg-red-600', label: 'Rejected' },
      opened: { className: 'bg-blue-400', label: 'Opened' },
      clicked: { className: 'bg-purple-500', label: 'Clicked' },
      unsubscribed: { className: 'bg-amber-500', label: 'Unsubscribed' },
      complained: { className: 'bg-orange-500', label: 'Complained' },
      stored: { className: 'bg-gray-500', label: 'Stored' },
    };

    const variant = variants[eventType] || { className: 'bg-gray-400', label: eventType };
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const formatTimestamp = (timestamp: number) => {
    return format(new Date(timestamp * 1000), 'dd/MM/yyyy HH:mm:ss');
  };

  const uniqueEventTypes = [...new Set(events.map(e => e.event))].sort();

  if (userRole !== 'super_admin') {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Access Denied: Super Admin privileges required</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Mailgun Event Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading Mailgun logs...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Mailgun Event Logs
              </CardTitle>
              <CardDescription>
                Real-time email delivery events from Mailgun (last 100 events)
              </CardDescription>
            </div>
            <Button onClick={fetchMailgunLogs} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/20 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-semibold text-emerald-600">
                  {events.filter(e => e.event === 'delivered').length}
                </div>
                <div className="text-xs text-muted-foreground">Delivered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-blue-600">
                  {events.filter(e => e.event === 'accepted').length}
                </div>
                <div className="text-xs text-muted-foreground">Accepted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-blue-400">
                  {events.filter(e => e.event === 'opened').length}
                </div>
                <div className="text-xs text-muted-foreground">Opened</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-purple-600">
                  {events.filter(e => e.event === 'clicked').length}
                </div>
                <div className="text-xs text-muted-foreground">Clicked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-red-600">
                  {events.filter(e => e.event === 'failed' || e.event === 'rejected').length}
                </div>
                <div className="text-xs text-muted-foreground">Failed/Rejected</div>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by recipient, subject, or sender..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {uniqueEventTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Results count */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredEvents.length} of {events.length} events
            </div>

            {/* Events table */}
            <div className="border rounded-lg">
              <ScrollArea className="h-[600px]">
                <Table resizable storageKey="mailgun-logs">
                  <TableHeader>
                    <TableRow>
                      <TableHead columnId="timestamp">Timestamp</TableHead>
                      <TableHead columnId="event">Event</TableHead>
                      <TableHead columnId="recipient">Recipient</TableHead>
                      <TableHead columnId="subject">Subject</TableHead>
                      <TableHead columnId="actions">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No Mailgun events found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatTimestamp(event.timestamp)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {getEventIcon(event.event)}
                              {getEventBadge(event.event)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {event.recipient}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {event.subject || '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedEvent(event);
                                setDialogOpen(true);
                              }}
                              className="h-8 px-2"
                            >
                              <Eye className="w-4 h-4 mr-1.5" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getEventIcon(selectedEvent.event)}
                  <span>Event Details</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Event Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Event Type</p>
                      {getEventBadge(selectedEvent.event)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Timestamp</p>
                      <p className="text-sm">{formatTimestamp(selectedEvent.timestamp)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Recipient</p>
                      <p className="text-sm font-mono">{selectedEvent.recipient}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">From</p>
                      <p className="text-sm font-mono">{selectedEvent.from || '-'}</p>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Subject</p>
                      <p className="text-sm">{selectedEvent.subject || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Delivery Status */}
                {selectedEvent.deliveryStatus && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Delivery Status</h3>
                    <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                      {selectedEvent.deliveryStatus.code && (
                        <p className="text-sm">
                          <span className="font-medium">Code:</span> {selectedEvent.deliveryStatus.code}
                        </p>
                      )}
                      {selectedEvent.deliveryStatus.message && (
                        <p className="text-sm">
                          <span className="font-medium">Message:</span> {selectedEvent.deliveryStatus.message}
                        </p>
                      )}
                      {selectedEvent.deliveryStatus.description && (
                        <p className="text-sm">
                          <span className="font-medium">Description:</span> {selectedEvent.deliveryStatus.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Reason (for failures) */}
                {selectedEvent.reason && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Reason</h3>
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4">
                      <p className="text-sm text-red-700 dark:text-red-400">{selectedEvent.reason}</p>
                    </div>
                  </div>
                )}

                {/* Client Info (for opens/clicks) */}
                {selectedEvent.clientInfo && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Client Information</h3>
                    <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                      {selectedEvent.clientInfo.clientName && (
                        <p className="text-sm">
                          <span className="font-medium">Client:</span> {selectedEvent.clientInfo.clientName}
                        </p>
                      )}
                      {selectedEvent.clientInfo.clientOs && (
                        <p className="text-sm">
                          <span className="font-medium">OS:</span> {selectedEvent.clientInfo.clientOs}
                        </p>
                      )}
                      {selectedEvent.clientInfo.deviceType && (
                        <p className="text-sm">
                          <span className="font-medium">Device:</span> {selectedEvent.clientInfo.deviceType}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Geolocation (for opens/clicks) */}
                {selectedEvent.geolocation && (selectedEvent.geolocation.city || selectedEvent.geolocation.country) && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Location</h3>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-sm">
                        {[selectedEvent.geolocation.city, selectedEvent.geolocation.region, selectedEvent.geolocation.country]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      {selectedEvent.ip && (
                        <p className="text-xs text-muted-foreground mt-1">IP: {selectedEvent.ip}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.tags.map((tag, i) => (
                        <Badge key={i} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message ID */}
                {selectedEvent.messageId && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Message ID</h3>
                    <code className="text-xs bg-muted p-2 rounded block break-all">
                      {selectedEvent.messageId}
                    </code>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
