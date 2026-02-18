import { Check, Clock, X, Mail } from "lucide-react";
import { StatusBadge, OrderStatus } from "./StatusBadge";

interface TimelineEvent {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  notes?: string;
}

interface OrderTimelineProps {
  status: OrderStatus;
  events: TimelineEvent[];
}

export function OrderTimeline({ status, events }: OrderTimelineProps) {
  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "approved":
        return <Check className="w-4 h-4" />;
      case "declined":
        return <X className="w-4 h-4" />;
      case "ordered":
        return <Mail className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-card rounded-lg p-6 shadow-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          {getStatusIcon(status)}
        </div>
        <div>
          <h3 className="font-semibold">Order Status</h3>
          <StatusBadge status={status} />
        </div>
      </div>
      
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              {index < events.length - 1 && (
                <div className="w-0.5 h-8 bg-border mt-2"></div>
              )}
            </div>
            <div className="flex-1 pb-4">
              <p className="text-sm font-medium">{event.action}</p>
              <p className="text-xs text-muted-foreground">
                by {event.actor} • {event.timestamp}
              </p>
              {event.notes && (
                <p className="text-xs text-muted-foreground mt-1">{event.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}